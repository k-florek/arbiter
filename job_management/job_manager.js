const Queue = require('bull');
const path = require('path');

const scu = require('../status_code_updater');
const config = require('../config.json');


//fastqc queue
let fastqcQueue = new Queue('fastqc');
//kraken queue
let krakenQueue = new Queue('kraken');
//cluster based pipeline for typing/serotyping
let clusterQueue = new Queue('cluster');

const run_directory = config.run_dir;
module.exports.jobSubmit = jobSubmit;

let runidList = [];

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
  let run_dir = path.join(run_directory,'WI-'+machine+'-'+date);
  runidList.push(run_id);

  //create lists for each job
  let fastqc_ids = [];
  let kraken_ids = [];
  let sal_ids = [];
  let ecoli_ids = [];
  let strep_ids = [];
  let ar_ids = [];
  //status for cluster
  let clusterJob = false;

  //parse job selection and add ids to selected jobs
  for (let key in job_selection){
    if (key.includes('fastqc_check_')) {
      //add isolate details to fastqcQueue
      fastqcQueue.add({id: key.split('_')[2],run: run_id,path: run_dir});
      //add isolate to queue
      fastqc_ids.push(key.split('_')[2]);
    }
    if (key.includes('kraken_check_')) {
      //add isolate details to krakenQueue
      krakenQueue.add({id: key.split('_')[2],run: run_id,path: run_dir});
      //add isolate to queue
      kraken_ids.push(key.split('_')[2]);
    }
    //generate id list for cluster jobs
    if (key.includes('sal_check_')) {
      sal_ids.push(key.split('_')[2]);
      clusterJob = true;
    }
    if (key.includes('ecoli_check_')) {
      ecoli_ids.push(key.split('_')[2]);
      clusterJob = true;
    }
    if (key.includes('strep_check_')) {
      strep_ids.push(key.split('_')[2]);
      clusterJob = true;
    }
    if (key.includes('ar_check_')) {
      ar_ids.push(key.split('_')[2])
      clusterJob = true;
    }
  }
  clusterJob = false;
  if (clusterJob){
    clusterQueue.add({run_id: run_id, path: run_dir, sal: sal_ids, ecoli: ecoli_ids, strep: strep_ids, ar: ar_ids})
  }

  //update all of the statuscodes
  scu.multiCodeUpdate(run_id,fastqc_ids, kraken_ids, sal_ids, ecoli_ids, strep_ids, ar_ids,'1')

  //reload the run page
  res.redirect(path.join('/status/',run_id));
}

//###########################

//start processing things in the fastqc queue
fastqcQueue.process(4,require('./fastqc_processor'))

//actions for fastqc queue events
fastqcQueue.on('completed', function(job,result){
  //do something on completion
  console.log('Completed fastqc on:',job.data['id'],'from:',job.data['run']);
  scu.statusCodeUpdater(job.data['run'],job.data['id'],'fastqc','3');
  job.remove();
});
fastqcQueue.on('active',function(job,jobPromise){
  //do something when job has started
  console.log('Started fastqc on:',job.data['id'],'from:',job.data['run']);
  scu.statusCodeUpdater(job.data['run'],job.data['id'],'fastqc','2');
});
fastqcQueue.on('error', function(error) {
  // An error occured.
  console.log(error);
});
fastqcQueue.on('failed', function(job, err){
  // A job failed with reason `err`!
  console.log(err)
});

//TODO find a better way to handle the finishing of jobs
//fastqcQueue.on('drained', function(jobs,type){
//  let alertMsg = 'Compleated FastQC on isolates from '+runidList.pop();
//  io.emit('message', alertMsg);
//});

//###########################

//start processing things in the kraken queue
krakenQueue.process('kraken_processor',1,require('./kraken_processor'));

//actions for kraken queue events
krakenQueue.on('completed', function(job,result){
  //do something on completion
  console.log('Completed kraken on:',job.data['id'],'from:',job.data['run']);
  job.remove();
});
krakenQueue.on('active',function(job,jobPromise){
  //do something when job has started
  console.log('Started kraken on:',job.data['id'],'from:',job.data['run']);
});
krakenQueue.on('error', function(error) {
  // An error occured.
  console.log(error);
});
krakenQueue.on('failed', function(job, err){
  // A job failed with reason `err`!
  console.log(err)
});

//###########################

//start processing things in the cluster queue
clusterQueue.process('cluster_processor',1,require('./cluster_processor'));

//actions for cluster queue events
clusterQueue.on('completed', function(job,result){
  //do something on completion
  console.log('Completed cluster job:',job.data['run']);
  job.remove();
});
clusterQueue.on('active',function(job,jobPromise){
  //do something when job has started
  console.log('Started cluster job:',job.data['run']);
});
clusterQueue.on('error', function(error) {
  // An error occured.
  console.log(error);
});
clusterQueue.on('failed', function(job, err){
  // A job failed with reason `err`!
  console.log(err)
});
