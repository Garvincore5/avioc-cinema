const express = require('express');
const path = require('path');

const app = express();
const port = Number(process.env.PORT) || 8001;
const host = process.env.HOST || '0.0.0.0';
const publicDir = __dirname;

app.use(express.static(publicDir));

app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(port, host, () => {
  console.log(`Avioc Cinema is available at http://localhost:${port}`);
});
