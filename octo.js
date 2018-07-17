const express = require('express');
const updatedb = require('./updatedb');
const getruns = require('./get_runs');
const getiso = require('./get_iso');
const scaniso = require('./scan_iso');
const session = require('express-session');
const js = require('./job_submit');
const bodyParser = require('body-parser');
const sqlite = require('sqlite3');


const path = require('path');
const port = 3000;
const app = express();
let server = require('http').Server(app);
io = require('socket.io').listen(server);

//open the database
db = new sqlite.Database('./db/octo.db', (err) => {
  if (err) {
    return console.error(err.message);
  }
  db.run(`CREATE TABLE if not exists seq_runs (ID INTEGER PRIMARY KEY AUTOINCREMENT, MACHINE TEXT NOT NULL, DATE DATE NOT NULL, PATH TEXT UNIQUE NOT NULL)`, (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Connected to the SQlite database.');
  });
});
//on terminate close Database
process.on('SIGINT', () => {
    console.log('Disconnecting the SQlite database.')
    db.close();
});

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

//load view engine
app.set('views', path.join(__dirname,'views'));
app.set('view engine', 'pug');
app.locals.pretty = true;

//start session
app.use(session({secret: "123456"}));

//set public folder
app.use(express.static(path.join(__dirname,'public')));

//authentication
function checkAuth(req,res,next){
  if(!req.session.user_id){
    res.redirect('/login');
  } else {
    next();
  }
}

app.post('/login', function (req, res) {
  var post = req.body;
  if (post.user === 'cddbact' && post.password === '465') {
    req.session.user_id = 'cddbact';
    res.redirect('/');
  } else {
    res.render('login',{message:'Bad Username or Password'});
  }
});

app.get('/login', function (req, res) {
  res.render('login',{message:'Please sign in'});
});

app.get('/logout', function (req,res) {
  delete req.session.user_id;
  res.redirect('/login');
});

//Home route
app.get('/',checkAuth, function(req, res){
  getruns.getRuns('index',res);
});

//By MACHINE
app.get('/machine/:machinename',checkAuth, function(req, res){
  let machinename = req.params.machinename;
  getruns.getRuns('index',res,machinename);
});

//By Date
app.get('/date/:date',checkAuth, function(req, res){
  let date = req.params.date;
  getruns.getRuns('index',res,'',date);
});

//update database
app.get('/updatedb',checkAuth, function(req, res){
  updatedb.update('index',res);
});

//show run information
app.get('/status/:runid',checkAuth, function(req,res){
  let runid = req.params.runid;
  getiso.getIso('run',res,runid);
});

//update run isolates
app.get('/status/updatedb/:runid',checkAuth, function(req,res){
  let runid = req.params.runid;
  scaniso.scanIso('run',res,runid);
});

//submit jobs
app.post('/status/:runid',checkAuth, function(req,res){
  let runid = req.params.runid;
  js.jobSubmit('run',res,req.body,runid);
});

server.listen(port,function(){
  console.log('Octopods started on port: '+port);
});
