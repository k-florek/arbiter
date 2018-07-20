const child = require('child_process');

module.exports.clusterSubmit = clusterSubmit;

function clusterSubmit (run_file) {
  //setup child process to execute bucky submission script
  let fqc_process = child.execFile('./bucky_job.py',run_file,finishedSubmit);
  console.log(`Submitted job to cluster with PID: ${fqc_process.pid}`)
  function finishedSubmit (error,stdout,stderr){
    if (!error) {
      console.log('Finished cluster submit.');
    }else{
      console.log('There was an error during cluster submission.');
      console.log(error);
      console.log(stderr);
    }
  }
}
