// 1. Import Dependencies:-----------------------------------------
const express = require("express");
const path = require("path");

const bodyParser = require('body-parser');



// const session = require('express-session'); 

//2. Initialize the App: 
const app = express();

// app.use(session({ 
//   secret: 'boardgame', 
//   resave: true, 
//   saveUninitialized: true 
// })); 
app.use(express.urlencoded({ extended: true }));

const db = require('./db');
const joinRouter = require('./routes/JoinPage')(db);
const showPlayersRoute = require('./routes/ShowPlayers');
// const waitingRoomRoute = require('./routes/WaitingRoom');
const characterScanRoute = require('./routes/characterScan');


app.use('/', joinRouter);
app.use('/', showPlayersRoute);
// app.use('/', waitingRoomRoute);
app.use('/scan', characterScanRoute);


//3. Set Up Middleware:
app.use(bodyParser.json());


app.use(express.static(path.join(__dirname, "public")));

//4. Set Up View Engine: 
app.set("views", path.join(__dirname, "views")); 
app.set("view engine", "pug");

//5. Define Routes:-------------------------------------------------
app.get("/main", (req, res) => {
    res.render("MainLanding");
});

app.get("/join", (req, res) => {
    res.render("JoinPage");
});

app.get("/showplayers", (req, res)=> {
    res.render("ShowPlayers");
});

app.get('/waitingroom', (req, res) => {
    res.render("WaitingRoom"); 
});

app.get('/characterscan', (req, res)=>{
    res.render("characterScan");
});
// app.get('/waitingroom2', (req, res) => {
//   res.render('waitingroom2');
// });


//6. Start the Server:----------------------------------------------
app.listen(3000, function () {
    console.log("Example app listening on port 3000!");
    });