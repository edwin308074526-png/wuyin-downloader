Page({
  data: {
    videoUrl: '',
    platforms: [
      { id: 'douyin', name: '抖音', icon: '/utils/douyin.png', color: '#000000' },
      { id: 'kuaishou', name: '快手', icon: '/utils/kuaishou.png', color: '#ff6b00' },
      { id: 'xiaohongshu', name: '小红书', icon: '/utils/xiaohongshu.png', color: '#fe2c55' },
      { id: 'instagram', name: 'Instagram', icon: '/utils/instagram.png', color: '#e4405f' }
    ],
    selectedPlatform: '',
    isLoading: false,
    error: '',
    historyList: []
  },

  onLoad() {
    this.loadHistory();
  },

  // 加载历史记录
  loadHistory() {
    const history = wx.getStorageSync('downloadHistory') || [];
    this.setData({ historyList: history.slice(0, 10) });
  },

  // 输入链接
  onUrlInput(e) {
    this.setData({ videoUrl: e.detail.value, error: '' });
  },

  // 粘贴链接
  pasteFromClipboard() {
    wx.getClipboardData({
      success: (res) => {
        if (res.data) {
          this.setData({ videoUrl: res.data, error: '' });
          wx.showToast({ title: '已粘贴', icon: 'success' });
        }
      }
    });
  },

  // 自动识别平台
  detectPlatform(url) {
    if (!url) return '';
    if (url.includes('douyin.com') || url.includes('v.douyin.com')) return 'douyin';
    if (url.includes('kuaishou.com') || url.includes('v.kuaishou.com')) return 'kuaishou';
    if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) return 'xiaohongshu';
    if (url.includes('instagram.com') || url.includes('instagr.am')) return 'instagram';
    return '';
  },

  // 解析视频
  async parseVideo() {
    const url = this.data.videoUrl.trim();
    
    if (!url) {
      this.setData({ error: '请输入视频链接' });
      return;
    }

    // 自动识别平台
    const platform = this.detectPlatform(url);
    if (!platform) {
      this.setData({ error: '暂不支持该链接，请输入抖音/快手/小红书/Instagram链接' });
      return;
    }

    this.setData({ isLoading: true, error: '' });

    try {
      const app = getApp();
      const response = await wx.request({
        url: `${app.globalData.apiBaseUrl}/api/parse`,
        method: 'POST',
        data: { url, platform },
        header: { 'Content-Type': 'application/json' }
      });

      if (response.data.code === 200) {
        const videoData = response.data.data;
        // 保存到历史记录
        this.saveToHistory(videoData, url, platform);
        // 跳转到结果页
        wx.navigateTo({
          url: `/pages/result/result?data=${encodeURIComponent(JSON.stringify(videoData))}`
        });
      } else {
        this.setData({ error: response.data.msg || '解析失败，请重试' });
      }
    } catch (e) {
      console.error('解析失败:', e);
      this.setData({ error: '网络错误，请检查后端服务是否正常运行' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 保存到历史记录
  saveToHistory(videoData, url, platform) {
    let history = wx.getStorageSync('downloadHistory') || [];
    const item = {
      id: Date.now(),
      url,
      platform,
      cover: videoData.cover,
      title: videoData.title || '',
      createTime: new Date().toISOString()
    };
    history.unshift(item);
    if (history.length > 50) history = history.slice(0, 50);
    wx.setStorageSync('downloadHistory', history);
  },

  // 清空历史
  clearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有历史记录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('downloadHistory');
          this.setData({ historyList: [] });
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  },

  // 从历史打开
  openFromHistory(e) {
    const { url, platform } = e.currentTarget.dataset;
    this.setData({ videoUrl: url });
    // 自动设置平台并解析
    this.setData({ selectedPlatform: platform }, () => {
      this.parseVideo();
    });
  }
})
