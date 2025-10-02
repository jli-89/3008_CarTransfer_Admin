// server.js
var express = require('express');
var app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

// 挂载 API
var api = require("./controllerAPI/api-controller");
app.use("/api", api);

//
app.get('/', (req, res) => {
  res.send('write by lee in server.js;server is running on localhost:15597, please visit /health or /api/track');
});

// 健康检查（可选）
app.get("/health", (req, res)=> res.json({status:"ok"}));

app.listen(15597, () => {
  console.log("Server up and running on localhost:15597");
});
