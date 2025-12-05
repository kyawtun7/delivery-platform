const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customer');
const courierRoutes = require('./routes/courier');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.send('On-Demand Delivery Platform API');
});

app.use('/api/auth', authRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/courier', courierRoutes);

// Export for Vercel
if (process.env.VERCEL) {
  module.exports = app;
} else {
  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log(`Server running on ${port}`));
}
