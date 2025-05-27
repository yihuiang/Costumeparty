const express = require('express');
const router = express.Router();
const db = require('../db');
const moment = require('moment');

const COLORS = ['red', 'blue', 'green', 'yellow', 'black'];

// Utility: Get or create the current game turn
async function getOrCreateCurrentTurn(gameSessionID) {
  return new Promise((resolve, reject) => {
    const selectQuery = `
      SELECT * FROM gameturn
      WHERE gameSessionID = ?
      ORDER BY gameTurnID DESC
      LIMIT 1
    `;
    db.query(selectQuery, [gameSessionID], (err, rows) => {
      if (err) return reject(err);
      if (rows.length > 0 && rows[0].endTime === null) {
        return resolve(rows[0]);
      }

      const roundNumber = rows.length > 0 ? rows[0].roundNumber + 1 : 1;
      const insertQuery = `
        INSERT INTO gameturn (gameSessionID, roundNumber, startTime)
        VALUES (?, ?, ?)
      `;
      const now = moment().format('YYYY-MM-DD HH:mm:ss');
      db.query(insertQuery, [gameSessionID, roundNumber, now], (err2, result) => {
        if (err2) return reject(err2);
        resolve({
          gameTurnID: result.insertId,
          gameSessionID,
          roundNumber,
          startTime: now,
          endTime: null
        });
      });
    });
  });
}
router.get('/current-turn', async (req, res) => {
  const { gameSessionID, playerSessionID } = req.session;

  if (!gameSessionID || !playerSessionID) {
    return res.json({ isPlayerTurn: false });
  }

  try {
    const [turnResult] = await db.promise().query(
      `SELECT ps.playerSessionID
       FROM gameturn gt
       JOIN playermove pm ON gt.gameTurnID = pm.gameTurnID
       JOIN playersession ps ON pm.playerSessionID = ps.playerSessionID
       WHERE gt.gameSessionID = ?
       ORDER BY pm.timeStamp DESC
       LIMIT 1`,
      [gameSessionID]
    );

    const lastPlayerSessionID = turnResult[0]?.playerSessionID;

    const [allPlayers] = await db.promise().query(
      `SELECT playerSessionID FROM playersession WHERE gameSessionID = ? ORDER BY playerSessionID`,
      [gameSessionID]
    );

    const playerIDs = allPlayers.map(p => p.playerSessionID);
    const currentIndex = playerIDs.indexOf(lastPlayerSessionID);
    const nextIndex = (currentIndex + 1) % playerIDs.length;
    const nextPlayerSessionID = playerIDs[nextIndex];

    res.json({ isPlayerTurn: nextPlayerSessionID === playerSessionID });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get current turn' });
  }
});
// Render the Dice page
router.get("/dice", async (req, res) => {
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
  const playerSessionQuery = `
    SELECT playerSessionID FROM playersession
    WHERE playerID = ? AND gameSessionID = ?
  `;
  const allPlayersQuery = `
    SELECT playerSessionID FROM playersession
    WHERE gameSessionID = ?
    ORDER BY playerSessionID
  `;

  try {
    const [characterRows] = await db.promise().query(characterQuery, [playerID, gameSessionID]);
    const [playerSessionRows] = await db.promise().query(playerSessionQuery, [playerID, gameSessionID]);
    const [allPlayersRows] = await db.promise().query(allPlayersQuery, [gameSessionID]);

    if (!playerSessionRows.length) return res.status(404).send("PlayerSession not found");

    const playerSessionID = playerSessionRows[0].playerSessionID;
    const allPlayerIDs = allPlayersRows.map(r => r.playerSessionID);

    const currentTurn = await getOrCreateCurrentTurn(gameSessionID);

    const moveCountQuery = `
      SELECT COUNT(*) AS moveCount FROM playermove
      WHERE gameTurnID = ?
    `;
    const [moveCountRows] = await db.promise().query(moveCountQuery, [currentTurn.gameTurnID]);
    const moveCount = moveCountRows[0].moveCount;

    const currentTurnPlayerID = allPlayerIDs[moveCount % allPlayerIDs.length];
    const isPlayerTurn = currentTurnPlayerID === playerSessionID;

    res.render("dice", {
      username,
      character: characterRows[0],
      isPlayerTurn,
      gameTurnID: currentTurn.gameTurnID,
      playerSessionID
    });

  } catch (err) {
    console.error("Error loading dice page:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Handle dice roll
router.post("/roll-dice", async (req, res) => {
   console.log(req.body);
  const { rolledValue, rolledColor, gameTurnID } = req.body;
  const playerID = req.session.playerID;
  const gameSessionID = req.session.gameSessionID;

  if (!rolledValue || !rolledColor || !gameTurnID || !playerID || !gameSessionID)
    return res.status(400).json({ error: "Missing data" });

    console.log("ROLL DATA", { rolledValue, rolledColor, gameTurnID, playerID, gameSessionID });


  try {
    const [sessionRow] = await db.promise().query(`
      SELECT playerSessionID FROM playersession
      WHERE playerID = ? AND gameSessionID = ?
    `, [playerID, gameSessionID]);

    if (!sessionRow.length) return res.status(404).json({ error: "Session not found" });

    const playerSessionID = sessionRow[0].playerSessionID;
    const now = moment().format('YYYY-MM-DD HH:mm:ss');

    await db.promise().query(`
      INSERT INTO playermove (gameTurnID, playerSessionID, rolledColor, rolledValue, timeStamp)
      VALUES (?, ?, ?, ?, ?)
    `, [gameTurnID, playerSessionID, rolledColor, rolledValue, now]);

    res.json({ success: true });
  } catch (err) {
    console.error("Error inserting roll:", err);
    res.status(500).json({ error: "Insert failed" });
  }
});




module.exports = router;
