import os
import csv

registered = set()
with open("registered.txt", "r") as fin:
    for line in fin:
        row = line.split('"')
        registered.add(row[1])

with open("students.csv", "r") as fin:
    reader = csv.reader(fin)
    for row in reader:
        if not row[0] in registered:
            print(row)
