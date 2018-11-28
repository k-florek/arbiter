
module.exports.statusCodeUpdater = statusCodeUpdater;
module.exports.multiCodeUpdate = multiCodeUpdate;
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
function multiCodeUpdate(run,fastqc_ids, kraken_ids, sal_ids, ecoli_ids, strep_ids, ar_ids, code){
  //build codes for each id
  //create object to hold codes while we are updating them
  let codes = {};
  //get the rows matching this isolate
  let sql = `SELECT ISOID, STATUSCODE FROM ${run}`;
  db.all(sql,(err,rows)=>{
    if(err){
      console.log(err);
    }
    rows.forEach(function(row){
      codes[row['ISOID']] = row['STATUSCODE']
    });

    //update fastqc statuscodes
    fastqc_ids.forEach(function(id){
      codes[id] = replaceAt(0,code,codes[id]);
    });
    //update kraken statuscodes
    kraken_ids.forEach(function(id){
      codes[id] = replaceAt(1,code,codes[id]);
    });
    //update sal statuscodes
    sal_ids.forEach(function(id){
      codes[id] = replaceAt(2,code,codes[id]);
    });
    //update ecoli statuscodes
    ecoli_ids.forEach(function(id){
      codes[id] = replaceAt(3,code,codes[id]);
    });
    //update strep statuscodes
    strep_ids.forEach(function(id){
      codes[id] = replaceAt(4,code,codes[id]);
    });
    //update ar statuscodes
    ar_ids.forEach(function(id){
      codes[id] = replaceAt(5,code,codes[id]);
    });

    rows.forEach(function(row){
      let sql = `UPDATE ${run} SET STATUSCODE=? WHERE ISOID=?`;
      let id = row['ISOID'];
      let statuscode = codes[id];
      db.run(sql,[statuscode,id],(err)=>{
        if(err){console.log(err);}
      });
    });
  });
}

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
      console.log(isolate,statuscode)
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
