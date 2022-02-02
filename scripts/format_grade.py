import os
import csv

headers = '"Display ID","ID","Last Name","First Name","grade"'
grades = {}

with open("results.csv", "r") as fin:
    reader = csv.reader(fin)
    for row in reader:
        netids = row[0].split('-')[1:]
        for i in netids:
            points = row[1].split()[1]
            grades[i] = points.split('/')[0]

fout = open("grades.csv", "w")
fout.write(headers+"\n")
writer = csv.writer(fout, quoting=csv.QUOTE_NONNUMERIC)
with open("students.csv", "r") as fin:
    reader = csv.reader(fin)
    for row in reader:
        netid = row[0].split('@')[0]
        if netid not in grades:
            print("error: ", netid)
            continue
        [last, first] = row[1].split(',')
        writer.writerow([row[0], row[0], last.strip(), first.strip(), grades[netid]])
fout.close()
