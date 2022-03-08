#!/bin/bash
pkill -9  node
nohup node server.js >>server.log 2>&1 &
