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