const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3333;
const FILE_PATH = path.join(__dirname, 'bai_token_analytics.user.js');

const server = http.createServer((req, res) => {
  if (req.url === '/bai_token_analytics.user.js') {
    const content = fs.readFileSync(FILE_PATH, 'utf-8');
    res.writeHead(200, {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Content-Disposition': 'inline; filename="bai_token_analytics.user.js"'
    });
    res.end(content);
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<html><body><a href="/bai_token_analytics.user.js">安装 BAI Token 统计油猴脚本</a></body></html>`);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Userscript install server listening on http://127.0.0.1:${PORT}/bai_token_analytics.user.js`);
});
