/* eslint-disable no-unused-vars */

/* globals RocketChat, SystemLogger */

class ServerPlugin {

	constructor(name) {
		this.name = name; //the name is used in persistency and API in order to provide human friendly identification
		this.id = Random.id(48); //a randomized ID can be used as token or in general a secret shared between the RC server and the external system

		this.version = 0; //in order to identify compatibility on API level
		this.dbversion = 0; //may trigger migrations of persisted data

		this.persistency = { //provides helpers for storing a retrieved result
			saveReplacingEarlierResults(correlationId) {

			}
		};

		this.messagesAPI = {
			/**
			 * Creates a message in a room using the externally known names (instead of IDs)
			 * @param text
			 * @param attachments
			 * @param roomName
			 * @param username
			 */
			createMessage(text, attachments, roomName, username = 'rocket.cat') {
				// RocketChat.sendMessage()
			}
		};
	}

	/*
	 The following methods are actually interface methods offered with a standard implementation.
	 In your plugin-implementation, inherit from this class and add a method
	 */

	initialize() {
		SystemLogger.debug('Plugin', this.name, 'has been loaded');
	}

	onMessage(message, http) {
		SystemLogger.debug('Plugin', this.name, 'has been requested to process onMessage');
	}

	onClose(message, http) {
		SystemLogger.debug('Plugin', this.name, 'has been requested to process onClose');
	}

	processIncomingRequest(request) {
		this._validateRequest(request);


		SystemLogger.debug('Plugin', this.name, 'has been requested to process an incoming request');
	}


	/**
	 * Helper method perparing a HTTP-header which includes the callback-URL for asynchronous processing
	 * @returns {{}}
	 * @protected
	 */
	_createRequestOptions() {
		const options = {};

		const webhook = RocketChat.Plugins.getWebhook(this.id);
		options.callBackUrl = webhook.url;

		return options;
	}

	/**
	 * Use this method in order to check the request body's load (e. g. validate JSON / XML schema
	 * @param request
	 * @protected
	 */
	_validateRequest(request) {
		return true;
	}

	/**
	 * Use this method in order to save a state of the external system locally
	 * A template can subscribe to the PluginData Collection
	 * @param load
	 * @protected
	 */
	_storePluginState(load) {
		this.persistency.saveReplacingEarlierResults(load);
	}
}
