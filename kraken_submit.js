const sqlite = require('sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const child = require('child_process');
const exist = require('./ensureExists');
const replaceAt = require('./replaceAt');


const run_directory = config.run_dir;

module.exports.krakenSubmit = krakenSubmit;

function krakenSubmit (ids,run_id) {
  let machine = run_id.split('_')[0];
  let date = run_id.split('_')[1];
  let run_dir = path.join(run_directory,'WI-'+machine+'-'+date)
  //handle errors
  function errors(err){
    if (err) {
      return console.error(err.message);
    }
  }
  //determine if results file exists in run dir, if not create it
  let result_dir = path.join(__dirname,'/public/results/');
  exist.ensureExists(path.join(result_dir,run_id), function(err) {
    errors(err);
    result_dir = path.join(__dirname,'/public/results/');
    exist.ensureExists(path.join(result_dir,run_id,'kraken'),readDB);
  });

  function readDB(err){
    errors(err);
    console.log(`Setting up ${run_id} for Kraken.`);
    let sql = `SELECT ISOID,READ1,READ2 FROM ${run_id} ORDER BY ISOID ASC`;
    db.all(sql,setJob);
  }
  //craft execution command
  function setJob (err,rows){
    errors(err);
    reads = [run_id]
    for (let i = 0;i<rows.length;i++) {
      if (ids.includes(rows[i]['ISOID'])) {
        reads.push(rows[i]['READ1']);
        reads.push(rows[i]['READ2']);
      }
    }
    let kraken_process = child.execFile('./octoKraken.py',reads);
    kraken_process.stderr.on('data',function(data){
      console.log(data.toString());
    });
    kraken_process.on('error',finishedKraken);
    kraken_process.on('close',finishedKraken);
    function finishedKraken (error,stdout,stderr){
      if (!error) {
        console.log('Finished kraken on '+run_id);
        //send alert to viewer
        let alertMsg = 'Compleated Kraken on isolates from ' +'WI-'+machine+'-'+date;
        io.emit('message', alertMsg);
      }else{
        console.log('There was an error when starting kraken on '+run_id);
        console.log(error);
        console.log(stderr);
      }
    }
  }
}
