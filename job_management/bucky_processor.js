const config = require('../config.json');
const child = require('child_process');
const exist = require('../ensureExists');

const run_directory = config.run_dir;

module.exports = function(job,done){
  let run_id = job.data['run_id'];
  let path = job.data['path'];
  let sal = job.data['sal'];
  let ecoli = job.data['ecoli'];
  let strep = job.data['strep'];
  let ar = job.data['ar'];

  let ch = child.execFile('skyseq_py/bucky_job.py',[run_id,path]);
  ch.stdout.on('data',(data)=>{
    console.log(run_id+' Bucky-TR update: '+data);
  });
  ch.stderr.on('data',(data)=>{
    console.log(run_id+' Bucky-TR error: '+data);
  });
  ch.on('error',(err)=>{
    console.log(run_id+' Bucky-TR error: '+err);
    done(err);
  });
  ch.on('close',(code)=>{
    done(null,code);
  });
}
