
//third-party modules
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const sqlite = require('sqlite3');
const nodeCleanup = require('node-cleanup');
const fs = require('fs-extra');
const redis = require('redis');
const path = require('path');

//local modules
const updatedb = require('./skyseq_js/updatedb');
const rd = require('./skyseq_js/read_data');
const wd = require('./skyseq_js/write_data');

const scaniso = require('./skyseq_js/scan_iso');
const js = require('./job_management/job_manager');
const jobQueue = require('./skyseq_js/get_jobQueue');
const login = require('./skyseq_js/login');

//configuration file
const config = require('./config.json');
//database configuration file
const database = require('./database.json');

//setup redis database for job management
var client = redis.createClient();

//setup express listening on port 3000
const port = 3000;
const app = express();
let server = require('http').Server(app);
io = require('socket.io').listen(server);

//open the database
let env = process.argv[2] || 'dev';
switch (env) {

    case 'dev':
        db = new sqlite.Database(path.join(database.dev.filename), (err) => {
          if (err) {
            return console.error(err.message);
          }
          console.log('Connected to the SQlite database.');
        });
      break;

    case 'prod':
        db = new sqlite.Database(path.join(database.prod.filename), (err) => {
          if (err) {
            return console.error(err.message);
          }
          console.log('Connected to the SQlite database.');
        });
      break;
}


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

// initialize cookie-parser to allow us access the cookies stored in the browser.
app.use(cookieParser());

// initialize express-session to allow us track the logged-in user across sessions
app.use(session({
  key: 'user_sid',
  secret: "the most secret of secrets",
  resave: false,
  saveUninitialized: false,
  cookie: {expires: 60000 * 60 * 1}
}));

// This middleware will check if user's cookie is still saved in browser and user is not set, then automatically log the user out.
// This usually happens when you stop your express server after login, your cookie still remains saved in the browser.
app.use((req, res, next) => {
    if (req.cookies.user_sid && !req.session.user) {
        res.clearCookie('user_sid');
    }
    next();
});

//set public folder
app.use(express.static(path.join(__dirname,'public')));

//authentication
var checkAuth = (req,res,next) => {
  //check if session.user and cookie sid exist if not send to login
  if (req.session.user && req.cookies.user_sid) {
        next();
    } else {
        res.redirect('/login');
    }
}

//user sign up routing
app.route('/adduser')
    //load page for adding a user
    .get( (req, res) => {
        res.render('adduser',{message:'Please enter Username and Password'});
    })
    //submit data to add user
    .post( (req, res) => {
        if (req.body.password_1 != req.body.password_2) {
          res.render('adduser',{message:'Passwords don\'t match'});
        }
        login.addUser(db,{
            name: req.body.username,
            password: req.body.password_1
        })
        .then(user => {
            res.redirect('/');
        })
        .catch(error => {
            res.redirect('/adduser');
        });
    })

//user login
app.route('/login')
  .get( (req, res) => {
    res.render('login',{message:'Please sign in'});
  })
  .post( (req, res) => {
    let user_login = {name:req.body.user,password:req.body.password}
    login.findUser(db,user_login)
      .then(status => {
        if (status){
          req.session.user = req.body.user;
          res.redirect('/');
        } else {
          res.render('login',{message:'Bad Username or Password'});
        }
      });
  })

//logout current user
app.get('/logout', function (req,res) {
  res.clearCookie('user_sid');
  res.redirect('/login');
});

//home dashboard route
app.get('/',checkAuth, function(req, res){
  username = req.session.user;
  res.render('index',{username});
});

//-----------main dashboard routing-------------------

//list completed sequencing runs
app.get('/seqruns',checkAuth, function(req, res){
  user = req.session.user;
  rd.getRuns('seq_runs',res);
});

//list current job queue
app.get('/job_queue',checkAuth,function(req,res){
  jobQueue.getJobStatus('job_queue',res);
});

//reagent kits
app.route('/add_kit')
  .get(checkAuth,(req,res) => {
    res.render('add_kit');
  })
  //submit data to add user
  .post( (req, res) => {
    let formData = req.body;
    wd.addKits(db,formData)
      .then(()=>{
        res.render('add_kit');
      });
  })

//old routes, keeping until updated
/*
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
  db.run(`DELETE FROM seq_samples WHERE RUNID = '${run_id}'`,(err) => {
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
  db.run(`DELETE FROM seq_samples WHERE RUNID = ? AND ISOID=?`,[req.params.runid, req.params.isoid], (err) => {
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
*/
server.listen(port,function(){
  console.log('SkySeq started on port: '+port);
});

app.use(function (req, res, next) {
  res.status(404).send("Sorry can't find that!")
})
