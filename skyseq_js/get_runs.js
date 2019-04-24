const sqlite = require('sqlite3');

module.exports.getRuns = getRuns;

function getRuns (page,res,username) {
  function errors(err){
    if (err) {
      return console.error(err.message);
    }
  }
  //setup select command
  let sql = `SELECT * FROM seq_runs ORDER BY DATE DESC`;
  //select items
  db.all(sql, (err,rows)=>{
    errors(err);
    res.render(page,{runs:rows,username});
  });
}
