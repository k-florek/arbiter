const sqlite = require('sqlite3');
const bcrypt = require('bcrypt');

module.exports.addUser = addUser;
module.exports.findUser = findUser;
module.exports.getUsers = getUsers;
module.exports.deleteUser = deleteUser;

function addUser (user) {
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

function findUser (user) {
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

function getUsers () {
  //setup select command
  let sql = `SELECT username FROM users`;
  //find user
  return new Promise(function(resolve, reject) {
    db.all(sql, (err,rows)=>{
      if (err) {
        reject(err.message);
      }
      let dataOut = [];
      for (let i=0;i<rows.length;i++){
        dataOut.push([rows[i].username])
      }
      resolve(dataOut);
    });
  });
};

function deleteUser (user) {
  //setup select command
  let sql = `DELETE FROM users WHERE username=?`;
  //find user
  return new Promise(function(resolve, reject) {
    db.all(sql,[user], (err,rows)=>{
      if (err) {
        reject(err.message);
      }
      resolve(true);
    });
  });
}
