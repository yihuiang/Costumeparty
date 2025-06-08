const express = require('express');
const router = express.Router();
const db = require('../db');
const moment = require('moment');

// Helper: Get or create the current turn, callback style
function getOrCreateCurrentTurn(gameSessionID, callback) {
  const selectQuery = `
    SELECT * FROM gameturn
    WHERE gameSessionID = ?
    ORDER BY gameTurnID DESC
    LIMIT 1
  `;
  db.query(selectQuery, [gameSessionID], (err, rows) => {
    if (err) return callback(err);

    if (rows.length > 0 && rows[0].endTime === null) {
      return callback(null, rows[0]);
    }

    const roundNumber = rows.length > 0 ? rows[0].roundNumber + 1 : 1;
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    const insertQuery = `
      INSERT INTO gameturn (gameSessionID, roundNumber, startTime)
      VALUES (?, ?, ?)
    `;
    db.query(insertQuery, [gameSessionID, roundNumber, now], (err2, result) => {
      if (err2) return callback(err2);
      callback(null, {
        gameTurnID: result.insertId,
        gameSessionID,
        roundNumber,
        startTime: now,
        endTime: null
      });
    });
  });
}

// GET /current-turn
router.get('/current-turn', (req, res) => {
  const { gameSessionID, playerSessionID } = req.session;

  if (!gameSessionID || !playerSessionID) {
    return res.json({ isPlayerTurn: false });
  }

  const lastMoveSql = `
    SELECT pm.playerSessionID
    FROM gameturn gt
    JOIN playermove pm ON gt.gameTurnID = pm.gameTurnID
    WHERE gt.gameSessionID = ?
    ORDER BY pm.timeStamp DESC
    LIMIT 1
  `;

  db.query(lastMoveSql, [gameSessionID], (err, lastMoves) => {
    if (err) return res.status(500).json({ error: 'Failed to get last move' });

    const lastPlayerSessionID = lastMoves.length ? lastMoves[0].playerSessionID : null;

    const allPlayersSql = `
      SELECT playerSessionID FROM playersession
      WHERE gameSessionID = ?
      ORDER BY playerSessionID
    `;
    db.query(allPlayersSql, [gameSessionID], (err2, players) => {
      if (err2) return res.status(500).json({ error: 'Failed to get players' });

      const playerIDs = players.map(p => p.playerSessionID);
      if (!lastPlayerSessionID) {
        // No moves yet, first player's turn
        return res.json({ isPlayerTurn: playerIDs[0] === playerSessionID });
      }

      const currentIndex = playerIDs.indexOf(lastPlayerSessionID);
      const nextIndex = (currentIndex + 1) % playerIDs.length;
      const nextPlayerSessionID = playerIDs[nextIndex];

      res.json({ isPlayerTurn: nextPlayerSessionID === playerSessionID });
    });
  });
});

// GET /dice
router.get('/dice', (req, res) => {
  const username = req.session.username || "Player";
  const playerID = req.session.playerID;
  const gameSessionID = req.session.gameSessionID;

  if (!playerID || !gameSessionID) return res.status(400).send("Missing session");

  const characterQuery = `
    SELECT c.name, c.image, c.description
    FROM playersession ps
    JOIN \`character\` c ON ps.characterID = c.characterID
    WHERE ps.playerID = ? AND ps.gameSessionID = ?
  `;

  db.query(characterQuery, [playerID, gameSessionID], (err, characterRows) => {
    if (err) return res.status(500).send("Character query failed");

    const playerSessionQuery = `
      SELECT playerSessionID FROM playersession
      WHERE playerID = ? AND gameSessionID = ?
    `;

    db.query(playerSessionQuery, [playerID, gameSessionID], (err2, playerSessionRows) => {
      if (err2 || playerSessionRows.length === 0) return res.status(500).send("Player session query failed");

      const playerSessionID = playerSessionRows[0].playerSessionID;

      const allPlayersQuery = `
        SELECT playerSessionID FROM playersession
        WHERE gameSessionID = ?
        ORDER BY playerSessionID
      `;

      db.query(allPlayersQuery, [gameSessionID], (err3, allPlayersRows) => {
        if (err3) return res.status(500).send("All players query failed");

        const allPlayerIDs = allPlayersRows.map(r => r.playerSessionID);

        const lastMoveSql = `
          SELECT gt.gameTurnID, pm.playerSessionID
          FROM gameturn gt
          JOIN playermove pm ON gt.gameTurnID = pm.gameTurnID
          WHERE gt.gameSessionID = ?
          ORDER BY pm.timeStamp DESC
          LIMIT 1
        `;

        db.query(lastMoveSql, [gameSessionID], (err4, lastMoves) => {
          if (err4) return res.status(500).send("Last move query failed");

          let isPlayerTurn = false;
          let gameTurnID;

          if (lastMoves.length === 0) {
            // No moves yet, create new turn
            const now = moment().format('YYYY-MM-DD HH:mm:ss');
            const insertTurnSql = `
              INSERT INTO gameturn (gameSessionID, roundNumber, startTime)
              VALUES (?, 1, ?)
            `;
            db.query(insertTurnSql, [gameSessionID, now], (err5, insertResult) => {
              if (err5) return res.status(500).send("Insert turn failed");

              gameTurnID = insertResult.insertId;
              isPlayerTurn = allPlayerIDs[0] === playerSessionID;

              res.render('dice', {
                username,
                character: characterRows[0] || null,
                isPlayerTurn,
                gameTurnID
              });
            });
          } else {
            gameTurnID = lastMoves[0].gameTurnID;
            const lastPlayerID = lastMoves[0].playerSessionID;
            const currentIndex = allPlayerIDs.indexOf(lastPlayerID);
            const nextIndex = (currentIndex + 1) % allPlayerIDs.length;
            isPlayerTurn = allPlayerIDs[nextIndex] === playerSessionID;

            res.render('dice', {
              username,
              character: characterRows[0] || null,
              isPlayerTurn,
              gameTurnID
            });
          }
        });
      });
    });
  });
});

// POST /roll-dice
router.post('/roll-dice', (req, res) => {
  const playerID = req.session.playerID;
  const gameSessionID = req.session.gameSessionID;
  const { rolledValue, rolledColor, gameTurnID } = req.body;

  if (!playerID || !gameSessionID || !rolledValue || !rolledColor || !gameTurnID) {
    return res.status(400).json({ success: false, error: "Missing data" });
  }

  const playerSessionSql = `
    SELECT playerSessionID FROM playersession
    WHERE playerID = ? AND gameSessionID = ?
  `;

  db.query(playerSessionSql, [playerID, gameSessionID], (err, playerSessionRows) => {
    if (err) return res.status(500).json({ success: false, error: "Player session query failed" });
    if (playerSessionRows.length === 0) return res.status(400).json({ success: false, error: "Player session not found" });

    const playerSessionID = playerSessionRows[0].playerSessionID;
    const now = moment().format('YYYY-MM-DD HH:mm:ss');

    const insertMoveSql = `
      INSERT INTO playermove (gameTurnID, playerSessionID, rolledColor, rolledValue, timeStamp)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(insertMoveSql, [gameTurnID, playerSessionID, rolledColor, rolledValue, now], (err2) => {
      if (err2) return res.status(500).json({ success: false, error: "Insert move failed" });

      res.json({ success: true, redirectUrl: '/question' });
    });
  });
});

module.exports = router;
