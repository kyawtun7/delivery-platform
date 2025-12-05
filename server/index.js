// server/index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customer');
const courierRoutes = require('./routes/courier');

const app = express();

/**
 * CORS: allow ALL origins (simple for demo)
 * This fixes:
 *   "No 'Access-Control-Allow-Origin' header is present..."
 */
app.use(
  cors({
    origin: true,      // reflect the request origin
    credentials: true  // allow credentials / auth headers
  })
);

// handle all preflight OPTIONS requests
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.send('On-Demand Delivery Platform API');
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/courier', courierRoutes);

/**
 * Export for Vercel (serverless) OR start normally for local dev
 */
if (process.env.VERCEL) {
  module.exports = app;             // Vercel will use this
} else {
  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
