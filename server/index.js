/**
 * RyeCentral Tasting App — Server Entry Point
 */


const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const config = require('./config/env');
const { setupWebSocket } = require('./services/websocketService');


const app = express();
const server = http.createServer(app);


// ── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json());


// ── API Routes ───────────────────────────────────────────
app.use('/api/products', require('./routes/products'));
app.use('/api/events', require('./routes/events'));
app.use('/api/feedback', require('./routes/feedback'));


// ── Health Check ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'RyeCentral Tasting App',
    version: '1.0.0',
    time: new Date().toISOString(),
  });
});


// ── Serve React build in production ──────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {/**
 * RyeCentral Tasting App — Server Entry Point
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const config = require('./config/env');
const { setupWebSocket } = require('./services/websocketService');

const app = express();
const server = http.createServer(app);

// ── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── API Routes ───────────────────────────────────────────
app.use('/api/products', require('./routes/products'));
app.use('/api/events', require('./routes/events'));

// ── Health Check ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'RyeCentral Tasting App',
    version: '1.0.0',
    time: new Date().toISOString(),
  });
});

// ── Serve React build in production ──────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// ── WebSocket ────────────────────────────────────────────
setupWebSocket(server);

// ── Start Server ─────────────────────────────────────────
server.listen(config.PORT, () => {
  const url = config.APP_URL || `http://localhost:${config.PORT}`;
  console.log(`
╔══════════════════════════════════════════╗
║   🥃 RyeCentral Tasting App Server      ║
║──────────────────────────────────────────║
║   URL:     ${url.padEnd(28)}║
║   Port:    ${String(config.PORT).padEnd(28)}║
║   Mode:    ${(process.env.NODE_ENV || 'development').padEnd(28)}║
║──────────────────────────────────────────║
║   Shopify: ${config.SHOPIFY_STORE_DOMAIN.padEnd(28)}║
╚══════════════════════════════════════════╝
  `);
});

module.exports = { app, server };
