const express = require("express");
const router = express.Router();
const db = require("../db"); // your DB connection

// Mapping from QR string to characterID
const qrCodeToCharacterID = {
  "C01": 1,
  "C02": 2,
  "C03": 3,
  "C04": 4,
  "C05": 5,
  "C06": 6,
  "C07": 7,
  "C08": 8,
  "C09": 9,
  "C10": 10,
  "C11": 11,
  "C12": 12,
  "C13": 13,
  "C14": 14,
  "C15": 15,
  "C16": 16,
  "C17": 17,
  "C18": 18,
};

router.get("/", (req, res) => {
  const qrCode = req.query.characterID;

  if (!qrCode || !qrCodeToCharacterID[qrCode]) {
    return res.status(400).send("Invalid QR code.");
  }

  const characterID = qrCodeToCharacterID[qrCode];

  const sql = "SELECT name, image, description FROM `character` WHERE characterID = ?";
  db.execute(sql, [characterID], (err, results) => {
    if (err) {
      console.error("Error fetching character:", err);
      return res.status(500).send("Internal Server Error");
    }

    if (results.length === 0) {
      return res.status(404).send("Character not found.");
    }

    const character = results[0];

    res.render("characterScan", {
      name: character.name,
      image: character.image,
      description: character.description
    });
  });
});

module.exports = router;
