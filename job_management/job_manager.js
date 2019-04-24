const Queue = require('bull');
const path = require('path');

const scu = require('../skyseq_js/status_code_updater');
const config = require('../config.json');


//fastqc queue
let fastqcQueue = new Queue('fastqc');
//kraken queue
let krakenQueue = new Queue('kraken');
//bucky pipeline for typing/serotyping
let buckyQueue = new Queue('bucky');
//queue for running multiqc
let multiqcQueue = new Queue('multiqc');

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

  //status for bucky
  let buckyJob = false;
  //status for multiqc
  let multiJob = false;
  //parse job selection and add ids to selected jobs
  for (let key in job_selection){
    if (key.includes('fastqc_check_') && !key.includes('fastqc_check_all')) {
      //add isolate details to fastqcQueue
      fastqcQueue.add({id: key.split('_')[2],run: run_id,path: run_dir});
      //add isolate to queue
      fastqc_ids.push(key.split('_')[2]);
      multiJob = true;
    }
    if (key.includes('kraken_check_') && !key.includes('kraken_check_all')) {
      //add isolate details to krakenQueue
      krakenQueue.add({id: key.split('_')[2],run: run_id,path: run_dir});
      //add isolate to queue
      kraken_ids.push(key.split('_')[2]);
    }
    //generate id list for bucky jobs
    if (key.includes('sal_check_') && !key.includes('sal_check_all')) {
      sal_ids.push(key.split('_')[2]);
      buckyJob = true;
    }
    if (key.includes('ecoli_check_') && !key.includes('ecoli_check_all')) {
      ecoli_ids.push(key.split('_')[2]);
      buckyJob = true;
    }
    if (key.includes('strep_check_') && !key.includes('strep_check_all')) {
      strep_ids.push(key.split('_')[2]);
      buckyJob = true;
    }
    if (key.includes('ar_check_') && !key.includes('ar_check_all')) {
      ar_ids.push(key.split('_')[2])
      buckyJob = true;
    }
  }

  //update all of the statuscodes
  scu.multiCodeUpdate(run_id,fastqc_ids, kraken_ids, sal_ids, ecoli_ids, strep_ids, ar_ids,'1')

  if (buckyJob){
    buckyQueue.add({run_id: run_id, path: run_dir})
  }

  if (multiJob){
    multiqcQueue.add({run_id:run_id})
  }

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
  scu.statusCodeUpdater(job.data['run'],job.data['id'],'fastqc','4');
  job.remove();
  console.log(error);
});
fastqcQueue.on('failed', function(job, err){
  // A job failed with reason `err`!
  scu.statusCodeUpdater(job.data['run'],job.data['id'],'fastqc','4');
  job.remove();
  console.log(err)
});

//###########################

//start processing things in the multiqc queue
multiqcQueue.process(1,require('./multiqc_processor'))

//actions for fastqc queue events
multiqcQueue.on('completed', function(job,result){
  //do something on completion
  job.remove();
});
multiqcQueue.on('error', function(error) {
  // An error occured.
  job.remove();
  console.log(error);
});
multiqcQueue.on('failed', function(job, err){
  job.remove();
  console.log(err)
});

//###########################

//start processing things in the kraken queue
krakenQueue.process(1,require('./kraken_processor'));

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
  job.remove();
});
krakenQueue.on('failed', function(job, err){
  // A job failed with reason `err`!
  console.log(err)
  job.remove();
});

//###########################

//start processing things in the bucky queue
buckyQueue.process(1,require('./bucky_processor'));

//actions for bucky queue events
buckyQueue.on('completed', function(job,result){
  //do something on completion
  console.log('Completed bucky job:',job.data['run_id']);
  job.remove();
});
buckyQueue.on('active',function(job,jobPromise){
  //do something when job has started
  console.log('Started bucky job:',job.data['run_id']);
});
buckyQueue.on('error', function(error) {
  // An error occured.
  console.log(error);
  job.remove();
});
buckyQueue.on('failed', function(job, err){
  // A job failed with reason `err`!
  console.log(err)
  job.remove();
});
