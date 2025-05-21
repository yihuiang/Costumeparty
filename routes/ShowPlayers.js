const express = require('express');
const router = express.Router();
const moment = require('moment'); // for formatting startTime

const db = require('../db');

router.get('/showplayers', (req, res) => {
    const query = `
        SELECT * FROM player
        WHERE playerID NOT IN (SELECT playerID FROM playersession)
    `;
    db.query(query, (err, players) => {
        if (err) {
            console.error('Failed to fetch players:', err);
            return res.status(500).send("Database error");
        }
        res.render('ShowPlayers', { players });
    });
});

router.post('/startgame', (req, res) => {
    const startTime = moment().format('YYYY-MM-DD HH:mm:ss');

    const insertSession = `INSERT INTO gamesession (startTime, status) VALUES (?, ?)`;

    db.query(insertSession, [startTime,'waiting'], (err, result) => {
        if (err) {
            console.error('Failed to insert game session:', err);
            return res.status(500).send('Database error');
        }

        const gameSessionID = result.insertId;

        const fetchUnassigned = `
            SELECT playerID FROM player 
            WHERE playerID NOT IN (SELECT playerID FROM playersession)
        `;

        db.query(fetchUnassigned, (err, players) => {
            if (err) {
                console.error('Failed to fetch unassigned players:', err);
                return res.status(500).send('Database error');
            }

            const insertPlayerSessions = `
                INSERT INTO playersession (playerID, gameSessionID) VALUES ?
            `;

            const values = players.map(player => [player.playerID, gameSessionID]);

            if (values.length === 0) {
                return res.send("No players to assign.");
            }

            db.query(insertPlayerSessions, [values], (err) => {
                if (err) {
                    console.error('Failed to insert into playersession:', err);
                    return res.status(500).send('Database error');
                }

                res.redirect('/showplayers');
            });
        });
    });
});

module.exports = router;
