#!/usr/bin/env bash

TARGET_ENVIRONMENT=undefined
if [ ${TRAVIS_BRANCH} = master ]
	then
    	TARGET_ENVIRONMENT=production
else
  if [[ ${TRAVIS_BRANCH} == develop ]] || [[ $TRAVIS_BRANCH == "release/"* ]]
      then
      	TARGET_ENVIRONMENT=test
    else  
  fi
fi

aws s3api put-object-tagging --bucket ${AWS_PATH} --key rocketchat/${BUILD_FILE --tagging "{ \"TagSet\": [ { \"Key\": \"environment\", \"Value\": \"${TARGET_ENVIRONMENT}\" }, { \"Key\": \"nodejs_version\", \"Value\": \"${NODEJS_VERSION}\" }, { \"Key\": \"nodejs_checksum\", \"Value\": \"${NODEJS_CHECKSUM}\", { \"Key\": \"assets\", \"Value\": \"${ASSETS_URL}\" } ] }"