/**
 * Instagram视频解析服务
 */

const axios = require('axios');

/**
 * 解析Instagram视频
 */
async function parse(url) {
  try {
    // 处理短链接
    let realUrl = url;
    if (url.includes('instagr.am')) {
      const response = await axios.get(url, {
        maxRedirects: 5,
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
        }
      });
      realUrl = response.request.res.responseUrl || url;
    }

    // 从URL中提取媒体ID或短代码
    const mediaId = extractMediaId(realUrl);
    if (!mediaId) {
      return { success: false, error: '无法提取媒体ID' };
    }

    // 尝试使用公开API
    const apiResult = await tryInstaAPI(mediaId, realUrl);
    if (apiResult.success) {
      return apiResult;
    }

    // 使用网页解析
    const webResult = await tryWebParse(realUrl);
    if (webResult.success) {
      return webResult;
    }

    return { success: false, error: '解析失败，请稍后重试' };

  } catch (error) {
    console.error('Instagram解析错误:', error.message);
    return { success: false, error: '解析超时，请重试' };
  }
}

/**
 * 从URL中提取媒体ID或短代码
 */
function extractMediaId(url) {
  // 匹配格式：/p/xxxxx 或 /reel/xxxxx 或 /tv/xxxxx
  const patterns = [
    /\/p\/([A-Za-z0-9_-]+)/,
    /\/reel\/([A-Za-z0-9_-]+)/,
    /\/tv\/([A-Za-z0-9_-]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * 尝试使用Instagram公开API
 */
async function tryInstaAPI(shortcode, url) {
  try {
    // Instagram oembed API
    const oembedUrl = `https://graph.facebook.com/v18.0/instagram_oembed?url=https://www.instagram.com/p/${shortcode}/&maxwidth=480&fields=author_name,thumbnail_url,thumbnail_width,thumbnail_height,html,version&access_token=IGQVJ...`;
    
    // 由于Instagram API需要认证，这里使用备用方法
    // 尝试从Facebook Graph API获取
    
  } catch (error) {
    console.log('Instagram API方式失败');
  }
  return { success: false };
}

/**
 * 使用网页解析
 */
async function tryWebParse(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'csrftoken=dummy' // Instagram可能需要cookie
      }
    });

    const html = response.data;
    
    // 提取JSON数据
    // Instagram页面通常包含 window._sharedData 或 window.__initial 数据
    
    // 方法1：提取 window._sharedData
    const sharedDataMatch = html.match(/window\._sharedData\s*=\s*(\{.*?\});/s);
    if (sharedDataMatch) {
      const result = parseSharedData(sharedDataMatch[1]);
      if (result.success) return result;
    }
    
    // 方法2：提取 LD+JSON 数据
    const ldJsonMatch = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/s);
    if (ldJsonMatch) {
      try {
        const ldData = JSON.parse(ldJsonMatch[1]);
        if (ldData.video) {
          return {
            success: true,
            data: {
              platform: 'instagram',
              shortcode: extractMediaId(url),
              title: ldData.name || 'Instagram视频',
              cover: ldData.thumbnailUrl || ldData.image || '',
              videoUrl: ldData.video.contentUrl || ldData.videoUrl,
              author: {
                nickname: ldData.author?.name || ldData.author?.alternateName || '',
                avatar: ''
              }
            }
          };
        }
      } catch (e) {
        console.log('解析LD+JSON失败');
      }
    }
    
    // 方法3：直接搜索视频URL
    const videoUrlMatch = html.match(/"video_url":"([^"]+)"/);
    const displayUrlMatch = html.match(/"display_url":"([^"]+)"/);
    const thumbnailMatch = html.match(/"thumbnail_url":"([^"]+)"/);
    
    if (videoUrlMatch) {
      return {
        success: true,
        data: {
          platform: 'instagram',
          shortcode: extractMediaId(url),
          title: 'Instagram视频',
          cover: thumbnailMatch ? thumbnailMatch[1] : displayUrlMatch ? displayUrlMatch[1] : '',
          videoUrl: videoUrlMatch[1].replace(/\\u002F/g, '/')
        }
      };
    }

  } catch (error) {
    console.log('Instagram网页解析失败:', error.message);
  }
  return { success: false };
}

/**
 * 解析 sharedData
 */
function parseSharedData(dataStr) {
  try {
    const data = JSON.parse(dataStr);
    
    // 查找entry数据
    const entry = data.entry?.['www-ig-']?.data || data.entry?.['instagram-web']?.data;
    if (entry && entry.media) {
      const media = entry.media;
      
      return {
        success: true,
        data: {
          platform: 'instagram',
          shortcode: media.code || media.shortcode,
          title: media.title || media.caption?.text || 'Instagram视频',
          cover: media.display_src || media.thumbnail_src || '',
          videoUrl: media.video_url || media.videoVersion?.hd_url,
          duration: formatDuration(media.video_duration * 1000 || 0),
          author: {
            nickname: media.user?.username || '',
            avatar: media.user?.profile_pic_url || ''
          }
        }
      };
    }
  } catch (e) {
    console.log('解析sharedData失败');
  }
  return { success: false };
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
