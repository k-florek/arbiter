#!/usr/bin/env python3

import sys,os,time
import subprocess as sub
import shlex
import sqlite3
import json

run_id = sys.argv[1]

#load config variables
with open('config.json') as j:
    config = json.load(j)

database_path=os.path.join(config["db_path"],'octo.db')

while True:
    #get ids and status codes
    db_path = os.path.join(config["db_path"],'octo.db')
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute('''SELECT ISOID,STATUSCODE FROM seq_QC where RUNID = {run_id}'''.format(run_id=run_id))
    rows = c.fetchall()
    conn.close()

    finished = True
    for row in rows:
        if '1' in list(row[1])[0]:
            finished = False
    if finished:
        break
    time.sleep(30)

#run multiqc
multiqc_cmd = shlex.split('multiqc -c ../../../multiqc_config.yaml .')
sub.Popen(multiqc_cmd,cwd='public/results/'+run_id)

#update multiqc status in db
#get machine and date from run_id
machine = run_id.split('_')[0]
date = run_id.split('_')[1]
db_path = os.path.join(config["db_path"],'octo.db')
conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute("UPDATE seq_runs SET FASTQC='x' WHERE MACHINE=? AND DATE=?",(machine,date))
conn.commit()
conn.close()
