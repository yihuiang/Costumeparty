const express = require('express');
const router = express.Router();

module.exports = (db) => {

  // GET /scan-character?nfcUID=xxx
    router.get('/scan-character', async (req, res) => {
    const { nfcUID } = req.query;

    try {
        const [rows] = await db.promise().query(
        'SELECT name, image FROM character WHERE nfcUID = ?',
        [nfcUID]
        );

        if (rows.length === 0) {
        return res.render('CharacterScan', { character: null });
        }

        res.render('CharacterScan', { character: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
    });


  return router;
};
