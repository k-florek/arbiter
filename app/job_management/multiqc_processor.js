const config = require('../configs/config.json');
const child = require('child_process');
const exist = require('../ensureExists');

const run_directory = config.run_dir;

module.exports = function(job,done){
  let run_id = job.data['run_id'];

  let ch = child.execFile('skyseq_py/multiqc.py',[run_id]);
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
