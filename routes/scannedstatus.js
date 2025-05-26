// routes/scannedstatus.js
const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  const gameSessionID = req.session.gameSessionID;

  if (!gameSessionID) {
    return res.json({ success: false });
  }

  const query = `
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN characterID IS NOT NULL THEN 1 ELSE 0 END) AS scanned
    FROM playersession
    WHERE gameSessionID = ?
  `;

  db.query(query, [gameSessionID], (err, results) => {
    if (err) {
      console.error("Error checking scan status:", err);
      return res.json({ success: false });
    }

    const { total, scanned } = results[0];
    const allScanned = total === scanned;

    res.json({ success: true, allScanned });
  });
});

module.exports = router;
