const sqlite = require('sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const run_directory = config.run_dir;

module.exports.scanIsolates = scanIsolates

function scanIsolates (page,res,run_id) {
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
  console.log('Scanning run directory for isolates.');
  let sql = `CREATE TABLE if not exists ${run_id} (ID INTEGER PRIMARY KEY AUTOINCREMENT, ISOID TEXT UNIQUE NOT NULL, STATUSCODE TEXT NOT NULL, READ1 TEXT UNIQUE NOT NULL, READ2 TEXT UNIQUE NOT NULL,FASTQC1 TEXT,FASTQC2 TEXT,KRAKEN TEXT)`;
  db.run(sql,scanfs);

  //handle errors
  function errors(err){
    if (err) {
      return console.error(err.message);
    }
  }

  //scan file system
  function scanfs (err){
    errors(err);
    fs.readdir(run_dir,procfs);
  }

  //process file system and INSERT
  function procfs (err,files){
    let rows = [];
    let statuscode = '000';
    errors(err);
    //loop through each file
    for (let i = 0; i<files.length;i++){
      //initalize vars
      let p = path.join(run_dir,files[i]);
      let stat = fs.statSync(p);
      //check if dir
      if (stat && stat.isFile()) {
        if (files[i].includes('R1_001.fastq.gz')) {
          let isoid = files[i].split('-')[0];
          let read1 = p;
          let read2 = path.join(run_dir,files[i].split('_')[0]+'_'+files[i].split('_')[1]+'_'+files[i].split('_')[2]+'_'+'R2'+'_'+files[i].split('_')[4]);
          if (!rows.includes(isoid)){
            rows.push([isoid,statuscode,read1,read2]);
          }
        }
      }
    }
    insertDB(rows.shift());

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
        let sql = `SELECT ISOID,STATUSCODE,READ1,READ2,FASTQC1,FASTQC2,KRAKEN FROM ${run_id} ORDER BY ISOID ASC`;
        db.all(sql,renderPage);
      }
    }
  }

  //render the page
  function renderPage (err,rows) {
    errors(err);
    console.log('Finished run scan.')
    res.render(page,{isolates:rows,run_id:run_id});
  }
}
