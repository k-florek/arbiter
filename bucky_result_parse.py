#!/usr/bin/env python3
import csv
import sys
import os
import sqlite3

def parseResult(run_id):
    #parse ar
    results_ar = {}
    with open('resistance_analysis.csv','r') as resin:
        reader = csv.reader(resin,delimiter=',')
        for row in reader:
            if "PNUSA" in row or "ARLN" in row:
                results[row[0]] = row[1]
                if row[0] not in ids:
                    ids.append(row[0])
    #parse assembly stats
    assem_stats = {}
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
    sal_sero = {}
    with open('sistr_summary.tsv','r') as salin:
        reader = csv.reader(salin,delimiter='\t')
        for row in reader:
            sal_sero[row[0]] = [row[1],row[2],row[5]]
            if row[0] not in ids:
                ids.append(row[0])

    #compile result into format for database

    #setup database
    conn = sqlite3.connect('db/rundata.db')
    c = conn.cursor()

    #create table in database for run
    c.execute('''CREATE TABLE if not exists {run_id}
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    ISOID TEXT NOT NULL UNIQUE,
    KRAKEN TEXT,
    AR TEXT,
    SEROTYPE TEXT,
    STATS TEXT
    '''.format(run_id=run_id))

    #insert into database
    for id in ids:
        c.execute('''INSERT INTO {run_id}(ISOID,AR,SEROTYPE,STATS) VALUES(?,?,?,?)'''.format(run_id=run_id),(id,results_ar[id],sal_sero[id],assem_stats[id]))

    #close the database
    conn.close()
