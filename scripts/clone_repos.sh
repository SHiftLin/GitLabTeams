#!/bin/bash
set -e

TA_USER_ID="shihan.lin"
GROUP_NAME="cps512-spring22"
GITLAB_TOKEN=$(cat ../token) # Enter your own. # create one here https://coursework.cs.duke.edu/-/profile/personal_access_token

# get group id first
GROUP_ID=$(curl -sS --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
    "https://coursework.cs.duke.edu/api/v4/groups/${GROUP_NAME}" |
    jq '.id')
echo "group_id:" ${GROUP_ID}

# list all project names in the group
if [ ! -f repos.txt ]; then
    curl -sS --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
        "https://coursework.cs.duke.edu/api/v4/groups/${GROUP_NAME}/projects?simple=true&per_page=100" |
        jq '.[] | .path' >repos.txt
fi
REPOS=$(cat repos.txt)

mkdir -p ${GROUP_NAME}
cd ${GROUP_NAME}
for repo in ${REPOS}; do
    repo="${repo%\"}"
    repo="${repo#\"}"
    if [ ! -d ${repo} ]; then
        git clone --depth 1 git@coursework.cs.duke.edu:cps512-spring22/${repo}.git
    fi
done
