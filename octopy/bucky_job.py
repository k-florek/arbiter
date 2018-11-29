#!/usr/bin/env python3
import os,sys,shlex,csv,time,json,boto3
import subprocess as sub
import shutil
from itertools import zip_longest
from parseresult import parseResult
from bucky_prep import preprocess_reads
import sqlite3
import paramiko

run_id = sys.argv[1]
path = sys.argv[2]

#get env variables from configuration file
with open("config.json",'r') as readjson:
    reader = readjson.read()
    config = json.loads(reader)

#connect to the db and get the status codes
db_path = os.path.join(config["db_path"],'octo.db')
conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute('''SELECT ISOID,STATUSCODE FROM {run_id}'''.format(run_id=run_id))
rows = c.fetchall()
conn.close()

#write the status codes to a csv file that can be used by bucky-tr to run the pipeline
statuscodes = {}
for row in rows:
    statuscodes[row[0]] = row[1]
job_file = os.path.join(config["job_staging_path"],run_id+".csv")
with open(job_file,'w') as csvout:
    wr = csv.writer(csvout,delimiter=',')
    for key in statuscodes:
        row = []
        row.append(key)
        row.extend(list(statuscodes[key]))
        wr.writerow(row)

#Start up aws instance
ec2 = boto3.resource('ec2')

BDM = [{"DeviceName": "/dev/sda1",
"Ebs": {
"DeleteOnTermination": True,
"VolumeType": "gp2",
"VolumeSize": 100}}]

instance_id = ec2.create_instances(
    BlockDeviceMappings=BDM,
    ImageId="ami-0f1fcf3405db98a19",
    MinCount=1,
    MaxCount=1,
    InstanceType="c4.2xlarge",
    KeyName='octopodes',
    SecurityGroups=['program_access',]
)[0].id
instance = ec2.Instance(instance_id)

#transfer the raw files from storage and preprocess them
stage_path = os.path.join(config["job_staging_path"],run_id)
try:
    os.mkdir(stage_path)
except FileExistsError:
    shutil.rmtree(stage_path)
    os.mkdir(stage_path)

conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute('''SELECT READ1,READ2 FROM {run_id}'''.format(run_id=run_id))
rows = c.fetchall()
conn.close()
for row in rows:
    r1 = sub.Popen(['cp',row[0],stage_path])
    r2 = sub.Popen(['cp',row[1],stage_path])
    r1.wait()
    r2.wait()

preprocess_reads(stage_path)

#check to see if instance is running
state = instance.state['Code']
if state<16:
    state = instance.state['Code']
    time.sleep(10)

#transfer the files to the amazon instance
host = instance.public_dns_name
key = paramiko.RSAKey.from_private_key_file(config["aws_key"])

while True:
    print("Connecting to {}".format(host))
    i = 0
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(hostname=host,username="ubuntu",pkey=key)
        print("Connected")
        break
    except paramiko.AuthenticationException:
        print("Authentication Failed")
        sys.exit()
    except:
        print("Trying to reconnect..")
        i +=1
        time.sleep(2)
    if 1==5:
        print("Tried 5 times, quitting.")
        sys.exit()

#setup for sftp
#compress the read folder
cmd = 'tar -czf {run_id}.tar.gz {path}'.format(run_id=os.path.join(config["job_staging_path"],run_id),path=stage_path)
cmd = shlex.split(cmd)
sub.Popen(cmd).wait()
ftp_client = ssh.open_sftp()
ftp_client.put(os.path.join(config["job_staging_path"],'{run_id}.tar.gz'.format(run_id=run_id)),'/home/ubuntu/{run_id}.tar.gz'.format(run_id=run_id))
ftp_client.put(os.path.join(config["job_staging_path"],'{run_id}.csv'.format(run_id=run_id)),'/home/ubuntu/{run_id}.csv'.format(run_id=run_id))
ftp_client.close()
#decompress remote files
ssh.exec_command("tar -xzf /home/ubuntu/{run_id}.tar.gz".format(run_id=run_id))

print('Done')
ssh.close()

#start the bucky pipeline

#montior for completion of the pipeline

#transfer the result files back

#terminate the instance

#print('Shutting down',instance_ids)
#ec2.instances.filter(InstanceIds=instance_ids).terminate()

#parse results, update database, complete job
