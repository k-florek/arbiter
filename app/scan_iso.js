const sqlite = require('sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

const run_directory = config.run_dir;

module.exports.scanIso = scanIso;

function scanIso (page,res,run_id) {
  let machine = run_id.split('_')[0];
  let date = run_id.split('_')[1];
  let run_dir = path.join(run_directory,'WI-'+machine+'-'+date)
  /*
  binary status code for runs:
  [fastqc,kraken,sal,ecoli,strep,ar] = "000000"
  0 - not run
  1 - submitted
  2 - finished
  */
  console.log('Scanning run directory for isolates.');
  //handle errors
  function errors(err){
    if (err) {
      return console.error(err.message);
    }
  }

  fs.readdir(run_dir,procfs);

  //process file system and INSERT
  function procfs (err,files){
    let rows = [];
    //initalize starting statuscode
    let statuscode = '000000';
    errors(err);
    //loop through each file
    for (let i = 0; i<files.length;i++){
      //initalize vars
      let p = path.join(run_dir,files[i]);
      let stat = fs.statSync(p);
      //check if dir
      if (stat && stat.isFile()) {
        if (files[i].includes('R1_001.fastq.gz')) {
          //don't include undetermined reads
          if (files[i].includes('Undetermined')){
            continue;
          }
          let isoid = files[i].split('-')[0];
          let read1 = p;
          let read2 = path.join(run_dir,files[i].split('_')[0]+'_'+files[i].split('_')[1]+'_'+files[i].split('_')[2]+'_'+'R2'+'_'+files[i].split('_')[4]);
          if (!rows.includes(isoid)){
            rows.push([run_id,isoid,statuscode,read1,read2]);
          }
        }
      }
    }
    insertDB(rows.shift());

    //insert into database
    function insertDB (row){
      //insert row into database
      let sql = `INSERT or IGNORE INTO seq_samples (RUNID,ISOID,STATUSCODE,READ1,READ2) VALUES (?,?,?,?,?)`;
      if (row){
        db.run(sql,row,(err)=>{
          errors(err);
          //remove first item and call again
          return insertDB(rows.shift());
        });
      }else{
        let sql = `SELECT ISOID,STATUSCODE,READ1,READ2,FASTQC1,FASTQC2,KRAKEN FROM seq_samples where RUNID = '${run_id}' ORDER BY ISOID ASC`;
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
