const sqlite = require('sqlite3');
const fs = require('fs');

module.exports = {
  update: function() {
    //setup dir scan
    let file_list = [];
    const run_directory = '/run/user/3113/gvfs/smb-share:domain=slhdomain,server=slhdatamiseq,share=data,user=floreknx/CDD/Miseq/'

    //open the database
    let db = new sqlite.Database('./db/octo.db', (err) => {
      if (err) {
        return console.error(err.message);
      }
      console.log('Connected to the SQlite database.');
    });

    //serialize so that each sqlite command is executed before another starts
    db.serialize(function() {
      //create table if none exist
      db.run('CREATE TABLE if not exists seq_runs (ID INTEGER PRIMARY KEY AUTOINCREMENT, MACHINE TEXT NOT NULL, DATE DATE NOT NULL, PATH TEXT UNIQUE NOT NULL)')

      //generate list from read location
      fs.readdirSync(run_directory).forEach(function(file) {
        let path = run_directory+file;
        var stat = fs.statSync(path);

        if (stat && stat.isDirectory()) {
          if (file.includes('WI-')) {
            //console.log(file);
            file_list.push(file);
          }
        }
      });

      //parse list of runs and add to database if not existant
      for (var i = 0; i<file_list.length;i++) {
        let machine = file_list[i].split('-')[1];
        let date = file_list[i].split('-')[2];
        let path = run_directory+file_list[i];
        db.run(`INSERT or IGNORE INTO seq_runs (MACHINE,DATE,PATH) VALUES (?,?,?);`,[machine,date,path], (err) => {
          if (err) {
            return console.error(err.message);
          }
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
