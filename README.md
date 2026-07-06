# Prototype_VB
Bypassing natural language with visual interface

## Setup
1. npm install
2. Copy .env.example to .env
3. Add your API keys to .env
4. npm start

## Access on phone
Connect phone and laptop to same WiFi network.
Open http://[Network IP shown on startup]:3000

## Session data
All session data is saved to sessions.csv
in this folder after every submission.
Each row = one query submission.
The file is never overwritten — new sessions
append to existing rows.

## Files
server.js — Express server and API proxies
sessions.csv — accumulated session data
.env — API keys (never share or commit)
