const express = require("express");
const router = express.Router();
const db = require("../db");


const qrCodeToCharacterID = {
  "C01": 1, "C02": 2, "C03": 3, "C04": 4, "C05": 5,
  "C06": 6, "C07": 7, "C08": 8, "C09": 9, "C10": 10,
  "C11": 11, "C12": 12, "C13": 13, "C14": 14, "C15": 15,
  "C16": 16, "C17": 17, "C18": 18,
};

router.get("/", (req, res) => {
  const qrCode = req.query.characterID;
  const username = req.session.username || "Player";
  const playerID = req.session.playerID;
  const gameSessionID = req.session.gameSessionID;

  if (!qrCode || !qrCodeToCharacterID[qrCode]) {
    return res.send(`
      <script>
        alert("Invalid QR code.");
        window.location.href = "/waitingroom";
      </script>
    `);
  }

  const characterID = qrCodeToCharacterID[qrCode];
  console.log("QR Code:", qrCode);
  console.log("Mapped characterID:", characterID);
  console.log("Session playerID:", playerID);
  console.log("Session gameSessionID:", gameSessionID);

  // Check if character is already used in this game session
  const checkQuery = `
    SELECT * FROM playersession
    WHERE gameSessionID = ? AND characterID = ?
  `;
  db.query(checkQuery, [gameSessionID, characterID], (checkErr, checkResult) => {
    if (checkErr) {
      console.error("Error checking character usage:", checkErr);
      return res.status(500).send("Internal Server Error");
    }

    

    if (checkResult.length > 0) {
      // Character already taken in this session
      return res.send(`
        <script>
          alert("This character has already been scanned by another player. Please scan a different one.");
          window.location.href = "/waitingroom";
        </script>
      `);
    }

    // Character is available — update player session
    const updateQuery = `
      UPDATE playersession
      SET characterID = ?
      WHERE playerID = ? AND gameSessionID = ?
    `;
    db.query(updateQuery, [characterID, playerID, gameSessionID], (updateErr) => {
      if (updateErr) {
        console.error("Error updating characterID:", updateErr);
        return res.status(500).send("Internal Server Error");
      }

      console.log("CharacterID updated in playersession.");

      // Get character info to display
      const characterInfoQuery = `
        SELECT name, image, description
        FROM \`character\`
        WHERE characterID = ?
      `;
      db.query(characterInfoQuery, [characterID], (charErr, charResult) => {
        if (charErr || charResult.length === 0) {
          console.error("Error fetching character:", charErr);
          return res.status(500).send("Internal Server Error");
        }

        const character = charResult[0];

        // Render scan result
        res.render("characterScan", {
          username,
          name: character.name,
          image: character.image,
          description: character.description
        });
      });
    });
  });
});



router.get("/", (req, res) => {
  const gameSessionID = req.session.gameSessionID;

  if (!gameSessionID) {
    return res.json({ success: false, error: "No session found" });
  }

  // Get number of players in the game session
  const totalPlayersQuery = `
    SELECT COUNT(*) AS total FROM playersession WHERE gameSessionID = ?
  `;

  db.query(totalPlayersQuery, [gameSessionID], (err, totalResult) => {
    if (err) {
      console.error("Error getting total players:", err);
      return res.json({ success: false });
    }

    const totalPlayers = totalResult[0].total;

    // Get number of players who have selected a character
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

      res.json({ success: true, allScanned });
    });
  });
});


module.exports = router;
