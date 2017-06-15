/* eslint-disable no-unused-vars */

/* globals SystemLogger */

class ServerPlugin {

	constructor(name) {
		this.name = name;
		this.id = Random.id(48);
	}

	getIncomingHookUrl() {
		return
	}

	/*
	 The following methods are actually interface methods offered with a standard implementation.
	 In your plugin-implementation, inherit from this class and add a method with same name without leading underscore
	 - if you need this hook
	 */

	_onStartup() {
		SystemLogger.debug('Plugin', this.name, 'has been loaded');
	}

	_onMessage(message, http) {
		SystemLogger.debug('Plugin', this.name, 'has been requested to process onMessage');
	}

	_processIncomingRequest(request) {
		SystemLogger.debug('Plugin', this.name, 'has been requested to process an incoming request');
	}

}
