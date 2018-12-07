#!/usr/bin/env python3

import sys,os,csv
import subprocess as sub
import sqlite3

run_id = sys.argv[1]
files = sys.argv[2:]

covThresh = 90
identThresh = 90

class AR:
    def __init__(self,isoid,seq,start,end,gene,cov,iden,db,asc,descript):
        self.isoid = isoid
        self.seq = seq
        self.start = start
        self.end = end
        self.gene = gene
        self.cov = cov
        self.iden = iden
        self.db = db
        self.asc = asc
        self.descript = descript
        self.hash = int(str(start)+str(end)+str(seq))

def checkExists(arData,dataList):
    for item in dataList:
        if arData.hash == item.hash:
            return True
    return False

def summarize(path):
    #summarize all results
    cmd = 'find . -name "*_resfinder.csv" | xargs cat > resFind_all.csv'
    sub.Popen(cmd,shell=True,cwd=path)

    cmd = 'find . -name "*_card.csv" | xargs cat > card_all.csv'
    sub.Popen(cmd,shell=True,cwd=path)

    cmd = 'find . -name "*_ncbi.csv" | xargs cat > NCBIres_all.csv'
    sub.Popen(cmd,shell=True,cwd=path)

    cmd = 'find . -name "*_vfdb.csv" | xargs cat > vf_all.csv'
    sub.Popen(cmd,shell=True,cwd=path)

def ar_parse(config,path):
    #compile all individual result files
    summarzie(path)
    files = ['resFind_all.csv','card_all.csv','NCBIres_all.csv']
    #start parsing result
    arList = []
    for file in files:
        with open(file,'r') as csvfile:
            reader = csv.reader(csvfile,delimiter='\t')
            for line in reader:
                if '#' not in line[0]:
                    if float(line[8]) > covThresh and float(line[9]) > identThresh:
                        data = AR(line[0].split('_')[0],line[1],line[2],line[3],line[4],line[8],line[9],line[10],line[11],line[12])
                        if checkExists(data,arList):
                            for entry in arList:
                                if data.hash == entry.hash:
                                    entry.gene = entry.gene +'; ' + data.gene
                                    entry.cov = entry.cov +'; ' + data.cov
                                    entry.db = entry.db +'; ' + data.db
                                    entry.iden = entry.iden +'; ' + data.iden
                                    entry.asc = entry.asc +'; ' + data.asc
                        else:
                            arList.append(data)
    isoid = []
    for entry in arList:
        if entry.isoid not in isoid:
            isoid.append(entry.isoid)

    #update database
    #setup database
    conn = sqlite3.connect(config["db_path"])
    c = conn.cursor()
    c.execute('''CREATE TABLE if not exists AR (ID INTEGER PRIMARY KEY AUTOINCREMENT,RUNID TEXT,ISOID TEXT,GENE TEXT,CONTIG TEXT,GSTART TEXT,GEND TEXT,COVERAGE TEXT,IDENTITY TEXT,DATABASE TEXT,ACCESSION TEXT,DESCRIPTION TEXT)''')
    for id in isoid:
        for entry in arList:
            if id == entry.isoid:
                c.execute('''INSERT INTO AR (RUNID,ISOID,GENE,CONTIG,
                    GSTART,GEND,COVERAGE,IDENTITY,DATABASE,ACCESSION,DESCRIPTION) VALUES
                    (?,?,?,?,?,?,?,?,?,?,?)''',(run_id,entry.isoid,entry.gene,entry.seq,entry.start,entry.end,entry.cov,entry.iden,entry.db,entry.asc,entry.descript))

    #save changes to database
    conn.commit()
    #close the database
    conn.close()
