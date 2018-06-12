const express = require('express');
const updatedb = require('./updatedb.js');
const readdb = require('./readdb.js');

const path = require('path');
const port = 3000;
const app = express();

//load view engine
app.set('views', path.join(__dirname,'views'));
app.set('view engine', 'pug')
app.locals.pretty = true;

//set public folder
app.use(express.static(path.join(__dirname,'public')));

//Home route
app.get('/', function(req, res){
  readdb.read_db('index',res);
});

app.get('/updatedb', function(req, res){
  updatedb.update();
  readdb.read_db('index',res);
});

app.listen(port,function(){
  console.log('Octopods started on port: '+port);
});
