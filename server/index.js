// server/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customer');
const courierRoutes = require('./routes/courier');

const app = express();

// ---- CORS ----
const allowedOrigins = [
  'http://localhost:5173',
  'https://delivery-platform-uhdc.vercel.app' // your Vercel FRONTEND url
];

app.use(
  cors({
    origin(origin, callback) {
      // allow REST tools / server-to-server (no origin)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

// Handle preflight for all routes
app.options('*', cors());

// ---- Body parsing ----
app.use(express.json({ limit: '10mb' }));

// (If you still use /uploads locally)
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.send('On-Demand Delivery Platform API');
});

// ---- API routes ----
app.use('/api/auth', authRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/courier', courierRoutes);

// ---- Export for Vercel or start locally ----
if (process.env.VERCEL) {
  // On Vercel: export the app (serverless handler)
  module.exports = app;
} else {
  // Local dev: real server
  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
