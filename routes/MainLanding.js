// routes/MainLanding.js
const express = require('express');
const moment = require('moment');

module.exports = function (db) {
  const router = express.Router();

  // GET /main
  router.get('/main', (req, res) => {
    const gameSessionID = req.session.gameSessionID || null;
    res.render('MainLanding', { gameSessionID });
  });

  // POST /create-session
  router.post('/create-session', (req, res) => {
    const startTime = moment().format('YYYY-MM-DD HH:mm:ss');
    const status = 'waiting';

    const query = 'INSERT INTO gamesession (startTime, status) VALUES (?, ?)';
    db.query(query, [startTime, status], (err, result) => {
      if (err) {
        console.error('Failed to create session:', err);
        return res.status(500).send('Failed to create game session');
      }

      const gameSessionID = result.insertId;
      req.session.gameSessionID = gameSessionID;

      res.render('MainLanding', { gameSessionID }); // 👈 Pass ID to template
    });
  });

  // POST /start-game
  router.post('/start-game', (req, res) => {
    const gameSessionID = req.session.gameSessionID;

    if (!gameSessionID) {
      return res.status(400).send('Game session not created yet');
    }

    res.redirect('/showplayers');
  });

  return router;
};
