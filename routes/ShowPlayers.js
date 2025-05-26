const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  // GET /showplayers - show list of players in the session
  router.get('/showplayers', (req, res) => {
    const gameSessionID = req.session.gameSessionID;
    console.log("ShowPlayers - session gameSessionID:", req.session.gameSessionID);


    if (!gameSessionID) {
      return res.status(400).send("Session not set");
    }

    const query = `
      SELECT p.username FROM player p
      JOIN playersession ps ON p.playerID = ps.playerID
      WHERE ps.gameSessionID = ?
    `;

    db.query(query, [gameSessionID], (err, players) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).send("Database error");
      }

      res.render('ShowPlayers', { players });
    });
  });

  // POST /startgame - update game session status to 'started'
  router.post('/startgame', (req, res) => {
    const gameSessionID = req.session.gameSessionID;

    if (!gameSessionID) {
      return res.status(400).send("No active game session");
    }

    const updateQuery = `
      UPDATE gamesession
      SET status = 'started'
      WHERE gameSessionID = ?
    `;

    db.query(updateQuery, [gameSessionID], (err) => {
      if (err) {
        console.error("Failed to update game session status:", err);
        return res.status(500).send("Failed to start game");
      }

      // Redirect host to leaderboard (or change to another route as needed)
      res.redirect('/leaderboard');
    });
  });

  return router;
};
