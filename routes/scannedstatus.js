// routes/scannedstatus.js
const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  const gameSessionID = req.session.gameSessionID;

  if (!gameSessionID) {
    return res.json({ success: false, error: "No session found" });
  }

  // Get total number of players in the session
  const totalPlayersQuery = `
    SELECT COUNT(*) AS total FROM playersession WHERE gameSessionID = ?
  `;
  db.query(totalPlayersQuery, [gameSessionID], (err, totalResult) => {
    if (err) {
      console.error("Error getting total players:", err);
      return res.json({ success: false });
    }

    const totalPlayers = totalResult[0].total;

    // Get number of players with a non-null characterID
    const scannedQuery = `
      SELECT COUNT(*) AS scanned FROM playersession 
      WHERE gameSessionID = ? AND characterID IS NOT NULL
    `;
    db.query(scannedQuery, [gameSessionID], (err, scannedResult) => {
      if (err) {
        console.error("Error getting scanned players:", err);
        return res.json({ success: false });
      }

      const scannedPlayers = scannedResult[0].scanned;
      const allScanned = scannedPlayers === totalPlayers;

      console.log(`Scanned: ${scannedPlayers} / ${totalPlayers}`);
      res.json({ success: true, allScanned });
    });
  });
});

module.exports = router;
