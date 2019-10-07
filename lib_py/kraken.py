#!/usr/bin/env python3
import os,sys,shutil,shlex,time
import subprocess as sub
import sqlite3
import json
import boto3
import paramiko


id = sys.argv[1]
run_id = sys.argv[2]
path = sys.argv[3]

#get env variables from configuration file
with open("config.json",'r') as readjson:
    reader = readjson.read()
    config = json.loads(reader)


#get reads
conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute('''SELECT READ1,READ2 FROM seq_samples where RUNID = {run_id} WHERE ISOID=?'''.format(run_id=run_id),(id,))
rows = c.fetchall()
conn.close()
read1_path = rows[0][0]
read2_path = rows[0][1]
read1 = os.path.basename(read1_path)
read2 = os.path.basename(read2_path)

#check output path
if not os.path.exists('public/results/'+run_id):
    os.mkdir('public/results/'+run_id)
    os.mkdir('public/results/'+run_id+'/'+id)
if not os.path.exists('public/results/'+run_id+'/'+id):
    os.mkdir('public/results/'+run_id+'/'+id)

#start aws instance
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
#ssh and transfer reads

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
print('Transfering reads to AWS instance {aws}'.format(aws=instance_id))
ftp_client = ssh.open_sftp()
ftp_client.put(read1_path,'/home/ubuntu/{read1}'.format(read1=read1))
ftp_client.put(read2_path,'/home/ubuntu/{read2}'.format(read2=read2))
ftp_client.close()

#start kraken
cmd_str = '''kraken2 --db bacteria_180803
    --threads 10
    --output {0}.kraken.out
    --paired
    --gzip-compressed {1} {2}'''.format(id,read1,read2)

stdin,stdout,stderr = ssh.exec_command(cmd_str)
exit_status = stdout.channel.recv_exit_status()          # Blocking call
if exit_status == 0:
    print ("Finished Kraken2")
else:
    print("Error", exit_status)

#transfer results back
ftp_client = ssh.open_sftp()
ftp_client.get('/home/ubuntu/{id}.kraken.out'.format(id=id),'public/results/{run_id}/{id}/{id}.kraken.out'.format(run_id=run_id,id=id))
ftp_client.close()

#close ssh and shutdown instance
print("Disconnecting from {}".format(host))
ssh.close()
print('Shutting down',instance_id)
ec2.instances.filter(InstanceIds=[instance_id]).terminate()

#run krona
lib_path = config["lib_path"]
krona_path =  os.path.join(lib_path,'KronaTools-2.7/bin/ktImportTaxonomy')
cmd_str = "{k_path} -t 3 -q 2 {id}.kraken.out -o {id}_krona.html".format(k_path=krona_path,id=id)
cmd = shlex.split(cmd_str)
sub.Popen(cmd,cwd='public/results/'+run_id+'/'+id).wait()

#update database
db_path = os.path.join(config["db_path"],'skyseq.db')
conn = sqlite3.connect(db_path)
c = conn.cursor()

#update submission status in skyseq.db
#binary status code for runs:
#[fastqc,kraken,sal,ecoli,strep,ar] = "000000"
#0 - not run
#1 - submitted
#2 - in progress
#3 - finished
#4 - error
c.execute('''SELECT * FROM seq_samples where RUNID = {run_id} WHERE ISOID=?'''.format(run_id=run_id),(id,))
row = c.fetchone()
statuscode = row[2]
kraken_path = '/results/{run_id}/{id}/{id}_krona.html'.format(run_id=run_id,id=id)
if statuscode[1] == '1':
    newcode = statuscode[0] + '3' + statuscode[2:]
    c.execute('''UPDATE seq_samples SET STATUSCODE = ?,KRAKEN = ? WHERE ISOID = ? AND RUNID = ?''',(newcode,kraken_path,id,run_id))

#save changes to database
conn.commit()
#close the database
conn.close()
