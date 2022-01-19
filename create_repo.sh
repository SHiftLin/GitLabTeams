#!/usr/bin/env bash
TA_USER_ID="shihan.lin"
GROUP_NAME="test"
REPO_NAME="lsh-private-batch-01"
GITLAB_TOKEN=$(cat token) # Enter your own. # create one here https://coursework.cs.duke.edu/-/profile/personal_access_token

# curl -f -X POST \
#   -H "PRIVATE-TOKEN: ${GITLAB_TOKEN}" -H "Content-Type:application/json" \
#   "https://coursework.cs.duke.edu/api/v4/projects" -d "{\"path\": \"${REPO}\", \"visibility\": \"private\"}"

# curl --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" "https://coursework.cs.duke.edu/api/v4/users/jingrong.chen/projects" # it's empty

# get group id first
curl --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
    "https://coursework.cs.duke.edu/api/v4/groups/${GROUP_NAME}"
# GROUP_ID=$(curl --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
#     "https://coursework.cs.duke.edu/api/v4/groups/${GROUP_NAME}" |
    # jq '.id')
echo "group_id:" ${GROUP_ID}

# list all project names in the `test` group
# curl --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
#         "https://coursework.cs.duke.edu/api/v4/groups/${GROUP_NAME}/projects"

# curl --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
#         "https://coursework.cs.duke.edu/api/v4/groups/5359/members"
# curl --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
#         "https://coursework.cs.duke.edu/api/v4/projects/46330/members/all" -v

# # create a private project named after `REPO_NAME` under group `GROUP_NAME` and invite a list of students
# curl -f -X POST -H "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
#         "https://coursework.cs.duke.edu/api/v4/projects" \
#         -d "name=${REPO_NAME}" \
#         -d "namespace_id=${GROUP_ID}" \
#         -d "visibility=private"

# # list again
# curl --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
#         "https://coursework.cs.duke.edu/api/v4/groups/${GROUP_NAME}/projects" \
#         | jq '.[] | .name'

# protected_branches
# curl --header "PRIVATE-TOKEN: <your_access_token>" "https://gitlab.example.com/api/v4/projects/5/protected_branches"

# REPO_ID=$(curl -f -X POST -H "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
#     "https://coursework.cs.duke.edu/api/v4/projects/46732/fork" \
#     -d "name=dslab_sl611_5" \
#     -d "path=dslab_sl611_5" \
#     -d "namespace_id=${GROUP_ID}" \
#     -d "visibility=private"  | jq '.id')
# echo REPO_ID ${REPO_ID}
