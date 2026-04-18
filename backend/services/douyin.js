/**
 * 抖音视频解析服务
 */

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * 解析抖音视频
 * @param {string} url - 抖音视频链接
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
async function parse(url) {
  try {
    // 如果是短链接，先重定向获取真实链接
    let realUrl = url;
    if (url.includes('v.douyin.com')) {
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

    // 方法1：尝试使用抖音API
    const apiResult = await tryDouyinAPI(videoId);
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
    console.error('抖音解析错误:', error.message);
    return { success: false, error: '解析超时，请重试' };
  }
}

/**
 * 从URL中提取视频ID
 */
function extractVideoId(url) {
  // 匹配各种格式的抖音URL
  const patterns = [
    /video\/(\d+)/,
    /(\d{19})/,
    /v.douyin.com\/(\w+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * 尝试使用抖音移动端API
 */
async function tryDouyinAPI(videoId) {
  try {
    const apiUrl = `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`;
    
    const response = await axios.get(apiUrl, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        'Referer': 'https://www.douyin.com/'
      }
    });

    if (response.data && response.data.item_list && response.data.item_list.length > 0) {
      const item = response.data.item_list[0];
      const videoInfo = item.video;
      
      // 获取无水印视频链接
      const videoUrl = videoInfo.play_addr.url_list[0]?.replace('playwm', 'play') || 
                       videoInfo.download_addr.url_list[0];
      
      return {
        success: true,
        data: {
          platform: 'douyin',
          videoId: videoId,
          title: item.desc || '抖音视频',
          cover: videoInfo.cover.url_list[0],
          videoUrl: videoUrl,
          duration: formatDuration(videoInfo.duration),
          author: {
            nickname: item.author.nickname,
            avatar: item.author.avatar_thumb.url_list[0]
          }
        }
      };
    }
  } catch (error) {
    console.log('抖音API方式失败');
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
    const $ = cheerio.load(html);

    // 尝试从页面中提取RENDER_DATA
    const scriptContent = $('script[id="RENDER_DATA"]').html();
    if (scriptContent) {
      const decoded = decodeURIComponent(scriptContent);
      const dataMatch = decoded.match(/"playAddr":\s*\{[^}]*"url":\s*"([^"]+)"/);
      const coverMatch = decoded.match(/"cover":\s*\{[^}]*"url":\s*"([^"]+)"/);
      const titleMatch = decoded.match(/"desc":\s*"([^"]+)"/);

      if (dataMatch) {
        let videoUrl = dataMatch[1].replace(/\\u002F/g, '/');
        // 移除水印标识
        videoUrl = videoUrl.replace('playwm', 'play');

        return {
          success: true,
          data: {
            platform: 'douyin',
            title: titleMatch ? titleMatch[1] : '抖音视频',
            cover: coverMatch ? coverMatch[1] : '',
            videoUrl: videoUrl
          }
        };
      }
    }
  } catch (error) {
    console.log('抖音网页解析失败');
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
