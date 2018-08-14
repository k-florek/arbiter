const child = require('child_process');

module.exports.clusterSubmit = clusterSubmit;

function clusterSubmit (run_file) {
  let run_id = (run_file+'').split('.')[0];
  let machine = run_id.split('_')[0];
  let date = run_id.split('_')[1];
  //setup child process to execute bucky submission script
  let cluster_process = child.execFile('./bucky_job.py',run_file);
  console.log(`Submitted ${run_id} to cluster with PID: ${cluster_process.pid}`)
  cluster_process.stderr.on('data',function(data){
    console.log(data.toString());
  });
  cluster_process.on('error',finishedSubmit);
  cluster_process.on('close',finishedSubmit);
  function finishedSubmit (error,stdout,stderr){
    if (!error) {
      console.log(`Finished ${run_id} job.`);
      //send alert to viewer
      let alertMsg = 'Compleated Job on isolates from ' +'WI-'+machine+'-'+date;
      io.emit('message', alertMsg);
    }else{
      console.log('There was an error during cluster submission.');
      console.log(error);
      console.log(stderr);
    }
  }
}
