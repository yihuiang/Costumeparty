const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  const characterID = req.query.characterID;
  const eliminatorPlayerID = req.session.playerID;
  const gameSessionID = req.session.gameSessionID;

  if (!characterID || isNaN(characterID)) {
    return res.send(`
      <script>
        alert("Invalid character ID.");
        window.location.href = "/eliminate";
      </script>
    `);
  }

  // Step 1: Check if the character is owned and alive
  const checkQuery = `
    SELECT playerSessionID, playerID 
    FROM playersession 
    WHERE gameSessionID = ? AND characterID = ? AND isAlive = 1
  `;

  db.query(checkQuery, [gameSessionID, characterID], (err, result) => {
    if (err) return res.status(500).send("Internal Server Error");

    if (result.length === 0) {
      return renderCharacter(res, characterID, false); // Just show character, no one eliminated
    }

    const { playerSessionID: eliminatedSessionID, playerID: eliminatedPlayerID } = result[0];

    if (eliminatedPlayerID === eliminatorPlayerID) {
      return res.send(`
        <script>
          alert("You cannot eliminate yourself.");
          window.location.href = "/eliminate";
        </script>
      `);
    }

    // Step 2: Eliminate the player
    const eliminateQuery = `
      UPDATE playersession
      SET isAlive = 0
      WHERE playerID = ? AND gameSessionID = ?
    `;

    db.query(eliminateQuery, [eliminatedPlayerID, gameSessionID], (elimErr) => {
      if (elimErr) return res.status(500).send("Internal Server Error");

      // Step 3: Increment eliminator’s count
      const incrementQuery = `
        UPDATE playersession
        SET eliminationCount = eliminationCount + 1
        WHERE playerID = ? AND gameSessionID = ?
      `;

      db.query(incrementQuery, [eliminatorPlayerID, gameSessionID], (incErr) => {
        if (incErr) return res.status(500).send("Internal Server Error");

        // Step 4: Optionally insert into elimination table (if move info is available)
        // Note: You need `playerMoveID` to log this properly
        /*
        const insertElimQuery = `
          INSERT INTO elimination (playerMoveID, eliminatorSessionID, eliminatedSessionID)
          VALUES (?, ?, ?)
        `;
        db.query(insertElimQuery, [playerMoveID, eliminatorSessionID, eliminatedSessionID]);
        */

        return renderCharacter(res, characterID, true); // Show eliminated character
      });
    });
  });
});

function renderCharacter(res, characterID, wasEliminated) {
  const query = `SELECT name, image FROM character WHERE characterID = ?`;
  db.query(query, [characterID], (err, results) => {
    if (err || results.length === 0) {
      return res.status(500).send("Character not found");
    }

    const { name, image } = results[0];
    res.render("eliminatescan", { name, image, wasEliminated });
  });
}

module.exports = router;
