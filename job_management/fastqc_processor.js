const config = require('../config.json');
const child = require('child_process');
const exist = require('../ensureExists');

const run_directory = config.run_dir;

module.exports = function(job){
  let id = job.data['id'];
  let run_id = job.data['run'];
  let path = job.data['run'];

  let fqc_process = child.spawn('../octopy/fastqc.py',[id,run_id,path],{cwd:'../'});

  fqc_process.on('error', function(err){
    if (err){
      return err;
    }
  });
  fqc_process.on('close',function(err){
    if (err){
      return err;
    }
  });

}
