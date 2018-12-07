#!/usr/bin/env python3

import sys
import os
import subprocess as sub
import shlex
import sqlite3
import json

id = sys.argv[1]
run_id = sys.argv[2]
path = sys.argv[3]

#load config variables
with open('config.json') as j:
    config = json.load(j)

database_path=os.path.join(config["db_path"],'octo.db')

#path to fwd and reverse read for unpaired only fwd read will be used
fwd_read = ''
rev_read = ''

for root,dirs,files in os.walk(path):
    for file in files:
        if id in file:
            if '.fastq' in file:
                if '_R1' in file or '_1' in file:
                    fwd_read = os.path.join(path,file)
                if '_R2' in file or '_2' in file:
                    rev_read = os.path.join(path,file)
                #TODO add bit for unpaired read

#check if output dir exists
if not os.path.exists('public/results/'+run_id):
    os.mkdir('public/results/'+run_id)
if os.path.exists('public/results/'+run_id+'/'+id):
    outpath = 'public/results/'+run_id+'/'+id
else:
    os.mkdir('public/results/'+run_id+'/'+id)
    outpath = 'public/results/'+run_id+'/'+id

#build command for running fastqc
cmd = f'fastqc {fwd_read} {rev_read} -o {outpath}'
cmd = shlex.split(cmd)
sub.Popen(cmd).wait()

#update database
#setup database
conn = sqlite3.connect(database_path)
c = conn.cursor()

#reformat path to just read name
fwd_read = os.path.basename(fwd_read)
rev_read = os.path.basename(rev_read)

#put fastqc information into database
fastqc1 = fwd_read.split('.')[0]+'_fastqc.html'
fastqc2 = rev_read.split('.')[0]+'_fastqc.html'
c.execute(f'UPDATE {run_id} SET FASTQC1 = ?,FASTQC2 = ? WHERE ISOID = ?',(fastqc1,fastqc2,id))

#save changes to database
conn.commit()
#close the database
conn.close()
