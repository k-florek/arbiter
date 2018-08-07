const sqlite = require('sqlite3');

module.exports.getRuns = getRuns;

function getRuns (page,res,machinename='',date='') {
  function errors(err){
    if (err) {
      return console.error(err.message);
    }
  }
  //setup select command
  if (machinename==='' && date===''){
    let sql = `SELECT MACHINE,DATE,PATH FROM seq_runs ORDER BY DATE DESC`;

    //select items
    db.all(sql, (err,rows)=>{
      errors(err);
      res.render(page,{runs:rows});
    });

  } else if (machinename!='' && date===''){
    let sql = `SELECT MACHINE,DATE,PATH FROM seq_runs WHERE MACHINE = ? ORDER BY DATE DESC`;
    db.all(sql,[machinename],(err,rows) => {
      errors(err);
      res.render(page,{runs:rows});
    });
  } else {
    let sql = `SELECT MACHINE,DATE,PATH FROM seq_runs WHERE DATE = ? ORDER BY DATE DESC`;
    db.all(sql,[date],(err,rows) => {
      errors(err);
      res.render(page,{runs:rows});
    });
  }
}
