const express = require('express');
const router = express.Router();
const moment = require('moment'); // for formatting startTime

const db = require('../db');

router.get('/showplayers', (req, res) => {
    const gameSessionID = req.session.gameSessionID;

    if (!gameSessionID) return res.status(400).send("Session not set");

    const query = `
        SELECT p.username FROM player p
        JOIN playersession ps ON p.playerID = ps.playerID
        WHERE ps.gameSessionID = ?
    `;

    db.query(query, [gameSessionID], (err, players) => {
        if (err) return res.status(500).send("Database error");

        res.render('ShowPlayers', { players });
    });
});

module.exports = router;
