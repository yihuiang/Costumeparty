const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /question
router.get('/question', (req, res) => {
  const username = req.session.username || "Player";
  const { playerID, gameSessionID } = req.session;

  if (!playerID || !gameSessionID) return res.status(400).send("Missing session");

  const characterQuery = `
    SELECT c.name, c.image, c.description
    FROM playersession ps
    JOIN \`character\` c ON ps.characterID = c.characterID
    WHERE ps.playerID = ? AND ps.gameSessionID = ?
  `;

  db.query(characterQuery, [playerID, gameSessionID], (err, characterRows) => {
    if (err) return res.status(500).send("Character query failed");

    const character = characterRows[0] || null;

    const playerSessionQuery = `
      SELECT playerSessionID, score
      FROM playersession
      WHERE playerID = ? AND gameSessionID = ?
    `;

    db.query(playerSessionQuery, [playerID, gameSessionID], (err2, psRows) => {
      if (err2 || psRows.length === 0) return res.status(500).send("Player session not found");

      const playerSessionID = psRows[0].playerSessionID;
      const score = psRows[0].score;

      // STEP 1: Find most recent move WITHOUT questionID
      const moveQuery = `
        SELECT playerMoveID, rolledColor
        FROM playermove
        WHERE playerSessionID = ? AND questionID IS NULL
        ORDER BY timeStamp DESC
        LIMIT 1
      `;

      db.query(moveQuery, [playerSessionID], (err3, moveRows) => {
        if (err3 || moveRows.length === 0) return res.status(500).send("No move available to attach question");

        const { playerMoveID, rolledColor } = moveRows[0];

        // STEP 2: Pick a random question
        const questionQuery = `SELECT questionID, questionText FROM question ORDER BY RAND() LIMIT 1`;

        db.query(questionQuery, (err4, questionRows) => {
          if (err4 || questionRows.length === 0) return res.status(500).send("No question available");

          const question = questionRows[0];

          // STEP 3: Attach question to the move
          const updateMoveQuery = `
            UPDATE playermove
            SET questionID = ?
            WHERE playerMoveID = ?
          `;

          db.query(updateMoveQuery, [question.questionID, playerMoveID], (err5) => {
            if (err5) return res.status(500).send("Failed to attach question to move");

            // STEP 4: Fetch answers
            const answerQuery = `
              SELECT answerID, answerText
              FROM answer
              WHERE questionID = ?
            `;

            db.query(answerQuery, [question.questionID], (err6, answers) => {
              if (err6) return res.status(500).send("Failed to fetch answers");

              res.render('question', {
                username,
                character,
                question,
                answers,
                rolledColor,
                score
              });
            });
          });
        });
      });
    });
  });
});

// POST /submit-answer
router.post('/submit-answer', (req, res) => {
  const { playerID, gameSessionID } = req.session;
  const { questionID, answerID } = req.body;

  if (!playerID || !gameSessionID || !questionID || !answerID) {
    return res.status(400).send("Missing data");
  }

  const psQuery = `
    SELECT playerSessionID FROM playersession
    WHERE playerID = ? AND gameSessionID = ?
  `;

  db.query(psQuery, [playerID, gameSessionID], (err, psRows) => {
    if (err || psRows.length === 0) return res.status(500).send("Player session not found");

    const playerSessionID = psRows[0].playerSessionID;

    const checkAnswerQuery = `
      SELECT isCorrect FROM answer WHERE answerID = ? AND questionID = ?
    `;

    db.query(checkAnswerQuery, [answerID, questionID], (err2, answerRows) => {
      if (err2 || answerRows.length === 0) return res.status(400).send("Answer not found");

      const isCorrect = answerRows[0].isCorrect;

      const updateMoveQuery = `
        UPDATE playermove
        SET isCorrect = ?, isCompleted = 1
        WHERE playerSessionID = ? AND questionID = ?
        ORDER BY timeStamp DESC
        LIMIT 1
      `;

      db.query(updateMoveQuery, [isCorrect, playerSessionID, questionID], (err3) => {
        if (err3) return res.status(500).send("Failed to update move");

        if (isCorrect) {
          const updateScoreQuery = `
            UPDATE playersession
            SET score = score + 100
            WHERE playerSessionID = ?
          `;

          db.query(updateScoreQuery, [playerSessionID], (err4) => {
            if (err4) return res.status(500).send("Failed to update score");
            renderResult();
          });
        } else {
          renderResult();
        }

        function renderResult() {
          const moveQuery = `
            SELECT rolledColor
            FROM playermove
            WHERE playerSessionID = ? AND questionID = ?
            ORDER BY timeStamp DESC
            LIMIT 1
          `;

          db.query(moveQuery, [playerSessionID, questionID], (err5, moveRows) => {
            if (err5 || moveRows.length === 0) return res.status(500).send("Could not find rolled color");

            const rolledColor = moveRows[0].rolledColor;
            const username = req.session.username || "Player";

            const characterQuery = `
              SELECT c.name, c.image, c.description, ps.score
              FROM playersession ps
              JOIN \`character\` c ON ps.characterID = c.characterID
              WHERE ps.playerID = ? AND ps.gameSessionID = ?
            `;

            db.query(characterQuery, [playerID, gameSessionID], (err6, charRows) => {
              if (err6 || charRows.length === 0) 
                return res.status(500).send("Character or score fetch failed");

              const character = {
                name: charRows[0].name,
                image: charRows[0].image,
                description: charRows[0].description
              };
              const score = charRows[0].score;

              res.render('question-result', {
                isCorrect,
                rolledColor,
                username,
                character,
                score
              });
            });
          });
        }
      });
    });
  });
});

// POST /complete-move
router.post('/complete-move', (req, res) => {
  const { playerID, gameSessionID } = req.session;

  if (!playerID || !gameSessionID) return res.status(400).send("Missing session");

  const psQuery = `
    SELECT playerSessionID FROM playersession
    WHERE playerID = ? AND gameSessionID = ?
  `;

  db.query(psQuery, [playerID, gameSessionID], (err, psRows) => {
    if (err || psRows.length === 0) return res.status(500).send("Player session not found");

    const playerSessionID = psRows[0].playerSessionID;

    const completeMoveQuery = `
      UPDATE playermove
      SET isCompleted = 1
      WHERE playerSessionID = ?
      ORDER BY timeStamp DESC
      LIMIT 1
    `;

    db.query(completeMoveQuery, [playerSessionID], (err2) => {
      if (err2) return res.status(500).send("Failed to mark move completed");
      res.json({ success: true });
    });
  });
});

module.exports = router;
