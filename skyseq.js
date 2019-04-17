const express = require('express');
//local modules
const updatedb = require('./updatedb');
const getruns = require('./get_runs');
const getiso = require('./get_iso');
const scaniso = require('./scan_iso');
const js = require('./job_management/job_manager');
const jobQueue = require('./get_jobQueue');
const getAR = require('./get_ar');

//standard modules
const session = require('express-session');
const bodyParser = require('body-parser');
const sqlite = require('sqlite3');
const nodeCleanup = require('node-cleanup');
const fs = require('fs-extra');
const redis = require('redis');
const path = require('path');

//configuration file
const config = require('./config.json');

//setup redis database for job management
var client = redis.createClient();

//setup express listening on port 3000
const port = 3000;
const app = express();
let server = require('http').Server(app);
io = require('socket.io').listen(server);

//open the database
db = new sqlite.Database(path.join(config.db_path,'skyseq.db'), (err) => {
  if (err) {
    return console.error(err.message);
  }
  db.run(`CREATE TABLE if not exists seq_runs (ID INTEGER PRIMARY KEY AUTOINCREMENT, MACHINE TEXT NOT NULL, DATE DATE NOT NULL, PATH TEXT UNIQUE NOT NULL,FASTQC TEXT,KRAKEN TEXT,AR TEXT)`, (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Connected to the SQlite database.');
  });
});
//on terminate cleanup
nodeCleanup(function (exitCode,signal){
  //close the database
  db.close();
}, {ctrl_C: "Keyboard interuption signal, exiting.",uncaughtException: "There was an error:"
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
app.use(session({secret: "123456",resave: true,saveUninitialized: true}));

//set public folder
app.use(express.static(path.join(__dirname,'public')));

//authentication
function checkAuth(req,res,next){
  if(!req.session.user_id){
    //temp skip login
    //req.session.user_id = 'cddbact';
    //res.redirect('/login');
    res.redirect('/login');
  } else {
    next();
  }
}

//login function TODO: change to more secure format
app.post('/login', function (req, res) {
  var post = req.body;
  if (post.user === 'cddbacti' && post.password === '465') {
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

//update database
app.get('/updatedb',checkAuth, function(req, res){
  updatedb.update('index',res);
});

//show run information
app.get('/status/:runid',checkAuth, function(req,res){
  let runid = req.params.runid;
  getiso.getIso('run',res,runid);
});

//get ar results
app.get('/ar_results/:runid',checkAuth, function(req,res){
  let runid = req.params.runid;
  getAR.getAR('ar',res,runid)
});
app.get('/ar_results/:runid/:isoid',checkAuth, function(req,res){
  let runid = req.params.runid;
  let isoid = req.params.isoid;
  getAR.getAR('ar',res,runid,isoid)
});

//show job queue
app.get('/job_queue',checkAuth,function(req,res){
  jobQueue.getJobStatus('job_queue',res);
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

//delete a record from runs
app.get('/delete/:machine/:date', function(req,res){
  db.run(`DELETE FROM seq_runs WHERE MACHINE=? AND DATE=?`,[req.params.machine,req.params.date], (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Deleted '+req.params.machine+'_'+req.params.date);
    res.redirect('/');
  });
  let run_id = req.params.machine+'_'+req.params.date
  db.run(`DELETE FROM ${run_id}`,(err) => {
    if (err) {
      return console.error(err.message);
    }
    db.run(`DELETE FROM AR WHERE RUNID = ?`,[run_id],(err) => {
      fs.remove(`public/results/${run_id}`,(err) => {
        if (err){
          console.error(err.message);
        }
      });
    });
  });
});

//delete a record from isolates
app.get('/status/:runid/delete/:isoid', function(req,res){
  db.run(`DELETE FROM seq_QC WHERE RUNID = ? AND ISOID=?`,[req.params.runid, req.params.isoid], (err) => {
    if (err) {
      return console.error(err.message);
    }
    db.run(`DELETE FROM AR WHERE RUNID = ? AND ISOID = ?`,[req.params.runid,req.params.isoid], (err) => {
      if (err) {
        return console.error(err.message);
      }
      console.log('Deleted '+req.params.isoid+' from '+req.params.runid);
      res.redirect('/status/'+req.params.runid);
    });
  });
});

server.listen(port,function(){
  console.log('SkySeq started on port: '+port);
});

app.use(function (req, res, next) {
  res.status(404).send("Sorry can't find that!")
})
