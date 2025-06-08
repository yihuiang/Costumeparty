const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /question - render question page
router.get('/question', (req, res) => {
  const { playerID, gameSessionID } = req.session;

  if (!playerID || !gameSessionID) return res.status(400).send("Session missing");

  // Select a random question
  db.query(`SELECT * FROM question ORDER BY RAND() LIMIT 1`, (err, questionResults) => {
    if (err) {
      console.error("Error loading question:", err);
      return res.status(500).send("Internal Server Error");
    }

    if (!questionResults.length) return res.status(404).send("No questions available");

    const question = questionResults[0];

    // Get corresponding answers
    db.query(`SELECT * FROM answer WHERE questionID = ?`, [question.questionID], (err2, answerResults) => {
      if (err2) {
        console.error("Error loading answers:", err2);
        return res.status(500).send("Internal Server Error");
      }

      res.render('question', {
        username: req.session.username,
        question,
        answers: answerResults
      });
    });
  });
});

// POST /submit-answer - handle answer selection
router.post('/submit-answer', (req, res) => {
  const { playerID, gameSessionID } = req.session;
  const { questionID, answerID } = req.body;

  if (!playerID || !gameSessionID || !questionID || !answerID) {
    return res.status(400).send("Missing data");
  }

  db.query(
    `SELECT isCorrect FROM answer WHERE answerID = ? AND questionID = ?`,
    [answerID, questionID],
    (err, results) => {
      if (err) {
        console.error("Answer submission error:", err);
        return res.status(500).send("Internal Server Error");
      }

      if (!results.length) return res.status(400).send("Invalid answer");

      const isCorrect = results[0].isCorrect;

      if (isCorrect) {
        res.send("Correct! [TODO: Redirect to next step]");
      } else {
        res.send("Wrong answer! [TODO: Redirect to penalty or retry]");
      }
    }
  );
});

module.exports = router;
