const sqlite = require('sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('../configs/config.json');

const run_directory = config.run_dir;

module.exports.update = update

function update (page,res) {

  //handle errors
  function errors(err){
    if (err) {
      return console.error(err.message);
    }
  }
  console.log('Updating runs.');

  //scan run directory for new runs
  fs.readdir(run_directory,procfs);

  //process file system and INSERT
  function procfs (err,files){
    let rows = [];
    errors(err);
    //loop through each file
    for (let i = 0; i<files.length;i++){
      //initalize vars
      let p = path.join(run_directory,files[i]);
      let stat = fs.statSync(p);
      //check if dir
      if (stat && stat.isDirectory()) {
          if (files[i].includes('WI-')) {
            //console.log(file);
            let machine = files[i].split('-')[1];
            let date = files[i].split('-')[2];
            rows.push([machine,date,p]);
          }
      }
    }
    insertDB(rows.shift());

    //insert into database
    function insertDB (row){
      //insert row into database
      let sql = `INSERT or IGNORE INTO seq_runs (MACHINE,DATE,PATH) VALUES (?,?,?)`;
      if (row){
        db.run(sql,row,(err)=>{
          errors(err);
          //remove first item and call again
          return insertDB(rows.shift());
        });
      }else{
        let sql = `SELECT MACHINE,DATE,PATH FROM seq_runs ORDER BY DATE DESC`;
        db.all(sql,renderPage);
      }
    }
  }

  //render the page
  function renderPage (err,rows) {
    errors(err);
    console.log('Finished updating runs.')
    res.redirect('/');
  }
}
