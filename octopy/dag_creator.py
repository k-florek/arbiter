#!/usr/bin/env python3
#dag_creator.py
#Author Nick Florek
#
#This script creates a dagman file based on a supplied list of id's for the bukcy-tr pipeline.
import subprocess
import sys
import os
import csv
import time

#get path and file name of SRR accessions from arguments
fname = sys.argv[1]
fname = os.path.abspath(fname)
path = os.path.split(fname)[0]

#initiate lists
res_list = []
strep_list = []
ecoli_list = []
sal_list = []
sal_list_asem = []
id_list = []
#open file and pull accessions into a list
with open(fname,'r') as f:
    reader = csv.reader(f,delimiter=',',quotechar='|')
    for row in reader:
        if "#" in row[0]:
            continue
        if "*" in row[0]:
            run_id = row[0][1:]
            continue
        try:
            if row[1] == '1':
                res_list.append(row[0])
            if row[2] == '1':
                strep_list.append(row[0])
            if row[3] == '1':
                ecoli_list.append(row[0])
            if row[1] == '1' and row[4] == '1':
                sal_list.append(row[0])
            if row[1] == '' and row[4] == '1':
                sal_list_asem.append(row[0])
            id_list.append(row[0])
        except IndexError:
            pass

#clean list items of '\n'
res_list = [x.strip() for x in res_list]
strep_list = [x.strip() for x in strep_list]
ecoli_list = [x.strip() for x in ecoli_list]
sal_list = [x.strip() for x in sal_list]
sal_list_asem = [x.strip() for x in sal_list_asem]
id_list = [x.strip() for x in id_list]

d = os.path.join("/mnt/gluster/nwflorek",run_id)
s = run_id
with open("{0}.bucky-tr.dag".format(s),"w") as dag:
    dag.write("#dag file created by dag_creator.py\n")
    dag.write("#######################\n")
    for _id in res_list:
        dag.write("#******************** - resistance {0}\n".format(_id))
        dag.write("JOB unicycler_{0} bucky-tr/condor-bucky-tr/unicycler.sub\n".format(_id))
        dag.write("JOB resFind_{0} bucky-tr/condor-bucky-tr/resFind.sub\n".format(_id))
        dag.write("JOB NCBIres_{0} bucky-tr/condor-bucky-tr/NCBIres.sub\n".format(_id))
        dag.write("JOB CARD_{0} bucky-tr/condor-bucky-tr/CARD.sub\n".format(_id))
        dag.write("JOB vf_{0} bucky-tr/condor-bucky-tr/vf.sub\n".format(_id))
        dag.write("JOB mlst_{0} bucky-tr/condor-bucky-tr/mlst.sub\n".format(_id))
        dag.write("\n")
        dag.write("#*********\n")
        dag.write("\n")
        dag.write("VARS unicycler_{0} id=\"{0}\" stamp=\"{2}\" dir=\"{1}\"\n".format(_id,d,s))
        dag.write("VARS resFind_{0} id=\"{0}\" stamp=\"{2}\"\n".format(_id,d,s))
        dag.write("VARS NCBIres_{0} id=\"{0}\" stamp=\"{2}\"\n".format(_id,d,s))
        dag.write("VARS CARD_{0} id=\"{0}\" stamp=\"{2}\"\n".format(_id,d,s))
        dag.write("VARS vf_{0} id=\"{0}\" stamp=\"{2}\"\n".format(_id,d,s))
        dag.write("VARS mlst_{0} id=\"{0}\" stamp=\"{2}\"\n".format(_id,d,s))
        dag.write("\n")
        dag.write("#*********\n")
        dag.write("\n")
        dag.write("PARENT unicycler_{0} CHILD resFind_{0}\n".format(_id))
        dag.write("PARENT unicycler_{0} CHILD NCBIres_{0}\n".format(_id))
        dag.write("PARENT unicycler_{0} CHILD CARD_{0}\n".format(_id))
        dag.write("PARENT unicycler_{0} CHILD vf_{0}\n".format(_id))
        dag.write("PARENT unicycler_{0} CHILD mlst_{0}\n".format(_id))
        dag.write("\n")
    for _id in strep_list:
        dag.write("#******************** - pneumocat {0}\n".format(_id))
        dag.write("JOB trim_{0} bucky-tr/condor-bucky-tr/trim.sub\n".format(_id))
        dag.write("JOB pneumocat_{0} bucky-tr/condor-bucky-tr/pneumocat.sub\n".format(_id))
        dag.write("\n")
        dag.write("#*********\n")
        dag.write("\n")
        dag.write("VARS pneumocat_{0} id=\"{0}\" stamp=\"{2}\" dir=\"{1}\"\n".format(_id,d,s))
        dag.write("VARS trim_{0} id=\"{0}\" stamp=\"{2}\" dir=\"{1}\"\n".format(_id,d,s))
        dag.write("\n")
        dag.write("#*********\n")
        dag.write("\n")
        dag.write("PARENT trim_{0} CHILD pneumocat_{0}\n".format(_id))
        dag.write("\n")
    for _id in sal_list:
        dag.write("#******************** - SISTR {0}\n".format(_id))
        dag.write("JOB sistr_{0} bucky-tr/condor-bucky-tr/sistr.sub\n".format(_id))
        dag.write("\n")
        dag.write("#*********\n")
        dag.write("\n")
        dag.write("VARS sistr_{0} id=\"{0}\" stamp=\"{2}\" dir=\"{1}\"\n".format(_id,d,s))
        dag.write("\n")
        dag.write("#*********\n")
        dag.write("\n")
        dag.write("PARENT unicycler_{0} CHILD sistr_{0}\n".format(_id))
        dag.write("\n")
    for _id in sal_list_asem:
        dag.write("#******************** - SISTR {0}\n".format(_id))
        dag.write("JOB unicycler_{0} bucky-tr/condor-bucky-tr/unicycler.sub\n".format(_id))
        dag.write("JOB sistr_{0} bucky-tr/condor-bucky-tr/sistr.sub\n".format(_id))
        dag.write("\n")
        dag.write("#*********\n")
        dag.write("\n")
        dag.write("VARS unicycler_{0} id=\"{0}\" stamp=\"{2}\" dir=\"{1}\"\n".format(_id,d,s))
        dag.write("VARS sistr_{0} id=\"{0}\" stamp=\"{2}\" dir=\"{1}\"\n".format(_id,d,s))
        dag.write("\n")
        dag.write("#*********\n")
        dag.write("\n")
        dag.write("PARENT unicycler_{0} CHILD sistr_{0}\n".format(_id))
        dag.write("\n")

with open("{0}.dir.list".format(s),"w") as d:
    d.write(s+'\n')
    for _id in id_list:
        d.write(s+'/'+_id+'\n')
