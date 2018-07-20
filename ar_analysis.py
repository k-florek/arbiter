#!/usr/bin/env python3
#ar_analysis.py
#Nick Florek
#This script scrubs the output of several AR resistance databases searches into 1 output.

import argparse
import os
import csv

def check_cov(hit):

    cov = float(hit[8])
    ide = float(hit[9])

    if cov and ide > 98:
        return True
    else:
        return False

#determine command line arguments and get path
parser = argparse.ArgumentParser(description='Scrub the output of several AR resistance databases searches into 1 output')
parser.add_argument('-s',metavar='sources', nargs='+',help="csv files with AR data",required=True)
args = parser.parse_args()
source_list = args.s

resist_card = dict()
resist_ncbi = dict()
resist_resfind = dict()

for item in source_list:
    if "card" in item:
        with open(os.path.abspath(item),'r') as card:
            r = csv.reader(card,delimiter='\t')
            for row in r:
                if "#FILE" not in row:
                    if check_cov(row) == True:
                        if row[0].split("_")[0] in resist_card:
                            if row[4] not in resist_card[row[0].split("_")[0]]:
                                resist_card[row[0].split("_")[0]].append(row[4])
                        else:
                            resist_card[row[0].split("_")[0]] = [row[4]]


    if "NCBIres" in item:
        with open(os.path.abspath(item),'r') as ncbi:
            r = csv.reader(ncbi,delimiter='\t')
            for row in r:
                if "#FILE" not in row:
                    if check_cov(row) == True:
                        if row[0].split("_")[0] in resist_ncbi:
                            if row[4] not in resist_ncbi[row[0].split("_")[0]]:
                                resist_ncbi[row[0].split("_")[0]].append(row[4])
                        else:
                            resist_ncbi[row[0].split("_")[0]] = [row[4]]

    if "resFind" in item:
        with open(os.path.abspath(item),'r') as res:
            r = csv.reader(res,delimiter='\t')
            for row in r:
                if "#FILE" not in row:
                    if check_cov(row) == True:
                        if row[0].split("_")[0] in resist_resfind:
                            if row[4] not in resist_resfind[row[0].split("_")[0]]:
                                resist_resfind[row[0].split("_")[0]].append(row[4])
                        else:
                            resist_resfind[row[0].split("_")[0]] = [row[4]]

with open("resistance_analysis.csv",'w') as outfile:
    w = csv.writer(outfile,delimiter=',')
    w.writerow(['ResFinder'])
    if resist_resfind:
        for key,value in resist_resfind.items():
            w.writerow([key,' '.join(value)])
    w.writerow([' '])
    w.writerow(['NCBI resistance database'])
    if resist_ncbi:
        for key,value in resist_ncbi.items():
            w.writerow([key,' '.join(value)])
    w.writerow([' '])
    w.writerow(['CARD resistance database'])
    if resist_card:
        for key,value in resist_card.items():
            w.writerow([key,' '.join(value)])
print("written output file:")
print(os.getcwd()+'/'+"resistance_analysis.csv")
