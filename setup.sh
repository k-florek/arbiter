#!/bin/bash

bower install
npm install
mkdir db
pip3 install -r requirements.txt
mkdir public/results
db-migrate db:create --config configs/database.json database
db-migrate up database --config configs/database.json
