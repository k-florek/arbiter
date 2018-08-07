#!/usr/bin/env python3
import csv
import sys
import subprocess as sub
import shlex
import os
import shutil
import time
import sqlite3

reads = sys.argv[1:]
read_pairs = []
ids = []
for i in range(0,len(reads),2):
    read_pairs.append([reads[i],reads[i+1]])

for pair in read_pairs:
    read1 = pair[0]
    read2 = pair[1]
    #get the output path
    machine = os.path.basename(read1).split('-')[2]
    date = os.path.basename(read1).split('-')[3].split('_')[0]
    isoid = os.path.basename(read1).split('-')[0]
    ids.append(isoid)
    run_id = machine+'_'+date
    os.chdir('public/results/'+run_id+'/kraken')
    #kraken command
    cmd_str = '''kraken2 --db bacteria_180803
        --threads 10
        --output {0}.kraken.out
        --paired
        --gzip-compressed {1} {2}'''.format(isoid,read1,read2)
    cmd = shlex.split(cmd_str)
    kraken = sub.Popen(cmd,stdout=sub.PIPE,stderr=sub.PIPE).wait()

    #run krona
    cmd_str = "../../../../lib/KronaTools-2.7/bin/ktImportTaxonomy -t 3 -q 2 {0}.kraken.out -o {0}_krona.html".format(isoid)
    cmd = shlex.split(cmd_str)
    kraken = sub.Popen(cmd,stdout=sub.PIPE,stderr=sub.PIPE).wait()
    os.chdir('../../../../')

#update database
#setup database
conn = sqlite3.connect('db/octo.db')
c = conn.cursor()

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
    kraken_path = '/results/{run_id}/kraken/{id}_krona.html'.format(run_id=run_id,id=id)
    if statuscode[1] == '1':
        newcode = statuscode[0] + '2' + statuscode[2:]
        c.execute('''UPDATE {run_id} SET STATUSCODE = ?,KRAKEN = ? WHERE ISOID = ?'''.format(run_id=run_id),(newcode,kraken_path,id))

#save changes to database
conn.commit()
#close the database
conn.close()
