const Queue = require('bull');

//job manager queues
//fastqc queue
let fastqcQueue = new Queue('fastqc');
//kraken queue
let krakenQueue = new Queue('kraken');
//bucky pipeline for typing/serotyping
let buckyQueue = new Queue('bucky');


module.exports.getJobStatus = getJobStatus;

function getJobStatus (page,res) {
  function errors(err){
    if (err) {
      return console.error(err.message);
    }
  }

  let fastqcJobs = [];
  let krakenJobs = [];
  let buckyJobs = [];

  fastqcQueue.getJobs().then(function(result){
    for (let i in result){
      let job = result[i];
      let run_id = job['data']['run'];
      let isoid = job['data']['id'];
      let queue_number = job['id'];
      let status = 'In Queue';
      if (job.hasOwnProperty('processedOn')){
        status = 'In Progress';
      }
      fastqcJobs.push([queue_number,run_id,isoid,status]);
    }

    krakenQueue.getJobs().then(function(result){
      for (let i in result){
        let job = result[i];
        let run_id = job.data.run_id;
        let queue_number = job.id;
        let status = 'In Queue';
        if (job.hasOwnProperty('processedOn')){
          status = 'In Progress';
        }
        krakenJobs.push([queue_number,run_id,isoid,status])
      }
      buckyQueue.getJobs().then(function(result){
        for (let i in result){
          let job = result[i];
          let run_id = job['data']['run_id'];
          let queue_number = job['id'];
          let status = 'In Queue';
          if (job.hasOwnProperty('processedOn')){
            status = 'In Progress';
          }
          buckyJobs.push([queue_number,run_id,status])
        }
        res.render(page,{fastqc:fastqcJobs,kraken:krakenJobs,bucky:buckyJobs})
      });
    });
  });
}
