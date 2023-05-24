#!/bin/bash -x

SCRIPT_PATH="/tmp/version.py"

cat <<EOF > $SCRIPT_PATH

import json
import sys

with open("./package.json", "r") as package:
    package_info = json.loads(package.read())
    version = package_info["version"]

    print(version)

EOF

VERSION=$(python3  $SCRIPT_PATH)
sed -r -i "s/\"version\": \"[^\"]+\"/\"version\": \"$VERSION\"/g" bower.json package.json
sed -r -i "s/device-web-player\@.+\/dist/device-web-player@$VERSION\/dist/g" README.md

FILENAME="beta-device-web-player-$VERSION.tar.gz"
BRANCH_NAME="beta-release-$GIT_BRANCH-$VERSION"
TAG="beta-release-v$VERSION"

mkdir beta-release
yarn install
yarn build
yarn pack --filename $FILENAME
mv $FILENAME beta-release

git add --force beta-release/$FILENAME
git add --force dist

git stash push dist/ beta-release/$FILENAME

git checkout -b $BRANCH_NAME
git rm -rf .
git clean -fdx

git stash pop
git add --force beta-release/$FILENAME
git add --force dist
git checkout $GIT_BRANCH LICENSE
git checkout $GIT_BRANCH package.json

git commit -m "[DONOTMERGE] add yarn tar.gz"
git push origin $BRANCH_NAME --force

REPO_URL=$(git config --get remote.origin.url | sed 's|git@\(.*\):|https://\1/|')
COMMIT=$(git rev-parse HEAD)

echo base branch : $GIT_BRANCH
echo package URL : git+$REPO_URL#$COMMIT
