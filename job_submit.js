const sqlite = require('sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const fastc_path = config.fastqc_path;

function scanIsolates (page,res,job_selection,run_id) {
  let machine = run_id.split('_')[0];
  let date = run_id.split('_')[1];
  let run_dir = path.join(run_directory,'WI-'+machine+'-'+date)
  /*
  binary status code for runs:
  [fastqc,kraken,serotyping] = "000"
  0 - not run
  1 - submitted
  2 - finished
  */
  //open the database
  let db = new sqlite.Database('./db/octo.db', openrun);

  //handle errors
  function errors(err){
    if (err) {
      return console.error(err.message);
    }
  }

  /*process
  get statuscodes for each isolate id
  update statuscodes for job submitted
  submit jobs
  render page
  close database
  */

  //open run
  function openrun (err){
    errors(err);
    console.log('Connected to the SQlite database for updates.');
    let fastqc_ids = [];
    for (let key in job_selection){
      if (key.includes('fastqc_check_')) {
        fastqc_ids.push(key.split('_')[2])
      }
    }
    //get statuscodes
    let sql = `SELECT ISOID,STATUSCODE FROM ${run_id}`;
    db.run(sql,,update_codes);
  }

  function update_codes (err,rows) {
    let sql = `UPDATE ${run_id} SET STATUSCODE='${s_code}' WHERE ISOID='${i_id}'`;
  }
/*
    //insert into database
    function insertDB (row){
      //insert row into database
      let sql = `INSERT or IGNORE INTO ${run_id} (ISOID,STATUSCODE,READ1,READ2) VALUES (?,?,?,?)`;
      if (row){
        db.run(sql,row,(err)=>{
          errors(err);
          //remove first item and call again
          return insertDB(rows.shift());
        });
      }else{
        let sql = `SELECT ISOID,STATUSCODE,READ1,READ2 FROM ${run_id} ORDER BY ISOID DESC`;
        db.all(sql,renderPage);
      }
    }
  }
*/
  //render the page
  function renderPage (err,rows) {
    errors(err);
    res.render(page,{isolates:rows,run_id:run_id});
    closedb(err);
  }

  //close Database
  function closedb (err){
    errors(err);
    db.close((err) => {
      errors(err);
      console.log('Successfully updated the database.');
    });
  }
}
