#!/bin/bash

bower install
npm install
mkdir db
pip3 install --user awscli boto3 paramiko multiqc
mkdir public/results
