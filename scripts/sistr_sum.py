#!/usr/bin/env python3
#sistr_sum.py
#Nick Florek
#Parses folders for sistr results and concatenates them.

import argparse
import os
import csv

#determine command line arguments and get path
parser = argparse.ArgumentParser(description='Search subdirectories for SISTR results.')
parser.add_argument('-d',metavar='sources', nargs='+',help="directory containing result folders",required=True)
args = parser.parse_args()
d = os.path.abspath(args.d[0])

results = dict()
p_list = []
for root,dirs,files in os.walk(d):
    for f in files:
        if "_sistr.csv" in f:
            p_list.append(os.path.join(root,f))

for item in p_list:
    with open(item,'r') as r_file:
        read = csv.reader(r_file,delimiter=',')
        sample_id = ''
        antigenic = ''
        serotype = ''
        serovar_antigen = ''
        serovar_cgmlst = ''
        qc = ''
        for row in read:
            if "genome" not in row:
                sample_id = row[5].split('_')[0]
                antigenic = row[8] + ":" + row[6] + ":" + row[7]
                serotype = row[12]
                serovar_antigen = row[13]
                serovar_cgmlst = row[14]
                qc = row[10]
        results[sample_id] = [antigenic,serotype,serovar_antigen,serovar_cgmlst,qc]

with open(d+'/'+"sistr_summary.tsv",'w') as outfile:
    w = csv.writer(outfile,delimiter='\t')
    for key,value in results.items():
        w.writerow([key,value[0].rstrip(),value[1].rstrip(),value[2].rstrip(),value[3].rstrip(),value[4].rstrip()])

print("written output file:")
print(d+'/'+"sistr_summary.tsv")
