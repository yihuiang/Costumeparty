// 1. Import Dependencies:-----------------------------------------
const express = require("express");
const path = require("path");

const bodyParser = require('body-parser');

const session = require('express-session'); 

//2. Initialize the App: 
const app = express();

app.use(session({ 
  secret: 'boardgame', 
  resave: true, 
  saveUninitialized: true 
})); 

app.use(express.urlencoded({ extended: true }));

app.use(bodyParser.json());

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

//import
const db = require('./db');
const mainLandingRoute = require('./routes/MainLanding')(db);
const joinRouter = require('./routes/JoinPage')(db);
const showPlayersRoute = require('./routes/ShowPlayers')(db);
const characterScanRoute = require('./routes/characterScan');
const loadingRoute = require('./routes/Loading')(db);
const gameStatusRoute = require('./routes/GameStatus')(db);
const leaderboardRoute = require('./routes/Leaderboard')(db);
const scannedStatusRouter = require("./routes/scannedstatus");
const diceRoutes = require('./routes/Dice');
const questionRouter = require('./routes/question');
const eliminateScanRouter = require('./routes/eliminatescan');
const eliminatedRouter = require('./routes/eliminated');
const winnerRouter = require('./routes/winner');

//use routes
app.use('/', mainLandingRoute);
app.use('/', joinRouter);
app.use('/', showPlayersRoute);
app.use('/scan', characterScanRoute);
app.use('/', loadingRoute);
app.use('/', gameStatusRoute);
app.use('/', leaderboardRoute);
app.use("/scannedstatus", scannedStatusRouter);
app.use('/', diceRoutes);
app.use('/', questionRouter);
app.use('/eliminatescan', eliminateScanRouter);
app.use('/eliminated',eliminatedRouter);
app.use('/winner',winnerRouter);

//4. Set Up View Engine: 
app.set("views", path.join(__dirname, "views")); 
app.set("view engine", "pug");

//5. Define Routes:-------------------------------------------------
app.get("/main", (req, res) => {
    res.render("MainLanding");
});

app.get("/join", (req, res) => {
  const gameSessionID = req.query.gameSessionID || req.session.gameSessionID;
  res.render("JoinPage", { gameSessionID });
});

app.get('/waitingroom', (req, res) => {
    res.render("WaitingRoom"); 
});

app.get('/eliminate', (req, res) => {
  res.render("eliminate");
});

app.get('/dice', (req, res) => {
  const username = req.session.username || "Player";
  res.render('dice', { username });
});

app.get('/question', (req, res) => {
    res.render("question"); 
});

app.get('/eliminated',(req,res)=>{
  res.render('eliminated', {
    username: req.session.username || 'Player'
  });
});

app.get('/winner', (req, res) => {
  res.render("winner",{
    username: req.session.username || 'Player',
  }); 
});

//6. Start the Server:----------------------------------------------
app.listen(3000, function () {
    console.log("Example app listening on port 3000!");
    });