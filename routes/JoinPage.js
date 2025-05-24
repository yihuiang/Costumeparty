// routes/JoinPage.js
const express = require('express');
const router = express.Router();

module.exports = (db) => {
    // Render Join Page
    router.get('/join', (req, res) => {
        res.render('JoinPage');
    });

    // Handle form submission
    router.post('/join', (req, res) => {
        const username = req.body.username;
        const gameSessionID = req.query.gameSessionID; // passed from scan

        if (!username || !gameSessionID) {
            return res.status(400).send("Username and session required");
        }

        const countQuery = `
            SELECT COUNT(*) AS playerCount
            FROM playersession
            WHERE gameSessionID = ?
        `;

        db.query(countQuery, [gameSessionID], (err, results) => {
            if (err) return res.status(500).send("Database error");

            const playerCount = results[0].playerCount;

            if (playerCount >= 5) {
                return res.send("This game session is full. Please try again.");
            }

            const insertPlayer = 'INSERT INTO player (username) VALUES (?)';
            db.query(insertPlayer, [username], (err, playerResult) => {
                if (err) return res.status(500).send("Failed to add player");

                const playerID = playerResult.insertId;
                req.session.username = username;
                req.session.gameSessionID = gameSessionID;

                const characterID = req.query.characterID; // scanned before
                const insertPlayerSession = `
                    INSERT INTO playersession (playerID, gameSessionID, characterID)
                    VALUES (?, ?, ?)
                `;

                db.query(insertPlayerSession, [playerID, gameSessionID, characterID], (err) => {
                    if (err) return res.status(500).send("Failed to assign character");

                    res.redirect('/waitingroom');
                });
            });
        });
    });


    return router;
};
