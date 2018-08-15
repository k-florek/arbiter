const sqlite = require('sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const child = require('child_process');
const exist = require('./ensureExists');
const replaceAt = require('./replaceAt');
const jsa = require("js-alert");


const run_directory = config.run_dir;

module.exports.fqcSubmit = fastqcSubmit;

function fastqcSubmit (ids,run_id) {
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
  exist.ensureExists(path.join(result_dir,run_id),readDB);

  function readDB(err){
    errors(err);
    console.log(`Setting up for FastQC on ${run_id}.`);
    let sql = `SELECT ISOID,STATUSCODE,READ1,READ2 FROM ${run_id} ORDER BY ISOID ASC`;
    db.all(sql,setJob);
  }

  function setJob (err,rows){
    reads = [];
    errors(err);
    for (let i = 0;i<rows.length;i++) {
      if (ids.includes(rows[i]['ISOID'])) {
        reads.push(rows[i]['READ1']);
        reads.push(rows[i]['READ2']);
      }
    }
    reads.push('-o');
    reads.push(path.join(result_dir,run_id));
    reads.push('-t');
    reads.push('6');
    let fqc_process = child.spawn('fastqc',reads);
    fqc_process.stderr.on('data',function(data){
      //uncomment for extensive logging
      //console.log(data.toString());
    });
    fqc_process.on('error',finishedFastqc);
    fqc_process.on('close',finishedFastqc);
  }

  function finishedFastqc (code,signal){
    if (code == 0) {
      console.log(`Finished FastQC on ${run_id}.`);
      let sql = `SELECT ISOID,STATUSCODE,READ1,READ2 FROM ${run_id}`;
      db.all(sql,multiqc);
    }
  }
  function multiqc (err){
    errors(err);
    let mqc_process = child.spawn('multiqc '+path.join(result_dir,run_id)+' -o ' +path.join(result_dir,run_id));
    fqc_process.on('error',multiqc_update);
    fqc_process.on('close',multiqc_update);
  }
  function multiqc_update (err){
    errors(err);
    let multiqc_path = path.join(result_dir,run_id);
    let sql = `UPDATE seq_runs SET FASQC = ${multiqc_path} WHERE MACHINE = ? AND DATE = ?`;
    db.run(sql,[machine,date],update_codes)
  }
  function update_codes (err,data) {
    errors(err);
    for (let i = 0; i<data.length;i++){
      if (ids.includes(data[i]['ISOID'])) {
        data[i]['STATUSCODE'] = replaceAt.replaceAt(0,'2',data[i]['STATUSCODE']);
      }
    }
    let rows = [];
    for (let i = 0; i<data.length;i++){
      let isoid = data[i]['ISOID'];
      let statuscode = data[i]['STATUSCODE'];
      let fqc1 = path.basename(data[i]['READ1']);
      let fqc2 = path.basename(data[i]['READ2']);
      let fastqc1 =fqc1.split('.')[0]+'_fastqc.html'
      let fastqc2 =fqc2.split('.')[0]+'_fastqc.html'
      rows.push([isoid,statuscode,fastqc1,fastqc2]);
    }
    updateStatus(rows.shift());

    //insert into database
    function updateStatus (row){
      //insert row into database
      let sql = `UPDATE ${run_id} SET STATUSCODE = ?,FASTQC1 = ?, FASTQC2 = ? WHERE ISOID = ?`;
      if (row){
        db.run(sql,[row[1],row[2],row[3],row[0]],(err)=>{
          errors(err);
          //remove first item and call again
          return updateStatus(rows.shift());
        });
      }else{
        let alertMsg = 'Compleated FastQC on isolates from ' +'WI-'+machine+'-'+date;
        io.emit('message', alertMsg);
      }
    }
  }
}
