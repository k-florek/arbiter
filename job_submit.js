const sqlite = require('sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const fastqcSubmit = require('./fastqc_submit');
const replaceAt = require('./replaceAt')

const run_directory = config.run_dir;

module.exports.jobSubmit = jobSubmit;

function jobSubmit (page,res,job_selection,run_id) {
  //handle errors
  function errors(err){
    if (err) {
      return console.error(err.message);
    }
  }

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
  /*process
  get statuscodes for each isolate id
  update statuscodes for job submitted
  submit jobs
  render page
  close database
  */
  let fastqc_ids = [];
  let kraken_ids = [];
  let sal_ids = [];
  let ecoli_ids = [];
  let strep_ids = [];
  let ar_ids = [];
  for (let key in job_selection){
    if (key.includes('fastqc_check_')) {
      fastqc_ids.push(key.split('_')[2])
    }
    if (key.includes('kraken_check_')) {
      kraken_ids.push(key.split('_')[2])
    }
    if (key.includes('sal_check_')) {
      sal_ids.push(key.split('_')[2])
    }
    if (key.includes('ecoli_check_')) {
      ecoli_ids.push(key.split('_')[2])
    }
    if (key.includes('strep_check_')) {
      strep_ids.push(key.split('_')[2])
    }
    if (key.includes('ar_check_')) {
      ar_ids.push(key.split('_')[2])
    }
  }
  //set local variables to status codes
  res.locals.fastqc_ids = fastqc_ids;
  res.locals.kraken_ids = kraken_ids;
  res.locals.sal_ids = sal_ids;
  res.locals.ecoli_ids = ecoli_ids;
  res.locals.strep_ids = strep_ids;
  res.locals.ar_ids = ar_ids;
  let sql = `SELECT ISOID,STATUSCODE,READ1,READ2 FROM ${run_id}`;
  db.all(sql,update_codes);

  function update_codes (err,data) {
    //get statuscodes from local variables
    let fqid = res.locals.fastqc_ids;
    let kid = res.locals.kraken_ids;
    let salid = res.locals.sal_ids;
    let eid = res.locals.ecoli_ids;
    let stid = res.locals.strep_ids;
    let arid = res.locals.ar_ids;
    //set statuscodes for each specific job as 'submitted (1)'
    for (let i = 0; i<data.length;i++){
      if (fqid.includes(data[i]['ISOID'])) {
        data[i]['STATUSCODE'] = replaceAt.replaceAt(0,'1',data[i]['STATUSCODE'])
      }
      if (kid.includes(data[i]['ISOID'])) {
        data[i]['STATUSCODE'] = replaceAt.replaceAt(1,'1',data[i]['STATUSCODE'])
      }
      if (salid.includes(data[i]['ISOID'])) {
        data[i]['STATUSCODE'] = replaceAt.replaceAt(2,'1',data[i]['STATUSCODE'])
      }
      if (eid.includes(data[i]['ISOID'])) {
        data[i]['STATUSCODE'] = replaceAt.replaceAt(3,'1',data[i]['STATUSCODE'])
      }
      if (stid.includes(data[i]['ISOID'])) {
        data[i]['STATUSCODE'] = replaceAt.replaceAt(4,'1',data[i]['STATUSCODE'])
      }
      if (arid.includes(data[i]['ISOID'])) {
        data[i]['STATUSCODE'] = replaceAt.replaceAt(5,'1',data[i]['STATUSCODE'])
      }

    }
    //set up database update
    let rows = [];
    for (let i = 0; i<data.length;i++){
      let isoid = data[i]['ISOID'];
      let statuscode = data[i]['STATUSCODE'];
      let read1 = data[i]['READ1'];
      let read2 = data[i]['READ2'];
      rows.push([isoid,statuscode,read1,read2]);
    }
    insertDB(rows.shift());

    //insert into database
    function insertDB (row){
      //insert row into database
      let sql = `UPDATE ${run_id} SET STATUSCODE = ? WHERE ISOID = ?`;
      if (row){
        db.run(sql,[row[1],row[0]],(err)=>{
          errors(err);
          //remove first item and call again
          return insertDB(rows.shift());
        });
      }else{
        res.redirect(path.join('/status/',run_id));
        fastqcSubmit.fqcSubmit(res.locals.fastqc_ids,run_id);
      }
    }
  }
}
