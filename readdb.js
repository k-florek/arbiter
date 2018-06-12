const sqlite = require('sqlite3');

module.exports = {
  read_db: function(page,res,machinename='',date='') {
    //open the database
    let db = new sqlite.Database('./db/octo.db',sqlite.OPEN_READONLY, (err) => {
      if (err) {
        return console.error(err.message);
      }
      console.log('Connected to the SQlite database.');
    });

    //serialize so that each sqlite command is executed before another starts
    db.serialize(function() {
      //setup select command
      if (machinename==='' && date===''){
        let sql = `SELECT MACHINE,DATE,PATH FROM seq_runs ORDER BY DATE DESC`;

        //select items
        db.all(sql, (err,rows)=>{
          if (err) {
            throw err;
          }
          res.render(page,{runs:rows})
        });

      } else if (machinename!='' && date===''){
        let sql = `SELECT MACHINE,DATE,PATH FROM seq_runs WHERE MACHINE = ?`;
        db.all(sql,[machinename],(err,rows) => {
          if (err) {
            throw err;
          }
          console.log(rows);
          res.render(page,{runs:rows})
        });
      } else {
        let sql = `SELECT MACHINE,DATE,PATH FROM seq_runs WHERE DATE = ?`;
        db.all(sql,[date],(err,rows) => {
          if (err) {
            throw err;
          }
          res.render(page,{runs:rows})
        });
      }

    });
    // close the database connection
    db.close((err) => {
      if (err) {
        return console.error(err.message);
      }
      console.log('Closed the database connection.');
    });
  }
};
