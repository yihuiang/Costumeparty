const express = require('express');

module.exports = function (db) {
  const router = express.Router(); // ✅ this was missing

  router.get('/leaderboard', (req, res) => {
    const gameSessionID = req.session.gameSessionID || req.query.gameSessionID;

    console.log("Session gameSessionID:", gameSessionID); // debug

    if (!gameSessionID) {
      return res.send("No game session found.");
    }

    const query = `
      SELECT p.username, ps.score
      FROM playersession ps
      JOIN player p ON ps.playerID = p.playerID
      WHERE ps.gameSessionID = ?
      ORDER BY ps.score DESC
    `;

    db.query(query, [gameSessionID], (err, players) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).send("Database error");
      }

      if (players.length === 0) {
        console.log("No players found for session:", gameSessionID);
      }

      res.render('Leaderboard', { players });
    });
  });

  return router;
};
