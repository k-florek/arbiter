/*
Functions to write data to the SQL database
Author: Kelsey Florek
*/
module.exports.addKits = addKits;

//error handeling function
function errors(err){
  if (err) {
    return console.error(err.message);
  }
}

//--------- addKits ---------
function addKits (db,kit_data) {
  //insert row into database
  let sql = ''
  let kit = []
  if (kit_data.kit_name =='Nextera XT') {
    sql = `INSERT INTO qc_kits (ACTIVE,
    NAME,
    LOT,
    EXPIRATION,
    REAGENT_0_NAME,
    REAGENT_0_LOT,
    REAGENT_0_EXPIR,
    REAGENT_1_NAME,
    REAGENT_1_LOT,
    REAGENT_1_EXPIR,
    REAGENT_2_NAME,
    REAGENT_2_LOT,
    REAGENT_2_EXPIR,
    REAGENT_3_NAME,
    REAGENT_3_LOT,
    REAGENT_3_EXPIR,
    REAGENT_4_NAME,
    REAGENT_4_LOT,
    REAGENT_4_EXPIR) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    kit = [true,
      kit_data.kit_name,
      kit_data.kit_lot,
      kit_data.kit_expire,
      kit_data.reagent_0_name,
      kit_data.reagent_0_lot,
      kit_data.reagent_0_expire,
      kit_data.reagent_1_name,
      kit_data.reagent_1_lot,
      kit_data.reagent_1_expire,
      kit_data.reagent_2_name,
      kit_data.reagent_2_lot,
      kit_data.reagent_2_expire,
      kit_data.reagent_3_name,
      kit_data.reagent_3_lot,
      kit_data.reagent_3_expire,
      kit_data.reagent_4_name,
      kit_data.reagent_4_lot,
      kit_data.reagent_4_expire]
    } else {
        sql = `INSERT INTO qc_kits (ACTIVE,
        NAME,
        LOT,
        EXPIRATION) VALUES (?,?,?,?)`
        kit = [true,
          kit_data.kit_name,
          kit_data.kit_lot,
          kit_data.kit_expire]
      }

  return new Promise(function(resolve, reject) {
    db.run(sql,kit,(err)=>{
      if (err) {
        errors(err);
        reject(err.message);
      } else {
        resolve();
      }
    });
  });
}
