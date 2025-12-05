const express = require('express');
const pool = require('../db');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { calculatePrice } = require('../pricing');

const router = express.Router();

const USD_TO_THB = 35;

// protect all routes
router.use(authMiddleware, roleMiddleware('customer'));

// GET /api/customer/pricing?pickup_city=&drop_city=
router.get('/pricing', (req, res) => {
  try {
    const { pickup_city, drop_city } = req.query;
    const priceUSD = calculatePrice(pickup_city, drop_city);
    res.json({
      priceUSD,
      priceTHB: Math.round(priceUSD * USD_TO_THB)
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/customer/deliveries
router.post('/deliveries', async (req, res) => {
  try {
    const {
      recipient_name,
      pickup_city,
      pickup_address,
      drop_city,
      drop_address,
      contact_phone
    } = req.body;

    const priceUSD = calculatePrice(pickup_city, drop_city);

    const [result] = await pool.query(
      `INSERT INTO deliveries
       (customer_id, recipient_name, pickup_city, pickup_address,
        drop_city, drop_address, contact_phone, price)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        req.user.id,
        recipient_name,
        pickup_city,
        pickup_address,
        drop_city,
        drop_address,
        contact_phone,
        priceUSD
      ]
    );

    res.status(201).json({
      id: result.insertId,
      priceUSD,
      priceTHB: Math.round(priceUSD * USD_TO_THB)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Create delivery failed' });
  }
});

// POST /api/customer/deliveries/:id/pay
router.post('/deliveries/:id/pay', async (req, res) => {
  try {
    const deliveryId = req.params.id;

    const [rows] = await pool.query(
      'SELECT * FROM deliveries WHERE id = ? AND customer_id = ?',
      [deliveryId, req.user.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: 'Delivery not found' });

    await pool.query(
      'UPDATE deliveries SET payment_status = "paid" WHERE id = ?',
      [deliveryId]
    );

    res.json({ message: 'Payment successful (demo)', deliveryId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Payment failed' });
  }
});

// GET /api/customer/deliveries
router.get('/deliveries', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM deliveries WHERE customer_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch deliveries' });
  }
});

module.exports = router;
