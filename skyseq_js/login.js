const sqlite = require('sqlite3');
const bcrypt = require('bcrypt');

module.exports.addUser = addUser;
module.exports.findUser = findUser;

function addUser (database,user) {
  const salt = bcrypt.genSaltSync();
  user.password = bcrypt.hashSync(user.password, salt);

  //setup insert command
  let sql = `INSERT or IGNORE INTO users (username,password) VALUES (?,?)`;
  //insert user
  return new Promise(function(resolve, reject) {
    db.run(sql,[user.name,user.password],(err)=>{
      if (err) {
        reject(err.message);
      } else {
        resolve();
      }
    });
  });
};

function findUser (database,user) {
  //setup select command
  let sql = `SELECT * FROM users WHERE username = '${user.name}'`;
  //find user
  return new Promise(function(resolve, reject) {
    db.all(sql, (err,rows)=>{
      if (err) {
        reject(err.message);
      }
      row = rows[0]
      if(row){
        resolve(bcrypt.compareSync(user.password,row.password));
      } else {
        resolve(false);
      }
    });
  });
};
