const express = require("express");
const router = express.Router();
const db = require("../db");

// Map EC01–EC18 to characterID 1–18
const qrCodeToCharacterID = {
  "EC01": 1, "EC02": 2, "EC03": 3, "EC04": 4, "EC05": 5,
  "EC06": 6, "EC07": 7, "EC08": 8, "EC09": 9, "EC10": 10,
  "EC11": 11, "EC12": 12, "EC13": 13, "EC14": 14, "EC15": 15,
  "EC16": 16, "EC17": 17, "EC18": 18,
};

router.get("/", (req, res) => {
  const qrCode = req.query.characterID;
  const username = req.session.username || "Player";
  const eliminatorPlayerID = req.session.playerID;
  const gameSessionID = req.session.gameSessionID;
  const playerMoveID = req.session.playerMoveID;

  if (!qrCode || !qrCodeToCharacterID[qrCode]) {
    return res.send(`
      <script>
        alert("Invalid QR code.");
        window.location.href = "/eliminate";
      </script>
    `);
  }

  const characterID = qrCodeToCharacterID[qrCode];

  const checkQuery = `
    SELECT playerSessionID, playerID 
    FROM playersession 
    WHERE gameSessionID = ? AND characterID = ? AND isAlive = 1
  `;

  db.query(checkQuery, [gameSessionID, characterID], (err, result) => {
    if (err) return res.status(500).send("Internal Server Error");

    // Case 1: No one owns this character — still increment elimination count
    if (result.length === 0) {
      const sessionQuery = `
        SELECT playerSessionID
        FROM playersession
        WHERE playerID = ? AND gameSessionID = ?
      `;

      db.query(sessionQuery, [eliminatorPlayerID, gameSessionID], (err2, rows) => {
        if (err2 || rows.length === 0) return res.status(500).send("Player session not found");

        const eliminatorSessionID = rows[0].playerSessionID;

        const incrementQuery = `
          UPDATE playersession
          SET eliminationCount = IFNULL(eliminationCount, 0) + 1
          WHERE playerSessionID = ?
        `;

        db.query(incrementQuery, [eliminatorSessionID], (incErr) => {
          if (incErr) return res.status(500).send("Failed to update elimination count");

          return renderCharacter(res, characterID, false, req, eliminatorSessionID);
        });
      });

      return;
    }

    // Case 2: Character is owned and alive
    const { playerSessionID: eliminatedSessionID, playerID: eliminatedPlayerID } = result[0];

    if (eliminatedPlayerID === eliminatorPlayerID) {
      return res.send(`
        <script>
          alert("You cannot eliminate yourself.");
          window.location.href = "/eliminate";
        </script>
      `);
    }

    // Fetch eliminated player's username
    const getEliminatedUsernameQuery = `
      SELECT username FROM player WHERE playerID = ?
    `;

    db.query(getEliminatedUsernameQuery, [eliminatedPlayerID], (errUsername, usernameRows) => {
      if (errUsername || usernameRows.length === 0) return res.status(500).send("Failed to fetch eliminated player's name");

      const eliminatedPlayerUsername = usernameRows[0].username;

      const eliminatorSessionQuery = `
        SELECT playerSessionID
        FROM playersession
        WHERE playerID = ? AND gameSessionID = ?
      `;

      db.query(eliminatorSessionQuery, [eliminatorPlayerID, gameSessionID], (err1, elimRows) => {
        if (err1 || elimRows.length === 0) return res.status(500).send("Eliminator session not found");

        const eliminatorSessionID = elimRows[0].playerSessionID;

        const eliminateQuery = `
          UPDATE playersession
          SET isAlive = 0
          WHERE playerID = ? AND gameSessionID = ?
        `;

        db.query(eliminateQuery, [eliminatedPlayerID, gameSessionID], (elimErr) => {
          if (elimErr) return res.status(500).send("Failed to eliminate player");

          const incrementQuery = `
            UPDATE playersession
            SET eliminationCount = IFNULL(eliminationCount, 0) + 1
            WHERE playerSessionID = ?
          `;

          db.query(incrementQuery, [eliminatorSessionID], (incErr) => {
            if (incErr) return res.status(500).send("Failed to update elimination count");

            const scoreUpdateQuery = `
              UPDATE playersession
              SET score = IFNULL(score, 0) + 300
              WHERE playerSessionID = ?
            `;

            db.query(scoreUpdateQuery, [eliminatorSessionID], (scoreErr) => {
              if (scoreErr) return res.status(500).send("Failed to update score");

              if (playerMoveID && eliminatorSessionID && eliminatedSessionID) {
                const insertEliminationQuery = `
                  INSERT INTO elimination (playerMoveID, eliminatorSessionID, eliminatedSessionID)
                  VALUES (?, ?, ?)
                `;

                db.query(insertEliminationQuery, [playerMoveID, eliminatorSessionID, eliminatedSessionID], (err5) => {
                  if (err5) return res.status(500).send("Failed to insert elimination record");

                  return renderCharacter(res, characterID, true, req, eliminatorSessionID, eliminatedPlayerUsername);
                });
              } else {
                return renderCharacter(res, characterID, true, req, eliminatorSessionID, eliminatedPlayerUsername);
              }
            });
          });
        });
      });
    });
  });
});


function renderCharacter(res, characterID, wasEliminated, req, playerSessionID, eliminatedPlayerUsername = null)
 {
  const username = req.session.username || "Player";

  const characterQuery = `
    SELECT c.name, c.image, c.description
    FROM playersession ps
    JOIN \`character\` c ON ps.characterID = c.characterID
    WHERE ps.playerSessionID = ?
  `;

  db.query(characterQuery, [playerSessionID], (err, charRows) => {
    if (err) return res.status(500).send("Character query failed");

    const character = charRows[0] || null;

    const statsQuery = `
      SELECT score, eliminationCount
      FROM playersession
      WHERE playerSessionID = ?
    `;

    db.query(statsQuery, [playerSessionID], (err2, statsRows) => {
      if (err2 || statsRows.length === 0) return res.status(500).send("Stats fetch failed");

      const score = statsRows[0].score;
      const count = statsRows[0].eliminationCount;

      const getEliminatedCharacterQuery = `
        SELECT name, image
        FROM \`character\`
        WHERE characterID = ?
      `;

      db.query(getEliminatedCharacterQuery, [characterID], (err3, elimRows) => {
        if (err3 || elimRows.length === 0) return res.status(500).send("Eliminated character not found");

        const { name, image } = elimRows[0];

        res.render("eliminatescan", {
          username,
          character,
          score,
          count,
          wasEliminated,
          name,
          image,
          eliminatedPlayerUsername
        });
      });
    });
  });
}

router.get('/check-eliminated', (req, res) => {
  const playerID = req.session.playerID;
  const gameSessionID = req.session.gameSessionID;

  if (!playerID || !gameSessionID) {
    return res.json({ isEliminated: false });
  }

  const query = `
    SELECT isAlive
    FROM playersession
    WHERE playerID = ? AND gameSessionID = ?
  `;

  db.query(query, [playerID, gameSessionID], (err, rows) => {
    if (err || rows.length === 0) {
      return res.json({ isEliminated: false });
    }

    const isAlive = rows[0].isAlive;
    res.json({ isEliminated: isAlive === 0 });
  });
});

router.get('/check-winner', (req, res) => {
  const { playerSessionID } = req.session;

  if (!playerSessionID) return res.json({ isWinner: false });

  db.query(
    'SELECT gameSessionID FROM playersession WHERE playerSessionID = ?',
    [playerSessionID],
    (err, playerRows) => {
      if (err) {
        console.error("Error querying player session:", err);
        return res.json({ isWinner: false });
      }

      if (playerRows.length === 0) return res.json({ isWinner: false });

      const gameSessionID = playerRows[0].gameSessionID;

      db.query(
        'SELECT playerSessionID FROM playersession WHERE gameSessionID = ? AND isAlive = 1',
        [gameSessionID],
        (err2, alivePlayers) => {
          if (err2) {
            console.error("Error querying alive players:", err2);
            return res.json({ isWinner: false });
          }

          const isWinner =
            alivePlayers.length === 1 &&
            alivePlayers[0].playerSessionID === playerSessionID;

          res.json({ isWinner });
        }
      );
    }
  );
});


module.exports = router;
