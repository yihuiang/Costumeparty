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

        if (!username) {
            return res.status(400).send("Username is required");
        }

        // Insert player into player table
        const insertPlayerQuery = 'INSERT INTO player (username) VALUES (?)';

        db.query(insertPlayerQuery, [username], (err, result) => {
            if (err) {
                console.error("Failed to insert player:", err);
                return res.status(500).send("Database error");
            }

            // Redirect to show players page
            res.redirect('/waitingroom');
        });
    });

    return router;
};
