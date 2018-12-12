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
print('Getting statuscodes for {runid}'.format(runid=run_id))
db_path = os.path.join(config["db_path"],'octo.db')
def getStatusCodes():
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute('''SELECT ISOID,STATUSCODE FROM {run_id}'''.format(run_id=run_id))
    rows = c.fetchall()
    conn.close()
    codes = {}
    for row in rows:
        codes[row[0]] = row[1]
    return codes


#check to see if we have a job if so add it to a list of job ids
statuscodes = getStatusCodes()
job_ids = []
i = 0
while not job_ids:
    for key in statuscodes:
        if '1' in list(statuscodes[key])[2:]:
            job_ids.append(key)
    time.sleep(30)
    statuscodes = getStatusCodes()
    #exit if no jobs after 5 checks
    i += 1
    if i > 5:
        sys.exit(1)

#write the status codes to a csv file that can be used by bucky-tr to run the pipeline
job_file = os.path.join(config["job_staging_path"],run_id+".csv")
with open(job_file,'w') as csvout:
    wr = csv.writer(csvout,delimiter=',')
    for key in statuscodes:
        row = []
        row.append(key)
        row.extend(list(statuscodes[key]))
        wr.writerow(row)

#Start up aws instance
print('Starting AWS instance for {runid}'.format(runid=run_id))
ec2 = boto3.resource('ec2')

BDM = [{"DeviceName": "/dev/sda1",
"Ebs": {
"DeleteOnTermination": True,
"VolumeType": "gp2",
"VolumeSize": 100}}]

instance_id = ec2.create_instances(
    BlockDeviceMappings=BDM,
    ImageId="ami-02a5aab546fb4d3c4",
    MinCount=1,
    MaxCount=1,
    InstanceType="c4.2xlarge",
    KeyName='octopodes',
    SecurityGroups=['program_access',]
)[0].id
instance = ec2.Instance(instance_id)

#transfer the raw files from storage and preprocess them
print('Transfering reads from stoage for preprocessing {runid}'.format(runid=run_id))
stage_path_runid = os.path.join(config["job_staging_path"],run_id)
try:
    os.mkdir(stage_path_runid)
except FileExistsError:
    shutil.rmtree(stage_path_runid)
    os.mkdir(stage_path_runid)

conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute('''SELECT READ1,READ2,ISOID FROM {run_id}'''.format(run_id=run_id))
rows = c.fetchall()
conn.close()
for row in rows:
    #only transfer reads we have a job for
    if row[2] in job_ids:
        r1 = sub.Popen(['cp',row[0],stage_path_runid])
        r2 = sub.Popen(['cp',row[1],stage_path_runid])
        r1.wait()
        r2.wait()

preprocess_reads(stage_path_runid)

#check to see if instance is running
while True:
    state = instance.state['Code']
    if state<16:
        state = instance.state['Code']
        time.sleep(10)
    else:
        break

#transfer the files to the amazon instance
host = instance.public_dns_name
key = paramiko.RSAKey.from_private_key_file(config["aws_key"])

while True:
    print("Connecting to AWS instance: {}".format(host))
    i = 0
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(hostname=host,username="ubuntu",pkey=key)
        print("Connected to {}".format(host))
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
#compress the raw reads folder
print('Transfering preprocessed reads to AWS instance {aws}'.format(aws=instance_id))
cmd = 'tar -czf {run_id}.tar.gz {run_id}'.format(run_id=run_id)
cmd = shlex.split(cmd)
sub.Popen(cmd,cwd=config["job_staging_path"]).wait()
ftp_client = ssh.open_sftp()
ftp_client.put(os.path.join(config["job_staging_path"],'{run_id}.tar.gz'.format(run_id=run_id)),'/home/ubuntu/{run_id}.tar.gz'.format(run_id=run_id))
ftp_client.put(os.path.join(config["job_staging_path"],'{run_id}.csv'.format(run_id=run_id)),'/home/ubuntu/{run_id}.csv'.format(run_id=run_id))
ftp_client.close()

#decompress remote files
print("Decompressing remote files {}".format(host))
stdin,stdout,stderr = ssh.exec_command("tar -xzvf /home/ubuntu/{run_id}.tar.gz".format(run_id=run_id))
exit_status = stdout.channel.recv_exit_status()          # Blocking call
if exit_status == 0:
    print ("Decompressed package")
else:
    print("Error", exit_status)

#update bucky-tr
print("Checking for Bucky-TR updates on {}".format(host))
stdin,stdout,stderr = ssh.exec_command("cd bucky-tr && git pull origin")
exit_status = stdout.channel.recv_exit_status()          # Blocking call
if exit_status == 0:
    print ("Updated Bucky-TR")
else:
    print("Error", exit_status)

#start bucky-tr pipeline
print("Starting Bucky-TR on {}".format(host))
stdin,stdout,stderr = ssh.exec_command("bucky-tr/bucky-tr.py -t 8 -c {run_id}.csv {run_id}".format(run_id=run_id))

#monitor for job completion
completion = False
while completion == False:
    stdin,stdout,stderr = ssh.exec_command('ls {run_id}'.format(run_id=run_id))
    file_list = stdout.readlines()
    for f in file_list:
        if '_results' in f:
            completion = True
    time.sleep(60)
time.sleep(120)

#compress and transfer the result files back
print("Compressing results on {}".format(host))
stdin,stdout,stderr = ssh.exec_command("cd {run_id} && tar -czf ../{run_id}_results.tar.gz {run_id}_results".format(run_id=run_id))
exit_status = stdout.channel.recv_exit_status()          # Blocking call
if exit_status == 0:
    print ("Compressed Result Package")
else:
    print("Error", exit_status)

print("Transfering result package from {}".format(host))
ftp_client = ssh.open_sftp()
ftp_client.get("/home/ubuntu/{run_id}_results.tar.gz".format(run_id=run_id),os.path.join(config["job_staging_path"],"{run_id}_results.tar.gz".format(run_id=run_id)))
ftp_client.close()

#terminate the instance
print("Disconnecting from {}".format(host))
ssh.close()
print('Shutting down',instance_id)
ec2.instances.filter(InstanceIds=[instance_id]).terminate()

#parse results, update database statuscodes, complete job
#decompress result package
print("Decompressing results package")
cmd = 'tar -xzf {run_id}_results.tar.gz'.format(run_id=run_id)
cmd = shlex.split(cmd)
sub.Popen(cmd,cwd=config["job_staging_path"]).wait()
print("Parsing results ...")
parseResult(run_id,config)

#cleanup
print("Finished parsing, cleaning up")
shutil.rmtree(stage_path_runid)
shutil.rmtree(stage_path_runid+'/{run_id}_results'.format(run_id=run_id))
#os.remove(os.path.join(config["job_staging_path"],run_id + '.csv'))
#os.remove(os.path.join(config["job_staging_path"],run_id + '_results.tar.gz'))
#os.remove(os.path.join(config["job_staging_path"],run_id + '.tar.gz'))
print("Done")
