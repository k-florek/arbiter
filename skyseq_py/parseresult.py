#!/usr/bin/env python3
import csv,sys,os,shutil,shlex
import subprocess as sub
import sqlite3
from sistr_parser import sistr_parser
from ecoli_parser import ecoh_parser
from ar_compile import ar_parse

def parseResult(run_id,config):
    #init data struct
    sal_sero = {}
    ecoli = {}
    statuscodes = {}

    #get ids and status codes
    db_path = os.path.join(config["db_path"],'skyseq.db')
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute('''SELECT ISOID,STATUSCODE FROM seq_QC where RUNID = {run_id}'''.format(run_id=run_id))
    rows = c.fetchall()
    conn.close()
    for row in rows:
        statuscodes[row[0]] = list(row[1])

    #copy results from staging path to public path
    #copy dir structure
    inputpath = os.path.join(config["job_staging_path"],run_id+'_results/')
    outputpath = 'public/results/'+run_id+'/'
    for (root,dirs,files) in os.walk(inputpath):
        structure = os.path.join(outputpath, root[len(inputpath):])
        if not os.path.isdir(structure):
            os.mkdir(structure)
        else:
            print("Folder already exists!")
    #copyfiles
    inputpath = os.path.join(config["job_staging_path"],run_id+'_results/')
    outputpath = 'public/results/'+run_id+'/'
    for (root,dirs,files) in os.walk(inputpath):
        for file in files:
            shutil.copy2(os.path.join(root,file),os.path.join(outputpath, root[len(inputpath):]))

    #run multiqc
    multiqc_cmd = shlex.split('multiqc -c ../../../multiqc_config.yaml .')
    sub.Popen(multiqc_cmd,cwd='public/results/'+run_id)

    #parse sal serotype
    sistr_parser('public/results/'+run_id)
    with open('public/results/'+run_id+'/sistr_summary.tsv','r') as salin:
        reader = csv.reader(salin,delimiter='\t')
        for row in reader:
            if '/' not in row[0]:
                sal_sero[row[0]] = '; '.join([row[1],row[2],row[5]])
                if row[0] in statuscodes:
                    statuscodes[row[0]][2] = '3'

    #parse ecoli serotype
    ecoh_parser('public/results/'+run_id)
    with open('public/results/'+run_id+'/ecoh_summary.tsv','r') as salin:
        reader = csv.reader(salin,delimiter='\t')
        for row in reader:
            if '/' not in row[0]:
                ecoli[row[0]] = row[1]
                if row[0] in statuscodes:
                    statuscodes[row[0]][3] = '3'

    #parse ar data
    ar_completed_ids = ar_parse(config,run_id)

    #setup database
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    #update database with serotypes
    for id in statuscodes:
        #update sal serotype
        try:
            sal_type = sal_sero[id]
            c.execute('''UPDATE seq_QC SET SALTYPE = ? WHERE ISOID = ? AND RUNID = ?''',(sal_type,id,run_id))
        except KeyError:
            pass

        #update ecoli serotype
        try:
            ecoli_type = ecoli[id]
            c.execute('''UPDATE seq_QC SET ECOLITYPE = ? WHERE ISOID = ? RUNID = ?''',(ecoli_type,id,run_id))
        except KeyError:
            pass

        #update ar statuscode
        if id in ar_completed_ids:
            statuscodes[id][5] = '3'

    #set codes that are still 1 for assembly based functions to failed
    for id in statuscodes:
        idx = 2
        while idx < len(statuscodes[id]):
            if '1' == statuscodes[id][idx]:
                statuscodes[id][idx] = '4'
            idx += 1

    #update statuscodes
    for id in statuscodes:
        code = ''.join(statuscodes[id])
        c.execute('''UPDATE seq_QC SET STATUSCODE = ? WHERE ISOID = ? AND RUNID = ?'''.format(run_id=run_id),(code,id,run_id))

    #update multiqc results
    machine = run_id.split('_')[0]
    date = run_id.split('_')[1]
    c.execute("UPDATE seq_runs SET FASTQC='x' WHERE MACHINE=? AND DATE=?",(machine,date))


    #save changes to database
    conn.commit()
    #close the database
    conn.close()

    #binary status code for runs:
    #[fastqc,kraken,sal,ecoli,strep,ar] = "000000"
    #0 - not run
    #1 - submitted
    #2 - in progress
    #3 - finished
    #4 - error
