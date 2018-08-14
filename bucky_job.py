#!/usr/bin/env python3
import csv
import sys
import subprocess as sub
import shlex
import os
import shutil
import time
from octopy.parseresult import parseResult

csvfile = sys.argv[1]
submission = []
file_list = []
os.chdir('job_submission')
#open csv file from octopodes and reformat it for dag_creator
with open(csvfile,'r') as cfile:
    reader = csv.reader(cfile)
    for row in reader:
        code = list(row[1])
        sal = code[2]
        ecoli = code[3]
        strep = code[4]
        ar = code[5]
        if (sal == '1' or ecoli == '1' or strep == '1' or ar == '1'):
            submission.append([row[0],ar,strep,ecoli,sal])
            file_list.append(row[2])
            file_list.append(row[3])

#writeout the reformated csv
with open(csvfile,'w') as formatted_file:
    writer = csv.writer(formatted_file,delimiter=',')
    run_id = sys.argv[1].split('.')[0]
    writer.writerow(['*'+run_id])
    for row in submission:
        writer.writerow(row)

#move reads to local stage
try:
    os.mkdir(run_id)
except FileExistsError:
    pass
for file in file_list:
    sub.Popen(['cp',file,run_id]).wait()
sub.Popen(['../scripts/sequencing_prep.py',run_id]).wait()

#create dag files
args = ['/home/floreknx/bucky-tr/dag_creator.py',csvfile]
sub.Popen(args).wait()

#create staging directory on grid
ssh_string = shlex.split('ssh chtc5 "mkdir /mnt/gluster/nwflorek/{0}"'.format(run_id))
sub.Popen(ssh_string).wait()

#move prepped reads to grid stage
compress = sub.Popen(['tar','-czC',run_id,'.'],stdout=sub.PIPE)
ssh_string = shlex.split('ssh chtc5 "cd /mnt/gluster/nwflorek/{0};tar -xz"'.format(run_id))
sub.Popen(ssh_string,stdin=compress.stdout).wait()

#move submission files
ssh_string = shlex.split('scp {0}.bucky-tr.dag {0}.dir.list chtc5:~/'.format(run_id))
sub.Popen(ssh_string).wait()

#make output stage
ssh_string = shlex.split('ssh chtc5 "cat {0}.dir.list"'.format(run_id))
tree = sub.Popen(ssh_string,stdout=sub.PIPE)
ssh_string = shlex.split('ssh chtc5 "cd output;xargs mkdir"')
sub.Popen(ssh_string,stdin=tree.stdout).wait()

#submit jobs
ssh_string = shlex.split('ssh chtc5 "condor_submit_dag {0}.bucky-tr.dag"'.format(run_id))
sub.Popen(ssh_string).wait()

#remove local staged reads
shutil.rmtree(run_id)

#monitor job progress
ssh_string = shlex.split('ssh chtc5 "cat {0}.bucky-tr.dag.dagman.log"'.format(run_id))
job_complete = False
while job_complete == False:
    time.sleep(600)
    p = sub.Popen(ssh_string,stdout=sub.PIPE)
    for line in p.stdout:
        if "(1) Normal termination" in line.decode('utf-8'):
            job_complete = True

#move move results back to local disk
ssh_string = shlex.split('ssh chtc5 "cd output;tar -cz {0}"'.format(run_id))
compress = sub.Popen(ssh_string,stdout=sub.PIPE)
sub.Popen(['tar','-xz'],stdin=compress.stdout).wait()

#compile results
os.chdir(run_id)
#get all resistance information
sub.Popen('../../scripts/compileResults.sh').wait()
#compile resistance information
cmd = shlex.split('../../scripts/ar_compile.py {0} resFind_all.csv card_all.csv NCBIres_all.csv'.format(run_id))
sub.Popen(cmd).wait()
#summerize sal serotype
cmd = shlex.split('../../scripts/sistr_sum.py -d .')
sub.Popen(cmd).wait()

#parse the results
parseResult(run_id)

#cleanup remote directories
ssh_string = shlex.split('ssh chtc5 "rm {0}.*"'.format(run_id))
sub.Popen(ssh_string)
ssh_string = shlex.split('ssh chtc5 "cd output; rm -r {0}"'.format(run_id))
sub.Popen(ssh_string)
ssh_string = shlex.split('ssh chtc5 "cd /mnt/gluster/nwflorek; rm -r {0}"'.format(run_id))
sub.Popen(ssh_string)

#cleanup local directory
os.chdir('../')

os.remove('{0}.bucky-tr.dag'.format(run_id))
os.remove('{0}.csv'.format(run_id))
os.remove('{0}.dir.list'.format(run_id))
shutil.rmtree('{0}'.format(run_id))
