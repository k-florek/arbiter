const sqlite = require('sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const fastqcSubmit = require('./fastqc_submit.js');

const run_directory = config.run_dir;

module.exports.jobSubmit = jobSubmit

function jobSubmit (page,res,job_selection,run_id) {
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
    let kraken_ids = [];
    let typing_ids = [];
    for (let key in job_selection){
      if (key.includes('fastqc_check_')) {
        fastqc_ids.push(key.split('_')[2])
      }
      if (key.includes('kraken_check_')) {
        kraken_ids.push(key.split('_')[2])
      }
      if (key.includes('typing_check_')) {
        typing_ids.push(key.split('_')[2])
      }
    }
    //get statuscodes
    res.locals.fastqc_ids = fastqc_ids;
    res.locals.kraken_ids = kraken_ids;
    res.locals.typing_ids = typing_ids;
    let sql = `SELECT ISOID,STATUSCODE,READ1,READ2 FROM ${run_id}`;
    db.all(sql,update_codes);
  }

  function update_codes (err,data) {
    let fqid = res.locals.fastqc_ids;
    let kid = res.locals.kraken_ids;
    let tid = res.locals.typing_ids;
    for (let i = 0; i<data.length;i++){
      if (fqid.includes(data[i]['ISOID'])) {
        data[i]['STATUSCODE'] = '1'+data[i]['STATUSCODE'].slice(1);
      }
      if (kid.includes(data[i]['ISOID'])) {
        data[i]['STATUSCODE'] = data[i]['STATUSCODE'][0]+'1'+data[i]['STATUSCODE'][2];
      }
      if (tid.includes(data[i]['ISOID'])) {
        data[i]['STATUSCODE'] = data[i]['STATUSCODE'].slice(0,2)+'1';
      }
    }
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
        let sql = `SELECT ISOID,STATUSCODE,READ1,READ2 FROM ${run_id} ORDER BY ISOID DESC`;
        db.all(sql,renderPage);
      }
  }
  }
  //render the page
  function renderPage (err,rows) {
    errors(err);
    res.render(page,{isolates:rows,run_id:run_id});
    fastqcSubmit.fqcSubmit(res.locals.fastqc_ids,run_id);
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
