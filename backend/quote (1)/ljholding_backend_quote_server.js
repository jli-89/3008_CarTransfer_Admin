const express = require('express');
const cors = require('cors');
const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 设置 base path（根据 cPanel 的 Application URL）
const basePath = '/ljholding_backend_quote';

// 健康检查
app.get(`${basePath}/health`, (req, res) => {
  res.json({ status: 'ok' });
});

// 根路径说明
app.get(basePath, (req, res) => {
  res.send('write by lee in ljholding_backend_quote_server; server is running. Try /ljholding_backend_quote/health or /ljholding_backend_quote/api/quote');
});

// 挂载 API 路由
const api = require('./controllerAPI/quote-controller');
app.use(`${basePath}/api`, api);

// 启动服务器
const PORT = process.env.PORT || 3050;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
