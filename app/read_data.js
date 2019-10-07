/*
Functions to read data from the SQL database
Author: Kelsey Florek
*/
module.exports.getRuns = getRuns;
module.exports.getKits = getKits;
module.exports.getAR = getAR;
module.exports.getIso = getRunIso;

//error handeling function
function errors(err){
  if (err) {
    return console.error(err.message);
  }
}

//--------- getKits ---------
function getKits (page,res,db) {
  //setup select command
  let sql = `SELECT * FROM qc_kits ORDER BY ACTIVE`;
  //select items
  db.all(sql, (err,rows)=>{
    errors(err);
    res.render(page,{runs:rows,username});
});
}

//--------- getRuns ---------
function getRuns (page,res) {
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

//--------- getRunIso ---------
function getRunIso (page,res,run_id) {
  let machine = run_id.split('_')[0];
  let date = run_id.split('_')[1];
  function errors(err){
    if (err) {
      return console.error(err.message);
    }
  }
  //setup select command
  let sql = 'SELECT ISOID,STATUSCODE,READ1,READ2,FASTQC1,FASTQC2,KRAKEN,SALTYPE,STREPTYPE,ECOLITYPE FROM seq_samples WHERE RUNID = ? ORDER BY ISOID ASC';
  //select items
  db.all(sql,[run_id], (err,rows)=>{
    errors(err);
    if (rows == null){
      let rows = {ISOID:'',STATUSCODE:'',READ1:'',READ2:'',FASTQC1:'',FASTQC2:'',KRAKKEN:'',SALTYPE:'',STREPTYPE:'',ECOLITYPE:''};
      console.log(rows);
    }
    res.render(page,{isolates:rows,run_id:run_id})
  });
}

//--------- getAR ---------
function getAR (page,res,run_id,isoid) {
  function errors(err){
    if (err) {
      return console.error(err.message);
    }
  }
  let sql = '';
  if (isoid == null){
    //setup select command
    sql = `SELECT * FROM AR WHERE (RUNID = '${run_id}')`;
  } else {
    //setup select command if we were given an isolate id
    sql = `SELECT * FROM AR WHERE (RUNID = '${run_id}' AND ISOID LIKE '${isoid}%')`;
  }
  db.run(sql,(err)=>{
    errors(err);
    //select items
    db.all(sql, (err,rows)=>{
      errors(err);
      if (rows == null){
        let rows = {ISOID:'',GENE:'',CONTIG:'',GSTART:'',GEND:'',COVERAGE:'',IDENTITY:'',DATABASE:'',ACCESSION:''};
      }
      res.render(page,{genes:rows})
    });
  });
}
