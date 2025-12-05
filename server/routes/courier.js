const express = require('express');
const pool = require('../db');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
router.use(authMiddleware, roleMiddleware('courier'));

const USD_TO_THB = 35;

// ---- Multer config for proof images ----
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ---- GET available jobs (paid only) ----
router.get('/jobs/available', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.*, u.name AS customer_name
       FROM deliveries d
       JOIN users u ON d.customer_id = u.id
       WHERE (d.status = 'pending' OR (d.status = 'accepted' AND d.courier_id = ?))
         AND d.payment_status = 'paid'
       ORDER BY d.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch jobs' });
  }
});

// ---- Accept job ----
router.post('/jobs/:id/accept', async (req, res) => {
  const deliveryId = req.params.id;
  const courierId = req.user.id;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT * FROM deliveries WHERE id = ? FOR UPDATE',
      [deliveryId]
    );
    if (rows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ message: 'Delivery not found' });
    }

    const job = rows[0];
    if (job.status !== 'pending') {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ message: 'Job already taken' });
    }

    await conn.query(
      'UPDATE deliveries SET status = "accepted", courier_id = ? WHERE id = ?',
      [courierId, deliveryId]
    );

    const earnedUSD = Number((job.price * 0.8).toFixed(2));

    await conn.query(
      `INSERT INTO courier_earnings (courier_id, delivery_id, amount, type)
       VALUES (?,?,?, 'delivery')`,
      [courierId, deliveryId, earnedUSD]
    );

    await conn.commit();
    conn.release();

    res.json({
      message: 'Job accepted',
      earnedUSD,
      earnedTHB: Math.round(earnedUSD * USD_TO_THB)
    });
  } catch (err) {
    console.error(err);
    await conn.rollback();
    conn.release();
    res.status(500).json({ message: 'Failed to accept job' });
  }
});

// ---- Update status (Pick up / In transit) ----
// PATCH /api/courier/jobs/:id/status  { status: 'picked_up' | 'in_transit' }
router.patch('/jobs/:id/status', async (req, res) => {
  try {
    const deliveryId = req.params.id;
    const { status } = req.body;

    if (!['picked_up', 'in_transit'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM deliveries WHERE id = ? AND courier_id = ?',
      [deliveryId, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Job not found for this courier' });
    }

    await pool.query('UPDATE deliveries SET status = ? WHERE id = ?', [
      status,
      deliveryId
    ]);

    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

// ---- Delivered + proof image ----
// POST /api/courier/jobs/:id/deliver (multipart: status=delivered, proof=<file>)
router.post(
  '/jobs/:id/deliver',
  upload.single('proof'),
  async (req, res) => {
    try {
      const deliveryId = req.params.id;

      const [rows] = await pool.query(
        'SELECT * FROM deliveries WHERE id = ? AND courier_id = ?',
        [deliveryId, req.user.id]
      );
      if (rows.length === 0) {
        return res
          .status(404)
          .json({ message: 'Job not found for this courier' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Proof image required' });
      }

      const proofURL = `/uploads/${req.file.filename}`;

      await pool.query(
        'UPDATE deliveries SET status = "delivered", proof_of_delivery = ? WHERE id = ?',
        [proofURL, deliveryId]
      );

      res.json({
        message: 'Successfully delivered',
        proofURL
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to mark delivered' });
    }
  }
);

// ---- My jobs ----
router.get('/jobs/my', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM deliveries WHERE courier_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch my jobs' });
  }
});

// ---- Earnings (USD + THB) ----
router.get('/earnings', async (req, res) => {
  try {
    const courierId = req.user.id;
    const [rows] = await pool.query(
      'SELECT type, amount FROM courier_earnings WHERE courier_id = ?',
      [courierId]
    );

    let earnedUSD = 0;
    let withdrawnUSD = 0;
    rows.forEach((r) => {
      if (r.type === 'delivery') earnedUSD += Number(r.amount);
      if (r.type === 'withdrawal') withdrawnUSD += Number(r.amount);
    });

    const balanceUSD = earnedUSD - withdrawnUSD;

    res.json({
      earnedUSD,
      withdrawnUSD,
      balanceUSD,
      earnedTHB: Math.round(earnedUSD * USD_TO_THB),
      balanceTHB: Math.round(balanceUSD * USD_TO_THB)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch earnings' });
  }
});

// ---- Withdraw any THB amount ----
// body: { amountTHB: number }
router.post('/withdraw', async (req, res) => {
  try {
    const courierId = req.user.id;
    const amountTHB = Number(req.body.amountTHB);

    if (!amountTHB || amountTHB <= 0) {
      return res.status(400).json({ message: 'Invalid withdraw amount' });
    }

    // Calculate USD balances
    const [rows] = await pool.query(
      'SELECT type, amount FROM courier_earnings WHERE courier_id = ?',
      [courierId]
    );

    let earnedUSD = 0;
    let withdrawnUSD = 0;
    rows.forEach((r) => {
      if (r.type === 'delivery') earnedUSD += Number(r.amount);
      if (r.type === 'withdrawal') withdrawnUSD += Number(r.amount);
    });

    const balanceUSD = earnedUSD - withdrawnUSD;
    const balanceTHB = balanceUSD * USD_TO_THB;

    if (amountTHB > balanceTHB + 0.0001) {
      return res.status(400).json({ message: 'Not enough balance' });
    }

    const amountUSD = Number((amountTHB / USD_TO_THB).toFixed(2));

    await pool.query(
      `INSERT INTO courier_earnings (courier_id, delivery_id, amount, type)
       VALUES (?, NULL, ?, 'withdrawal')`,
      [courierId, amountUSD]
    );

    await pool.query(
      'INSERT INTO courier_withdrawals (courier_id, amount) VALUES (?, ?)',
      [courierId, amountUSD]
    );

    res.json({
      message: 'Withdrawal successful',
      withdrawnUSD: amountUSD,
      withdrawnTHB: amountTHB
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to withdraw' });
  }
});

module.exports = router;
