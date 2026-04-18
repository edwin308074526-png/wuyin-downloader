App({
  onLaunch() {
    // 检查登录状态
    if (!wx.getStorageSync('hasLogin')) {
      wx.setStorageSync('hasLogin', true);
    }
  },
  globalData: {
    apiBaseUrl: 'https://your-api-domain.com', // 替换为你的后端API地址
    userInfo: null
  }
})
