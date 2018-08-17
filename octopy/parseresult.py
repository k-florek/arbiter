#!/usr/bin/env python3
import csv
import sys
import os
import sqlite3

def parseResult(run_id):
    #init data struct
    assem_stats = {}
    sal_sero = {}
    strep_sero = {}
    ecoli = {}
    ids = []
    #get ids
    for root,dir,file in os.walk("."):
        for item in dir:
            if item:
                ids.append(item)
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
            if '/' not in row[0]:
                sal_sero[row[0]] = '; '.join([row[1],row[2],row[5]])
                if row[0] not in ids:
                    ids.append(row[0])

    #check if dictonary contains all ids, if not set empty
    for id in ids:
        if id not in assem_stats:
            assem_stats[id] = None
        if id not in sal_sero:
            sal_sero[id] = None
        if id not in strep_sero:
            strep_sero[id] = None
        if id not in ecoli:
            ecoli[id] = None

    #setup database
    conn = sqlite3.connect('../../db/octo.db')
    c = conn.cursor()

    #update database
    for id in ids:
        c.execute('''UPDATE {run_id} SET SALTYPE = ?,
            STREPTYPE = ?,
            ECOLITYPE = ?,
            STATS = ?
            WHERE ISOID = ?'''.format(run_id=run_id),(sal_sero[id],strep_sero[id],ecoli[id],assem_stats[id],id))

    #update assembly stats in seq_runs database
    machine = run_id.split('_')[0]
    date = run_id.split('_')[1]
    c.execute('''UPDATE seq_runs SET STATS = 'True' WHERE MACHINE = ? AND DATE = ?''',(machine,date))
    #update submission status in octo.db
    #binary status code for runs:
    #[fastqc,kraken,sal,ecoli,strep,ar] = "000000"
    #0 - not run
    #1 - submitted
    #2 - finished
    for id in ids:
        c.execute('''SELECT * FROM {run_id} WHERE ISOID=?'''.format(run_id=run_id),(id,))
        row = c.fetchone()
        statuscode = row[2]

        #update status code to change submitted to finished
        newcode = ''
        count = 0
        for code in statuscode:
            if count < 2:
                newcode += code
                count += 1
            elif code == '1':
                newcode += '2'
                count += 1
            else:
                newcode += code
                count += 1

        c.execute('''UPDATE {run_id} SET STATUSCODE = ? WHERE ISOID = ?'''.format(run_id=run_id),(newcode,id))

    #save changes to database
    conn.commit()
    #close the database
    conn.close()
