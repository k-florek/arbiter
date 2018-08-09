const sqlite = require('sqlite3');
const path = require('path');

module.exports.getIso = getIso;

function getIso (page,res,run_id) {
  let machine = run_id.split('_')[0];
  let date = run_id.split('_')[1];
  function errors(err){
    if (err) {
      return console.error(err.message);
    }
  }

  let sql = `CREATE TABLE if not exists ${run_id} (ID INTEGER PRIMARY KEY AUTOINCREMENT,
    ISOID TEXT UNIQUE NOT NULL,
    STATUSCODE TEXT NOT NULL,
    READ1 TEXT UNIQUE NOT NULL,
    READ2 TEXT UNIQUE NOT NULL,
    FASTQC1 TEXT,
    FASTQC2 TEXT,
    KRAKEN TEXT,
    AR,
    SALTYPE TEXT,
    STREPTYPE TEXT,
    ECOLITYPE TEXT,
    STATS TEXT)`;
  db.run(sql,(err)=>{
    errors(err);
    //setup select command
    let sql = `SELECT ISOID,STATUSCODE,READ1,READ2,FASTQC1,FASTQC2,KRAKEN,SALTYPE,STREPTYPE,ECOLITYPE,STATS,AR FROM ${run_id} ORDER BY ISOID ASC`;
    //select items
    db.all(sql, (err,rows)=>{
      errors(err);
      if (rows == null){
        let rows = {ISOID:'',STATUSCODE:'',READ1:'',READ2:'',FASTQC1:'',FASTQC2:'',KRAKKEN:'',SALTYPE:'',STREPTYPE:'',ECOLITYPE:'',STATS:'',AR:''};
        console.log(rows);
      }
      res.render(page,{isolates:rows,run_id:run_id})
    });
  });
}
