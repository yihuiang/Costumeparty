// routes/MainLanding.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const moment = require('moment');

// Only backend routes here
router.post('/create-session', (req, res) => {
    const startTime = moment().format('YYYY-MM-DD HH:mm:ss');
    const status = 'waiting';

    const query = 'INSERT INTO gamesession (startTime, status) VALUES (?, ?)';
    db.query(query, [startTime, status], (err, result) => {
        if (err) {
            console.error('Failed to create session:', err);
            return res.status(500).json({ error: 'Failed to create session' });
        }

        const gameSessionID = result.insertId;
        res.json({ gameSessionID });
    });
});

module.exports = router;
