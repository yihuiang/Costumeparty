const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/winner', (req, res) => {
  const { playerSessionID } = req.session;

  if (!playerSessionID) return res.redirect('/');

  // Step 1: Get gameSessionID
  db.query('SELECT gameSessionID FROM playersession WHERE playerSessionID = ?', [playerSessionID], (err, playerRows) => {
    if (err || playerRows.length === 0) return res.redirect('/');

    const gameSessionID = playerRows[0].gameSessionID;

    // Step 2: Count alive players (corrected condition)
    db.query('SELECT COUNT(*) AS aliveCount FROM playersession WHERE gameSessionID = ? AND isAlive = 1', [gameSessionID], (err2, countRows) => {
      if (err2 || countRows[0].aliveCount !== 1) return res.redirect('/dice');

      // Step 3: Get winner info (corrected to use eliminationCount)
      db.query(
        `SELECT ps.username, ps.score, ps.eliminationCount, c.image, c.name 
        FROM playersession ps
        LEFT JOIN character c ON ps.characterID = c.characterID
        WHERE ps.playerSessionID = ?`,
        [playerSessionID],
        (err3, winnerRows) => {
          if (err3 || winnerRows.length === 0) return res.redirect('/');

          const winnerData = winnerRows[0];

          // ✅ Step 2: Render template with all needed data
          res.render('winner', {
            username: winnerData.username || 'Player',
            score: winnerData.score || 0,
            count: winnerData.eliminationCount || 0,
            image: winnerData.image || 'default.png',
            name: winnerData.name || 'Unknown'
          });
        }
      );
    });
  });
});

module.exports = router;
