const sqlite = require('sqlite3');
const path = require('path');

module.exports.getRunStats = getRunStats;

function getRunStats (page,res,run_id) {
  let machine = run_id.split('_')[0];
  let date = run_id.split('_')[1];
  function errors(err){
    if (err) {
      return console.error(err.message);
    }
  }

  //setup select command
  let sql = `SELECT ISOID,STATS FROM ${run_id} ORDER BY ISOID ASC`;
  //select items
  db.all(sql, (err,rows)=>{
    errors(err);
    if (rows == null){
      res.redirect('/')
    }
    if (rows != null){
      //clean data for view
      for (let r = 0;r<rows.length;r++){
        let row = rows[r]
        if (row["STATS"] != null){
          let stats = row["STATS"].split(", ")
          for (let i = 0;i<stats.length;i++) {
            stats[i] = stats[i].split("= ")[1]
          }
          row["STATS"] = stats
          rows[r] = row
        }
      }
      res.render(page,{isolates:rows,run_id:run_id})
    }
  });
}
