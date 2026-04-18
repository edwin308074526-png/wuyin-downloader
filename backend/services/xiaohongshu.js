/**
 * 小红书视频解析服务
 */

const axios = require('axios');

/**
 * 解析小红书视频
 */
async function parse(url) {
  try {
    // 处理短链接
    let realUrl = url;
    if (url.includes('xhslink.com')) {
      const response = await axios.get(url, {
        maxRedirects: 5,
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
        }
      });
      realUrl = response.request.res.responseUrl || url;
    }

    // 从URL中提取笔记ID
    const noteId = extractNoteId(realUrl);
    if (!noteId) {
      return { success: false, error: '无法提取笔记ID' };
    }

    // 方法1：尝试使用小红书API
    const apiResult = await tryXHSAPI(noteId);
    if (apiResult.success) {
      return apiResult;
    }

    // 方法2：使用分享接口
    const shareResult = await tryShareAPI(noteId);
    if (shareResult.success) {
      return shareResult;
    }

    return { success: false, error: '解析失败，请稍后重试' };

  } catch (error) {
    console.error('小红书解析错误:', error.message);
    return { success: false, error: '解析超时，请重试' };
  }
}

/**
 * 从URL中提取笔记ID
 */
function extractNoteId(url) {
  // 匹配格式：/note/xxxxx 或 /discovery/item/xxxxx
  const patterns = [
    /\/note\/([a-zA-Z0-9]+)/,
    /\/discovery\/item\/([a-zA-Z0-9]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * 尝试使用小红书Web API
 */
async function tryXHSAPI(noteId) {
  try {
    const apiUrl = `https://www.xiaohongshu.com/explore/${noteId}`;
    
    const response = await axios.get(apiUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://www.xiaohongshu.com/'
      }
    });

    const html = response.data;
    
    // 提取初始状态数据
    const initDataMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.*?\});/s);
    if (initDataMatch) {
      try {
        const dataStr = initDataMatch[1].replace(/function\(.*?\)\{.*?\}/g, '""');
        const data = JSON.parse(dataStr);
        
        const noteData = findNoteData(data, noteId);
        if (noteData && noteData.video) {
          return {
            success: true,
            data: {
              platform: 'xiaohongshu',
              noteId: noteId,
              title: noteData.title || noteData.desc || '小红书笔记',
              cover: noteData.cover?.url || noteData.imageList?.[0]?.urlDefault || '',
              videoUrl: noteData.video?.transcodedUrl || noteData.video?.url,
              duration: formatDuration(noteData.video?.duration * 1000 || 0),
              author: {
                nickname: noteData.user?.nickname || '',
                avatar: noteData.user?.avatar || ''
              }
            }
          };
        }
      } catch (e) {
        console.log('解析小红书初始状态失败');
      }
    }
  } catch (error) {
    console.log('小红书API方式失败');
  }
  return { success: false };
}

/**
 * 尝试使用分享API
 */
async function tryShareAPI(noteId) {
  try {
    const apiUrl = `https://www.xiaohongshu.com/discovery/item/${noteId}`;
    
    const response = await axios.get(apiUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html = response.data;
    
    // 尝试从页面提取videoUrl
    const videoMatch = html.match(/"videoUrl":\s*"([^"]+)"/);
    const coverMatch = html.match(/"cover":\s*\{[^}]*"url":\s*"([^"]+)"/);
    const titleMatch = html.match(/"title":\s*"([^"]+)"/);
    
    if (videoMatch) {
      return {
        success: true,
        data: {
          platform: 'xiaohongshu',
          noteId: noteId,
          title: titleMatch ? titleMatch[1] : '小红书笔记',
          cover: coverMatch ? coverMatch[1] : '',
          videoUrl: decodeURIComponent(videoMatch[1])
        }
      };
    }
  } catch (error) {
    console.log('小红书分享API失败');
  }
  return { success: false };
}

/**
 * 递归查找笔记数据
 */
function findNoteData(obj, noteId) {
  if (!obj || typeof obj !== 'object') return null;
  
  if (obj.note && (obj.note.id === noteId || obj.note.noteId === noteId)) {
    return obj.note;
  }
  
  if (obj.id === noteId || obj.noteId === noteId) {
    return obj;
  }
  
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      const result = findNoteData(obj[key], noteId);
      if (result) return result;
    }
  }
  
  return null;
}

/**
 * 格式化时长
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

module.exports = { parse };
