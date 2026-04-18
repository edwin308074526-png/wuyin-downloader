Page({
  data: {
    videoData: null,
    isDownloading: false,
    downloadProgress: 0
  },

  onLoad(options) {
    if (options.data) {
      try {
        const data = JSON.parse(decodeURIComponent(options.data));
        this.setData({ videoData: data });
      } catch (e) {
        console.error('解析数据失败', e);
        wx.showToast({ title: '数据解析失败', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    }
  },

  // 保存视频到相册
  async saveVideo() {
    const { videoData } = this.data;
    
    if (!videoData || !videoData.videoUrl) {
      wx.showToast({ title: '视频地址无效', icon: 'none' });
      return;
    }

    this.setData({ isDownloading: true, downloadProgress: 0 });

    try {
      // 先检查权限
      const setting = await wx.getSetting();
      if (!setting.authSetting['scope.writePhotosAlbum']) {
        const authResult = await wx.authorize({
          scope: 'scope.writePhotosAlbum'
        });
      }

      wx.showLoading({ title: '正在下载...' });

      // 下载视频文件
      const downloadTask = wx.downloadFile({
        url: videoData.videoUrl,
        success: (res) => {
          wx.hideLoading();
          
          if (res.statusCode === 200) {
            // 保存到相册
            wx.saveVideoToPhotosAlbum({
              filePath: res.tempFilePath,
              success: () => {
                wx.showToast({ title: '保存成功！', icon: 'success' });
                this.setData({ isDownloading: false, downloadProgress: 100 });
              },
              fail: (err) => {
                console.error('保存失败', err);
                wx.showToast({ title: '保存失败，请重试', icon: 'none' });
                this.setData({ isDownloading: false });
              }
            });
          } else {
            wx.showToast({ title: '下载失败', icon: 'none' });
            this.setData({ isDownloading: false });
          }
        },
        fail: (err) => {
          wx.hideLoading();
          console.error('下载文件失败', err);
          wx.showToast({ title: '网络错误，请重试', icon: 'none' });
          this.setData({ isDownloading: false });
        }
      });

      // 监听下载进度
      downloadTask.onProgressUpdate((res) => {
        this.setData({ downloadProgress: res.progress });
      });

    } catch (e) {
      wx.hideLoading();
      console.error('下载过程出错', e);
      
      if (e.errMsg && e.errMsg.includes('auth deny')) {
        wx.showModal({
          title: '需要授权',
          content: '请允许访问相册权限后重试',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting();
            }
          }
        });
      } else {
        wx.showToast({ title: '下载失败', icon: 'none' });
      }
      
      this.setData({ isDownloading: false });
    }
  },

  // 保存封面图
  async saveCover() {
    const { videoData } = this.data;
    
    if (!videoData || !videoData.cover) {
      wx.showToast({ title: '封面地址无效', icon: 'none' });
      return;
    }

    try {
      const setting = await wx.getSetting();
      if (!setting.authSetting['scope.writePhotosAlbum']) {
        await wx.authorize({ scope: 'scope.writePhotosAlbum' });
      }

      wx.showLoading({ title: '正在保存封面...' });

      wx.downloadFile({
        url: videoData.cover,
        success: (res) => {
          wx.hideLoading();
          if (res.statusCode === 200) {
            wx.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              success: () => {
                wx.showToast({ title: '封面保存成功！', icon: 'success' });
              },
              fail: () => {
                wx.showToast({ title: '封面保存失败', icon: 'none' });
              }
            });
          }
        },
        fail: () => {
          wx.hideLoading();
          wx.showToast({ title: '下载封面失败', icon: 'none' });
        }
      });
    } catch (e) {
      wx.hideLoading();
      if (e.errMsg && e.errMsg.includes('auth deny')) {
        wx.showModal({
          title: '需要授权',
          content: '请允许访问相册权限',
          success: (res) => {
            if (res.confirm) wx.openSetting();
          }
        });
      }
    }
  },

  // 复制链接
  copyLink() {
    const { videoData } = this.data;
    if (videoData && videoData.videoUrl) {
      wx.setClipboardData({
        data: videoData.videoUrl,
        success: () => {
          wx.showToast({ title: '链接已复制', icon: 'success' });
        }
      });
    }
  },

  // 分享
  onShareAppMessage() {
    const { videoData } = this.data;
    return {
      title: videoData.title || '发现一个好视频',
      path: '/pages/index/index',
      imageUrl: videoData.cover
    };
  }
})
