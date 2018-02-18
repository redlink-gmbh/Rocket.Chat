/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, no-var, space-before-function-paren,
quotes, prefer-template, no-undef, no-unused-vars*/

import mainContent from '../../pageobjects/main-content.page';
import sideNav from '../../pageobjects/side-nav.page';
import assistify from '../../pageobjects/assistify.page';
import {adminUsername, adminEmail, adminPassword, username, email, password} from '../../data/user.js';
import { checkIfUserIsValid, checkIfUserIsAdmin } from '../../data/checks';
import globalObject from '../../pageobjects/global';
const topicName = 'unit-testing';
const message = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
describe('[Help Reqeust]', function() {
	const helpRequest = 'write-test-cases';
	const comment = 'Request tested successfully';
	before(function() {
		try {
			checkIfUserIsAdmin(adminUsername, adminEmail, adminPassword);
			sideNav.spotlightSearch.waitForVisible(10000);
		} catch (e) {
			console.log(e);
		}
	});

	it('Create a Expertise', function() {
		try {
			sideNav.searchChannel(topicName);
			console.log('Expertise already Exists');
		} catch (e) {
			assistify.createTopic(topicName, adminUsername);
			console.log('New Expertise created');
		}
	});

	it('Create a HelpRequest', function() {
		try {
			sideNav.searchChannel(helpRequest);
			console.log('HelpRequest already Exists');
		} catch (e) {
			assistify.createHelpRequest(topicName, message, helpRequest);
			console.log('New Help Request Created');
		}
	});

	after(function() {
		describe('[Clean Up]', function() {
			it('close new Topic', () => {
				console.log('Clean for the Topic and Expertise Started...', topicName);
				try {
					assistify.closeTopic(helpRequest);
				} catch (e) {
					console.log(e);
				}

			});
		});
	});

});
describe('[In-Chat Help]', function() {
	const helpRequest = 'execute-test-cases';
	const inChatHelp = 'what-is-test-case';
	/* 	before(function() {
		try {
			checkIfUserIsAdmin(adminUsername, adminEmail, adminPassword);
			sideNav.spotlightSearch.waitForVisible(10000);
		} catch (e) {
			console.log(e);
		}
	}); */

	it('Create a Expertise', function() {
		try {
			sideNav.searchChannel(topicName);
			console.log('Expertise already Exists');
		} catch (e) {
			assistify.createTopic(topicName, adminUsername);
			console.log('New Expertise created');
		}
	});

	it('Create a HelpRequest', function() {
		try {
			sideNav.searchChannel(helpRequest);
			console.log('HelpRequest already Exists');
		} catch (e) {
			assistify.createHelpRequest(topicName, message, helpRequest);
			console.log('New Help Request Created');
		}
	});

	describe('Help:', () => {
		before(() => {
			sideNav.spotlightSearch.waitForVisible(10000);
			mainContent.openMessageActionMenu();
		});

		it('it should show a dialog for Help requestTitle', () => {
			mainContent.selectAction('help');
		});

		it('it should fill values in popup', function() {
			try {
				globalObject.supplyInput(inChatHelp);
			} catch (e) {
				console.log(e);
			}
			browser.pause(5000);
		});

		it('It should create a new Help Request from chat Room', function() {
			try {
				globalObject.confirmPopup();
				sideNav.spotlightSearch.waitForVisible(5000);
			} catch (e) {
				console.log(e);
			}
		});

		it('It should show the new in-chat-help request room', function() {
			try {
				sideNav.searchChannel(helpRequest);
				sideNav.spotlightSearch.waitForVisible(10000);
			} catch (e) {
				console.log('Error in creating help Request' + e);
			}
		});

		it('it should compare the last message', function() {
			try {
				mainContent.waitForLastMessageEqualsText(message);
			} catch (e) {
				console.log('message not propagated to child help request');
			}
		});
	});
	after(function() {
		describe('[Clean Up]', function() {
			it('close the topics and request', () => {
				console.log('Clean for the Topic and Expertise Started...', topicName);
				try {
					assistify.closeTopic(inChatHelp);
					assistify.closeTopic(helpRequest);
					assistify.closeTopic(topicName);
				} catch (e) {
					console.log(e);
				}

			});
		});
	});
});
