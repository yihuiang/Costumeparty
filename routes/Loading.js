// routes/Loading.js
const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  router.get('/loading', (req, res) => {
    const username = req.session.username || "Player";
    res.render('Loading', { username });
  });

  // Return route so app.js can use it
  return router;
};
