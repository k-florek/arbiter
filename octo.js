const express = require('express');
const updatedb = require('./updatedb.js');
const readdb = require('./readdb.js');
const scaniso = require('./scanIsolates.js');
const js = require('./job_submit.js');
const bodyParser = require('body-parser');

const path = require('path');
const port = 3000;
const app = express();


// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

//load view engine
app.set('views', path.join(__dirname,'views'));
app.set('view engine', 'pug');
app.locals.pretty = true;

//set public folder
app.use(express.static(path.join(__dirname,'public')));

//Home route
app.get('/', function(req, res){
  readdb.read_db('index',res);
});

//By MACHINE
app.get('/machine/:machinename', function(req, res){
  let machinename = req.params.machinename;
  readdb.read_db('index',res,machinename);
});

//By Date
app.get('/date/:date', function(req, res){
  let date = req.params.date;
  readdb.read_db('index',res,'',date);
});

//update database
app.get('/updatedb', function(req, res){
  updatedb.update('index',res);
});

//show run information
app.get('/status/:runid',function(req,res){
  let runid = req.params.runid;
  scaniso.scanIsolates('run',res,runid);
});

//submit jobs
app.post('/status/:runid',function(req,res){
  let runid = req.params.runid;
  js.jobSubmit('run',res,req.body,runid);
});

app.listen(port,function(){
  console.log('Octopods started on port: '+port);
});
