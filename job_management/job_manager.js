const Queue = require('bull');
const path = require('path');

const scu = require('../status_code_updater');
const config = require('../config.json');


//trimmomatic queue
let trimQueue = new Queue('trim');
//kraken queue
let krakenQueue = new Queue('kraken');
//cluster based pipeline for typing/serotyping
let clusterQueue = new Queue('cluster');

const run_directory = config.run_dir;
module.exports.jobSubmit = jobSubmit;

//parse data provided by form and add processes to the queue
function jobSubmit (page,res,job_selection,run_id) {
  //handle errors
  function errors(err){
    if (err) {
      return console.error(err.message);
    }
  }
  //determine information from the provided run_id
  let machine = run_id.split('_')[0];
  let date = run_id.split('_')[1];
  let run_dir = path.join(run_directory,'WI-'+machine+'-'+date)

  //create lists for each cluster job
  let sal_ids = [];
  let ecoli_ids = [];
  let strep_ids = [];
  let ar_ids = [];
  //status for cluster
  clusterJob = false;

  //parse job selection and add ids to selected jobs
  for (let key in job_selection){
    if (key.includes('fastqc_check_')) {
      //add isolate details to trimQueue
      trimQueue.add({id: key.split('_')[2],run: run_id,path: run_dir});
      //update the statuscode
      scu.statusCodeUpdater(run_id,key.split('_')[2],'fastqc','1');
    }
    if (key.includes('kraken_check_')) {
      //add isolate details to krakenQueue
      krakenQueue.add({id: key.split('_')[2],run: run_id,path: run_dir});
      //update the statuscode
      scu.statusCodeUpdater(run_id,key.split('_')[2],'kraken','1');
    }
    //generate id list for cluster jobs
    if (key.includes('sal_check_')) {
      sal_ids.push(key.split('_')[2]);
      clusterJob = true;
      //update the statuscode
      scu.statusCodeUpdater(run_id,key.split('_')[2],'sal','1');
    }
    if (key.includes('ecoli_check_')) {
      ecoli_ids.push(key.split('_')[2]);
      clusterJob = true;
      //update the statuscode
      scu.statusCodeUpdater(run_id,key.split('_')[2],'ecoli','1');
    }
    if (key.includes('strep_check_')) {
      strep_ids.push(key.split('_')[2]);
      clusterJob = true;
      //update the statuscode
      scu.statusCodeUpdater(run_id,key.split('_')[2],'strep','1');
    }
    if (key.includes('ar_check_')) {
      ar_ids.push(key.split('_')[2])
      clusterJob = true;
      //update the statuscode
      scu.statusCodeUpdater(run_id,key.split('_')[2],'ar','1');
    }
  }

  if (clusterJob){
    clusterQueue.add({run_id: run_id, path: run_dir, sal: sal_ids, ecoli: ecoli_ids, strep: strep_ids, ar: ar_ids})
  }
}

//start processing things in the queue
trimQueue.process(4,'./job_management/fastqc_processor.js');
krakenQueue.process(1,'./job_management/kraken_processor.js');
clusterQueue.process(4,'./job_management/cluster_processor.js');
