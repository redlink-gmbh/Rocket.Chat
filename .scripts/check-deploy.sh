#!/usr/bin/env bash

pip install --user awscli
export PATH=$PATH:$HOME/.local/bin

mkdir -p ~/.aws

cat > ~/.aws/credentials << EOL
[default]
aws_access_key_id = ${AWS_ACCESS_KEY}
aws_secret_access_key = ${AWS_SECRET_KEY}
EOL

TARGET_ENVIRONMENT=undefined
if [ ${TRAVIS_BRANCH} = master ]
	then
    	TARGET_ENVIRONMENT=production
else
  if [[ ${TRAVIS_BRANCH} == develop ]] || [[ $TRAVIS_BRANCH == "release/"* ]]
      then
      	TARGET_ENVIRONMENT=test
  fi
fi

aws s3api put-object-tagging --region ${AWS_REGION} --bucket ${AWS_BUCKET} --key rocketchat/${BUILD_FILE} --tagging "{ \"TagSet\": [ { \"Key\": \"environment\", \"Value\": \"${TARGET_ENVIRONMENT}\" }, { \"Key\": \"nodejs_version\", \"Value\": \"${NODEJS_VERSION}\" }, { \"Key\": \"nodejs_checksum\", \"Value\": \"${NODEJS_CHECKSUM}\", { \"Key\": \"assets\", \"Value\": \"${ASSETS_URL}\" } ] }"
