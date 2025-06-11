const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/eliminated', (req, res) => {
  const { playerSessionID } = req.session;

  if (!playerSessionID) {
    return res.render('eliminated', {
      image: 'default.png',
      characterName: 'Unknown'
    });
  }

  db.query(
    `SELECT c.image, c.name 
     FROM playersession ps
     JOIN character c ON ps.characterID = c.characterID
     WHERE ps.playerSessionID = ?`,
    [playerSessionID],
    (err, results) => {
      if (err || results.length === 0) {
        return res.render('eliminated', {
          image: 'default.png',
          characterName: 'Unknown'
        });
      }

      const eliminatedData = results[0];

      res.render('eliminated', {
        image: eliminatedData.image,
        characterName: eliminatedData.name
      });
    }
  );
});

module.exports = router;
