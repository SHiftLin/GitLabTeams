import os
import sys
import csv
import time
import json
import argparse
import subprocess
import signal
import shutil

labnames = ["lab0-pingpong",  "lab1-clientserver",  "lab2-primarybackup",  "lab3-paxos", "lab4-shardedstore"]

parser = argparse.ArgumentParser()
parser.add_argument('labnum', metavar='labnum', type=int, nargs=1, help='test lab')
parser.add_argument('inpath', metavar='inpath', type=str, nargs='?',
                    default='./cps512-spring22', help='path to the code directory')
parser.add_argument('outpath', metavar='outpath', type=str, nargs='?',
                    default='./', help='path to the result directory')
parser.add_argument('labpath', metavar='labpath', type=str, nargs='?',
                    default='/root/dslabs/dslabs', help='path to the lab directory')
args = parser.parse_args()

args.inpath = os.getcwd()+"/"+args.inpath
args.outpath = os.getcwd()+"/"+args.outpath


def readResults():
    results = {}
    res_file = "%s/results.csv" % args.outpath
    if os.path.exists(res_file):
        with open(res_file, "r") as fin:
            reader = csv.reader(fin)
            for row in reader:
                results[row[0]] = row[1]
    return results


results = readResults()
print(results)

repos = os.listdir(args.inpath)
os.chdir(args.labpath)
for repo in repos:
    if repo in results:
        continue

    print("Grading %s..." % repo)
    repopath = "%s/%s" % (args.inpath, repo)
    if not os.path.isdir(repopath):
        continue
    shutil.rmtree("%s/build" % args.labpath, ignore_errors=True)

    for labname in labnames:
        src = "%s/labs/%s/src" % (repopath, labname)
        dst = "%s/labs/%s/src" % (args.labpath, labname)
        shutil.rmtree(dst, ignore_errors=True)
        shutil.copytree(src, dst)

    with subprocess.Popen(("python3 run-tests.py --lab %d" % args.labnum[0]).split(), stdout=subprocess.PIPE, stderr=subprocess.DEVNULL) as proc:
        out, err = proc.communicate()
        out = out.decode().split('\n')
        summary = out[-8:-5]
        print("\n".join(summary))
        results[repo] = summary[1]

        with open("%s/results.csv" % args.outpath, "a") as fout:
            writer = csv.writer(fout)
            writer.writerow([repo, summary[1]])
    print()
    time.sleep(1)  # for ctrl+c
