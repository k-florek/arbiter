const config = require('../config.json');
const child = require('child_process');
const exist = require('../ensureExists');

const run_directory = config.run_dir;

module.exports = function(job,done){
  let id = job.data['id'];
  let run_id = job.data['run'];
  let path = job.data['path'];

  let ch = child.execFile('skyseq_py/fastqc.py',[id,run_id,path]);
  ch.stdout.on('data',(data)=>{
    job.progress(data);
  });
  ch.stderr.on('data',(data)=>{
    job.progress(data);
  });
  ch.on('error',(err)=>{
    done(err);
  });
  ch.on('close',(code)=>{
    done(null,code);
  });
}
