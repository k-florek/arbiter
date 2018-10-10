#!/usr/bin/env python3
import csv
import sys
import subprocess as sub
import shlex
import os
import shutil
import time
import sqlite3

id = sys.argv[1]
run_id = sys.argv[2]
path = sys.argv[3]


#get reads
for root,dirs,files in os.walk(path):
    for file in files:
        if id in file:
            if '.fastq' in file:
                if '_R1' in file or '_1' in file:
                    read1 = os.path.join(path,file)
                if '_R2' in file or '_2' in file:
                    read2 = os.path.join(path,file)
                #TODO add bit for unpaired read

#check output path
if os.path.exists('public/results/'+run_id+'/kraken'):
    os.chdir('public/results/'+run_id+'/kraken')
else:
    os.mkdir('public/results/'+run_id)
    os.mkdir('public/results/'+run_id+'/kraken')
    os.chdir('public/results/'+run_id+'/kraken')

#kraken command
cmd_str = '''kraken2 --db bacteria_180803
    --threads 10
    --output {0}.kraken.out
    --paired
    --gzip-compressed {1} {2}'''.format(id,read1,read2)
cmd = shlex.split(cmd_str)
kraken = sub.Popen(cmd,stdout=sub.PIPE,stderr=sub.PIPE).wait()

#run krona
cmd_str = "../../../../lib/KronaTools-2.7/bin/ktImportTaxonomy -t 3 -q 2 {0}.kraken.out -o {0}_krona.html".format(id)
cmd = shlex.split(cmd_str)
kraken = sub.Popen(cmd,stdout=sub.PIPE,stderr=sub.PIPE).wait()

#update database
#setup database
conn = sqlite3.connect('../../../../db/octo.db')
c = conn.cursor()

#update submission status in octo.db
#binary status code for runs:
#[fastqc,kraken,sal,ecoli,strep,ar] = "000000"
#0 - not run
#1 - submitted
#2 - finished
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
