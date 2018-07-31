#!/usr/bin/env python3
import csv
import sys
import os
import sqlite3

def parseResult(run_id):
    #init data struct TODO develop data structure class to hold information for this
    results_ar = {}
    assem_stats = {}
    sal_sero = {}
    strep_sero = {}
    ecoli = {}
    ids = []
    #parse ar
    with open('resistance_analysis.csv','r') as resin:
        reader = csv.reader(resin,delimiter=',')
        for row in reader:
            if "PNUSA" in row[0] or "ARLN" in row[0]:
                if row[0] in results_ar:
                    results_ar[row[0]] = '; '.join([results_ar[row[0]],row[1]])
                else:
                    results_ar[row[0]] = row[1]
                if row[0] not in ids:
                    ids.append(row[0])

    #parse assembly stats
    for id in ids:
        with open('{0}/{0}_assembly.stats'.format(id)) as statin:
            result = ''
            for line in statin:
                if "sum" in line:
                    result += line + ', '
                elif "N50" in line:
                    result += line.split(',')[0] + ', '
                elif "N_count" in line:
                    result += line + ', '
                elif "Gaps" in line:
                    result += line
            assem_stats[id] = result
    #parse sal serotype
    with open('sistr_summary.tsv','r') as salin:
        reader = csv.reader(salin,delimiter='\t')
        for row in reader:
            sal_sero[row[0]] = '; '.join([row[1],row[2],row[5]])
            if row[0] not in ids:
                ids.append(row[0])

    #check if dictonary contains all ids, if not set empty
    for id in ids:
        if id not in results_ar:
            results_ar[id] = None
        if id not in assem_stats:
            assem_stats[id] = None
        if id not in sal_sero:
            sal_sero[id] = None
        if id not in strep_sero:
            strep_sero[id] = None
        if id not in ecoli:
            ecoli[id] = None

    #setup database
    conn = sqlite3.connect('../../db/rundata.db')
    c = conn.cursor()

    #create table in database for run
    c.execute('''CREATE TABLE if not exists {run_id}
    (ID INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    ISOID TEXT NOT NULL UNIQUE,
    AR TEXT,
    SALTYPE TEXT,
    STREPTYPE TEXT,
    ECOLITYPE TEXT,
    STATS TEXT)
    '''.format(run_id=run_id))

    #insert into database TODO add checking for existing rows
    for id in ids:
        c.execute('''INSERT OR REPLACE INTO {run_id}(ISOID,AR,SALTYPE,STREPTYPE,ECOLITYPE,STATS) VALUES(?,?,?,?)'''.format(run_id=run_id),(id,results_ar[id],sal_sero[id],strep_sero[id],ecoli[id],assem_stats[id]))
    #save changes to database
    conn.commit()
    #close the database
    conn.close()

    #update submission status in octo.db
    #binary status code for runs:
    #[fastqc,kraken,sal,ecoli,strep,ar] = "000000"
    #0 - not run
    #1 - submitted
    #2 - finished
    conn = sqlite3.connect('../../db/octo.db')
    c = conn.cursor()
    for id in ids:
        c.execute('''SELECT * FROM {run_id} WHERE ISOID=?'''.format(run_id=run_id),[id])
        row = c.fetchone()
        statuscode = row[2]

        #update status code to change submitted to finished
        newcode = ''
        c = 0
        for code in statuscode:
            if c < 2:
                newcode += code
                c += 1
            elif code == 1:
                newcode += '2'
                c += 1
            else:
                newcode += code
                c += 1

        c.execute('''UPDATE {run_id} SET STATUSCODE = ? WHERE ISOID = ?'''.format(run_id=run_id),[newcode,id])

    #save and close
    conn.commit()
    conn.close()
