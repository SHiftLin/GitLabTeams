#!/bin/bash
pkill node
nohup node server.js >server.log 2>&1 &
