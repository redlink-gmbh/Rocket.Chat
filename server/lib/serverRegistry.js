/* globals RocketChat */

import {PluginRegistry} from '../../lib/pluginRegistry';

/**
 Provides an API consisting basically of webhooks - incoming and outgoing
 Usually, the registry is used during startup of the application
 */
class ServerPluginRegistry extends PluginRegistry {

	add(plugin) {
		super.add(plugin);

		if (plugin.onMessage) {
			RocketChat.callbacks.add('afterSaveMessage', plugin.onMessage, RocketChat.callbacks.priority.LOW);
		}
		//@see packages/rocketchat-integrations/server/api/api.js
	}
}

RocketChat.Plugins = new ServerPluginRegistry();

