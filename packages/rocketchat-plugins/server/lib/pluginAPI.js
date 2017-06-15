/* globals RocketChat */

import {Restivus} from 'nimble:restivus';

/**
 * Provides an endpoint to which plugins which need incoming webhooks can address their requests
 * @see packages/rocketchat-integrations/server/api/api.js
 */

const Api = new Restivus({
	enableCors: true,
	apiPath: 'plugins/',
	auth: {
		user() {
			const payloadKeys = Object.keys(this.bodyParams);
			const payloadIsWrapped = (this.bodyParams && this.bodyParams.payload) && payloadKeys.length === 1;
			if (payloadIsWrapped && this.request.headers['content-type'] === 'application/x-www-form-urlencoded') {
				try {
					this.bodyParams = JSON.parse(this.bodyParams.payload);
				} catch ({message}) {
					return {
						error: {
							statusCode: 400,
							body: {
								success: false,
								error: message
							}
						}
					};
				}
			}
			// this.integration = RocketChat.models.Integrations.findOne({
			// 	_id: this.request.params.integrationId,
			// 	token: decodeURIComponent(this.request.params.token)
			// });
			// if (this.integration == null) {
			// 	logger.incoming.info('Invalid integration id', this.request.params.integrationId, 'or token', this.request.params.token);
			// 	return;
			// }
			// const user = RocketChat.models.Users.findOne({
			// 	_id: this.integration.userId
			// });
			// return {user};
		}
	}
});

function _validateAuthentication() {
	return true;
}

function pluginIncomingWebhook() {
	// this.plugin.name;
	// @urlParams: this.urlParams;
	// @bodyParams: this.bodyParams;
	// @request: this.request;

	const plugin = RocketChat.Plugins.get(this.plugin.name);
	if (!_validateAuthentication()) {
		// return 403;
	}
	if (plugin.validateRequest(this.request)) {
		plugin.processIncomingRequest(this.request);
	}
}


Api.addRoute(':pluginName', {authRequired: true}, {
	post: pluginIncomingWebhook()
});
