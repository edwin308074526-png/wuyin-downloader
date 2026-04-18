/**
 * 工具函数库
 */

/**
 * 格式化时长
 * @param {number} ms - 毫秒
 * @returns {string} 格式化后的时长，如 "01:30"
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * 检测平台
 * @param {string} url - 视频链接
 * @returns {string} 平台标识
 */
function detectPlatform(url) {
  if (!url) return '';
  if (url.includes('douyin.com') || url.includes('v.douyin.com')) return 'douyin';
  if (url.includes('kuaishou.com') || url.includes('v.kuaishou.com')) return 'kuaishou';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) return 'xiaohongshu';
  if (url.includes('instagram.com') || url.includes('instagr.am')) return 'instagram';
  return '';
}

/**
 * 判断是否为视频链接
 * @param {string} url - 链接
 * @returns {boolean}
 */
function isVideoUrl(url) {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi'];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext));
}

/**
 * 清理字符串
 * @param {string} str - 输入字符串
 * @returns {string}
 */
function cleanString(str) {
  if (!str) return '';
  return str.trim().replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ');
}

/**
 * 生成唯一ID
 * @returns {string}
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 异步延迟
 * @param {number} ms - 毫秒
 * @returns {Promise}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 安全解析JSON
 * @param {string} str - JSON字符串
 * @returns {object|null}
 */
function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

module.exports = {
  formatDuration,
  detectPlatform,
  isVideoUrl,
  cleanString,
  generateId,
  sleep,
  safeJsonParse
};
