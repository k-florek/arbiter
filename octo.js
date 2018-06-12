const express = require('express');
const updatedb = require('./updatedb.js');

const path = require('path');
const port = 3000;
const app = express();

//load view engine
app.set('views', path.join(__dirname,'views'));
app.set('view engine', 'pug')
app.locals.pretty = true;

//set public folder
app.use(express.static(path.join(__dirname,'public')));

app.get('/', function(req, res){
  res.render('index');
});

app.get('/updatedb', function(req, res){
  updatedb.update();
  res.render('index');
});

app.listen(port,function(){
  console.log('Octopods started on port: '+port);
});
