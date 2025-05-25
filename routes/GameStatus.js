const express = require('express');
module.exports = function (db) {
  const router = express.Router();

  router.get('/gamestatus', (req, res) => {
    const gameSessionID = req.session.gameSessionID;

    if (!gameSessionID) return res.json({ status: 'no-session' });

    const query = `SELECT status FROM gamesession WHERE gameSessionID = ?`;

    db.query(query, [gameSessionID], (err, results) => {
      if (err || results.length === 0) {
        return res.json({ status: 'error' });
      }

      res.json({ status: results[0].status });
    });
  });

  return router;
};
