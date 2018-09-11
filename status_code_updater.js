
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
  let sql = `SELECT STATUSCODE FROM ${run} WHERE ISOID=${isolate}`;
  db.all(sql,(err,rows)=>{
    if(err){
      console.log(err);
    }
    //for the rows obtained (should be just 1) update the statuscode
    rows.forEach(function(element){
      statuscode = element['STATUSCODE'];
      switch(job){
        case 'fastqc':
          statuscode = replaceAt(0,code,statuscode);
        case 'kraken':
          statuscode = replaceAt(1,code,statuscode);
        case 'sal':
          statuscode = replaceAt(2,code,statuscode);
        case 'ecoli':
          statuscode = replaceAt(3,code,statuscode);
        case 'strep':
          statuscode = replaceAt(4,code,statuscode);
        case 'ar':
          statuscode = replaceAt(5,code,statuscode);
      }
      //write the statuscode update to the database
      let sql = `UPDATE ${run_id} SET STATUSCODE = ${statuscode} WHERE ISOID = ${isolate}`;
      db.run(sql,(err)=>{
        if(err){
          console.log(err);
      //bad programming call back hell -_-
        }
      });
    });
  });
}
