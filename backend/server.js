/**
 * 视频去水印解析API服务
 * 支持平台：抖音、快手、小红书、Instagram
 */

const express = require('express');
const cors = require('cors');
const douyinService = require('./services/douyin');
const kuaishouService = require('./services/kuaishou');
const xiaohongshuService = require('./services/xiaohongshu');
const instagramService = require('./services/instagram');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 视频解析接口
app.post('/api/parse', async (req, res) => {
  try {
    const { url, platform } = req.body;

    if (!url) {
      return res.json({ code: 400, msg: '缺少视频链接' });
    }

    if (!platform) {
      return res.json({ code: 400, msg: '缺少平台参数' });
    }

    let result;

    switch (platform) {
      case 'douyin':
        result = await douyinService.parse(url);
        break;
      case 'kuaishou':
        result = await kuaishouService.parse(url);
        break;
      case 'xiaohongshu':
        result = await xiaohongshuService.parse(url);
        break;
      case 'instagram':
        result = await instagramService.parse(url);
        break;
      default:
        return res.json({ code: 400, msg: '不支持的平台' });
    }

    if (result.success) {
      res.json({
        code: 200,
        msg: '解析成功',
        data: result.data
      });
    } else {
      res.json({
        code: 500,
        msg: result.error || '解析失败'
      });
    }
  } catch (error) {
    console.error('解析接口错误:', error);
    res.json({
      code: 500,
      msg: '服务器内部错误'
    });
  }
});

// 获取支持的平台列表
app.get('/api/platforms', (req, res) => {
  res.json({
    code: 200,
    data: [
      { id: 'douyin', name: '抖音', icon: 'douyin.png' },
      { id: 'kuaishou', name: '快手', icon: 'kuaishou.png' },
      { id: 'xiaohongshu', name: '小红书', icon: 'xiaohongshu.png' },
      { id: 'instagram', name: 'Instagram', icon: 'instagram.png' }
    ]
  });
});

// 静态文件服务
app.use(express.static('public'));

// 404处理
app.use((req, res) => {
  res.json({ code: 404, msg: '接口不存在' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.json({ code: 500, msg: '服务器内部错误' });
});

// 启动服务
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   视频去水印解析API服务已启动               ║
║   端口: ${PORT}                              ║
║   环境: ${process.env.NODE_ENV || 'development'}                    ║
╚════════════════════════════════════════════╝
  `);
});

module.exports = app;
