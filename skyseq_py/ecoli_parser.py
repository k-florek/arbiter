#!/usr/bin/env python3
#ecoli_parser.py
#Nick Florek
#Parses folders for 'abricate --db ecoh' results and concatenates them.

import argparse
import os
import csv

def ecoh_parser(d):
    results = {}
    p_list = []
    for root,dirs,files in os.walk(d):
        for f in files:
            if "_ecoh.csv" in f:
                p_list.append(os.path.join(root,f))

    for item in p_list:
        with open(item,'r') as r_file:
            read = csv.reader(r_file,delimiter='\t')
            for row in read:
                if "#FILE" not in row:
                    #check coverage (8) and identity (9)
                    if float(row[8]) >= 99 and float(row[9]) >= 99:
                        sample_id = row[0].split('.')[0]
                        if sample_id not in results:
                            results[sample_id] = row[12]
                        else:
                            results[sample_id] = results[sample_id]+'; '+row[12]

    with open(d+'/'+"ecoh_summary.tsv",'w') as outfile:
        w = csv.writer(outfile,delimiter='\t')
        for key,value in results.items():
            w.writerow([key,value])

    print("written output file:")
    print(d+'/'+"ecoh_summary.tsv")
