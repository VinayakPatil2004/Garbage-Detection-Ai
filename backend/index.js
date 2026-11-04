const express = require('express');
const http = require('http');
const app = express();
const port = process.env.PORT || 3000;
const PYTHON_BACKEND_PORT = 5000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Proxy /api/* requests to Python AI Flask Backend (port 5000)
app.use('/api', (req, res) => {
  const options = {
    hostname: '127.0.0.1',
    port: PYTHON_BACKEND_PORT,
    path: `/api${req.url}`,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${PYTHON_BACKEND_PORT}` }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    res.status(503).json({
      status: 'error',
      message: 'Python AI backend (Flask) is not currently running on port 5000. Please start python backend/app.py',
      details: err.message
    });
  });

  if (req.body && Object.keys(req.body).length > 0) {
    proxyReq.write(JSON.stringify(req.body));
  }
  proxyReq.end();
});

app.listen(port, () => {
  console.log(`🌐 Express Gateway listening at http://localhost:${port}`);
  console.log(`➡️  Proxies /api requests directly to Python AI Backend on port ${PYTHON_BACKEND_PORT}`);
});
