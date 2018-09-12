
module.exports.statusCodeUpdater = statusCodeUpdater;
//function for replacing a specific digit in a statuscode
function replaceAt(index,replacement,string) {
  return string.substr(0, index) + replacement+ string.substr(index + replacement.length);
}

/*
binary status code for runs:
[fastqc,kraken,sal,ecoli,strep,ar] = "000000"
0 - not run
1 - submitted
2 - in progress *not used yet
2 - finished
*/
/*process
get statuscodes for each isolate id
update statuscodes for job submitted
submit jobs
render page
close database
*/
function statusCodeUpdater(run,isolate,job,code){
  //get the rows matching this isolate
  let sql = `SELECT STATUSCODE FROM ${run} WHERE ISOID=?`;
  db.all(sql,[isolate],(err,rows)=>{
    if(err){
      console.log(err);
    }
    //for the rows obtained (should be just 1) update the statuscode
    rows.forEach(function(row){
      let statuscode = row['STATUSCODE'];
      switch(String(job)){
        case 'fastqc':
          statuscode = replaceAt(0,code,statuscode);
          break;
        case 'kraken':
          statuscode = replaceAt(1,code,statuscode);
          break;
        case 'sal':
          statuscode = replaceAt(2,code,statuscode);
          break;
        case 'ecoli':
          statuscode = replaceAt(3,code,statuscode);
          break;
        case 'strep':
          statuscode = replaceAt(4,code,statuscode);
          break;
        case 'ar':
          statuscode = replaceAt(5,code,statuscode);
          break;
      }
      
      //write the statuscode update to the database
      let sql = `UPDATE ${run} SET STATUSCODE=? WHERE ISOID=?`;
      db.run(sql,[statuscode,isolate],(err)=>{
        if(err){
          console.log(err);
      //bad programming call back hell -_-
        }
      });
    });
  });
}
