/**
 * 快手视频解析服务
 */

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * 解析快手视频
 */
async function parse(url) {
  try {
    // 处理短链接
    let realUrl = url;
    if (url.includes('v.kuaishou.com')) {
      const response = await axios.get(url, {
        maxRedirects: 5,
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
        }
      });
      realUrl = response.request.res.responseUrl || url;
    }

    // 从URL中提取视频ID
    const videoId = extractVideoId(realUrl);
    if (!videoId) {
      return { success: false, error: '无法提取视频ID' };
    }

    // 方法1：尝试使用快手API
    const apiResult = await tryKuaishouAPI(videoId, realUrl);
    if (apiResult.success) {
      return apiResult;
    }

    // 方法2：使用网页解析
    const webResult = await tryWebParse(realUrl);
    if (webResult.success) {
      return webResult;
    }

    return { success: false, error: '解析失败，请稍后重试' };

  } catch (error) {
    console.error('快手解析错误:', error.message);
    return { success: false, error: '解析超时，请重试' };
  }
}

/**
 * 从URL中提取视频ID
 */
function extractVideoId(url) {
  const patterns = [
    /\/video\/(\d+)/,
    /photo\/(\d+)/,
    /show\/(\w+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * 尝试使用快手API
 */
async function tryKuaishouAPI(videoId, url) {
  try {
    // 快手API端点
    const apiUrl = `https://www.kuaishou.com/graphql`;
    
    const response = await axios.post(apiUrl, {
      operationName: 'VisionVideoDetail',
      variables: {
        photoId: videoId,
        secAuthorId: null
      },
      query: `
        query VisionVideoDetail($photoId: String, $secAuthorId: String) {
          visionVideoDetail(photoId: $photoId, secAuthorId: $secAuthorId) {
            photo {
              id
              caption
              coverUrl
              srcUrl
              duration
              author {
                name
                avatar
              }
            }
          }
        }
      `
    }, {
      timeout: 8000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.kuaishou.com/'
      }
    });

    if (response.data?.data?.visionVideoDetail?.photo) {
      const photo = response.data.data.visionVideoDetail.photo;
      
      return {
        success: true,
        data: {
          platform: 'kuaishou',
          videoId: videoId,
          title: photo.caption || '快手视频',
          cover: photo.coverUrl,
          videoUrl: photo.srcUrl,
          duration: formatDuration(photo.duration * 1000),
          author: {
            nickname: photo.author?.name || '',
            avatar: photo.author?.avatar || ''
          }
        }
      };
    }
  } catch (error) {
    console.log('快手API方式失败:', error.message);
  }
  return { success: false };
}

/**
 * 尝试网页解析
 */
async function tryWebParse(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      }
    });

    const html = response.data;
    
    // 提取JSON数据
    const dataMatch = html.match(/window\.__INIT_PROPS__\s*=\s*(\{.*?\});/s);
    if (dataMatch) {
      try {
        const data = JSON.parse(dataMatch[1]);
        // 尝试从数据中提取视频信息
        const videoData = findVideoData(data);
        if (videoData) {
          return {
            success: true,
            data: {
              platform: 'kuaishou',
              title: videoData.caption || '快手视频',
              cover: videoData.coverUrl,
              videoUrl: videoData.srcUrl || videoData.playUrl,
            }
          };
        }
      } catch (e) {
        console.log('解析快手数据失败');
      }
    }
  } catch (error) {
    console.log('快手网页解析失败');
  }
  return { success: false };
}

/**
 * 递归查找视频数据
 */
function findVideoData(obj) {
  if (!obj || typeof obj !== 'object') return null;
  
  if (obj.srcUrl || obj.playUrl || obj.videoUrl) {
    return obj;
  }
  
  for (const key in obj) {
    const result = findVideoData(obj[key]);
    if (result) return result;
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
