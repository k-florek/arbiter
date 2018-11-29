#!/usr/bin/env python3
#sequencing_prep.py
#Nick Florek
#This function will prep a folder full of sequencing files by putting each paired data set into subfolders renaming them.

import os,sys
import subprocess as sub

def preprocess_reads(path):

    dirList = []
    ls = sub.Popen(["ls", path],stdout=sub.PIPE)
    dirList = ls.communicate()[0].decode('UTF-8').split()

    for item in dirList:
        if os.path.isdir(item) == False:
            if item.split('.')[1] == "fastq":
                if ".gz" in item:
                    if os.path.isdir(path+'/'+item.split('-')[0]) == False:
                        sub.Popen(["mkdir",path+'/'+item.split('-')[0]],stdout=sub.PIPE).wait()
                    if "_R1_" in item:
                        print("Moving and renaming "+item)
                        sub.Popen(["mv",path+'/'+item,path+'/'+item.split('-')[0]+'/'+item.split('-')[0]+"_1.fastq.gz"])
                    elif "_R2_" in item:
                        print("Moving and renaming "+item)
                        sub.Popen(["mv",path+'/'+item,path+'/'+item.split('-')[0]+'/'+item.split('-')[0]+"_2.fastq.gz"])
                    else:
                        print("Moving and renaming "+item)
                        sub.Popen(["mv",path+'/'+item,path+'/'+item.split('-')[0]+'/'+item.split('-')[0]+".fastq.gz"])
