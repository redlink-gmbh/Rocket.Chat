/* globals RocketChat */

import {PluginRegistry} from '../../lib/pluginRegistry';

/**
 Provides an API consisting basically of webhooks - incoming and outgoing
 Usually, the registry is used during startup of the application
 */
class ServerPluginRegistry extends PluginRegistry {

	// add(plugin) {
	// 	super.add(plugin);
	// }

	loadPlugins() {
		const pluginsLoaded = [];
		return pluginsLoaded;
	}

	getWebhook(pluginId) {

	}

	_registerCallbacks() {
		const callbacksCreated = [];

		/*
		 Create callbacks for all methods redefined in the plugin
		 @see packages/rocketchat-integrations/server/triggers.js
		 */
		for (const plugin in this.plugins) {
			if (Object.getPrototypeOf(plugin).hasOwnProperty('onMessage')) {
				RocketChat.callbacks.add('afterSaveMessage', plugin.onMessage, RocketChat.callbacks.priority.LOW, 'plugin-${plugin.name}-onMessage');
			}

			if (Object.getPrototypeOf(plugin).hasOwnProperty('onClose')) {
				RocketChat.callbacks.add('afterCloseChannel', plugin.onClose, RocketChat.callbacks.priority.LOW, 'plugin-${plugin.name}-onClose'); //todo: check Close-Hook - doesn't exist before implementation of issue https://github.com/RocketChat/Rocket.Chat/issues/6888
			}
		}

		return callbacksCreated;
	}

	_createWebhooks() {
		const webhooksCreated = [];
		return webhooksCreated;
	}
}

RocketChat.Plugins = new ServerPluginRegistry();

