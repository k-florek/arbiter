#!/usr/bin/env python3
import csv
import sys
import subprocess as sub
import shlex
import os
import shutil
import time

reads = sys.argv[1:]
read_pairs = []
for i in range(0,len(reads),2):
    read_pairs.append([reads[i],reads[i+1]])

for pair in read_pairs:
    read1 = pair[0]
    read2 = pair[1]
    #get the output path
    machine = os.path.basename(read1).split('-')[2]
    date = os.path.basename(read1).split('-')[3].split('_')[0]
    isoid = os.path.basename(read1).split('-')[0]
    run_id = machine+'_'+date
    os.chdir('public/results/'+run_id+'/kraken')
    #kraken command
    cmd_str = '''kraken2 --db bacteria_180803
        --threads 10
        --output {0}.kraken.out
        --report {0}.report
        --paired
        --gzip-compressed {1} {2}'''.format(isoid,read1,read2)
    cmd = shlex.split(cmd_str)
    kraken = sub.Popen(cmd,stdout=sub.PIPE,stderr=sub.PIPE).wait()

#run krona
