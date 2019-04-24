const sqlite = require('sqlite3');
const path = require('path');

module.exports.getAR = getAR;

function getAR (page,res,run_id,isoid) {
  function errors(err){
    if (err) {
      return console.error(err.message);
    }
  }
  let sql = '';
  if (isoid == null){
    //setup select command
    sql = `SELECT * FROM AR WHERE (RUNID = '${run_id}')`;
  } else {
    //setup select command if we were given an isolate id
    sql = `SELECT * FROM AR WHERE (RUNID = '${run_id}' AND ISOID LIKE '${isoid}%')`;
  }
  db.run(sql,(err)=>{
    errors(err);
    //select items
    db.all(sql, (err,rows)=>{
      errors(err);
      if (rows == null){
        let rows = {ISOID:'',GENE:'',CONTIG:'',GSTART:'',GEND:'',COVERAGE:'',IDENTITY:'',DATABASE:'',ACCESSION:''};
      }
      res.render(page,{genes:rows})
    });
  });
}
