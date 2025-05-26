const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  router.post('/join', (req, res) => {
    const username = req.body.username;
    const gameSessionID = req.body.gameSessionID || req.query.gameSessionID || req.session.gameSessionID;

    req.session.username = username;
    req.session.gameSessionID = gameSessionID;

    if (!gameSessionID) {
      return res.status(400).send("No active game session");
    }

    
    
    // Step 1: Insert into Player table
    const insertPlayerQuery = 'INSERT INTO player (username) VALUES (?)';
    db.query(insertPlayerQuery, [username], (err, playerResult) => {
      if (err) {
        console.error('Error inserting player:', err);
        return res.status(500).send('Error inserting player');
      }

      const playerID = playerResult.insertId;
      req.session.playerID = playerID;

      // Step 2: Insert into PlayerSession
      const insertPlayerSessionQuery = `
        INSERT INTO playersession (playerID, gameSessionID)
        VALUES (?, ?)
      `;
      db.query(insertPlayerSessionQuery, [playerID, gameSessionID], (err2, sessionResult) => {
        if (err2) {
          console.error('Error inserting player session:', err2);
          return res.status(500).send('Error inserting player session');
        }

        
        // Optional: Store playerSessionID in session if needed
        req.session.playerSessionID = sessionResult.insertId;

        res.redirect('/loading'); // or wherever you want to send the player
      });
    });
  });

  return router;
};
