#!/usr/bin/env python3

import sys
import os
import subprocess as sub
import shlex

id = sys.argv[1]
run_id = sys.argv[2]
path = sys.argv[3]

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
if os.path.exists('public/results/'+run_id):
    outpath = 'public/results/'+run_id
else:
    os.mkdir('public/results/'+run_id)
    outpath = 'public/results/'+run_id

#build command for running fastqc
cmd = f'fastqc {fwd_read} {rev_read} -o {outpath}'
cmd = shlex.split(cmd)
sub.Popen(cmd).wait()
