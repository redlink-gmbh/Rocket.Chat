import {PluginRegistry} from '../../lib/pluginRegistry';

/**
 Provides a API to which clients can register widgets
 Usually, the registry is used during startup of the application
 */
class ClientPluginRegistry extends PluginRegistry {
	add(clientPlugin) {
		super.add(clientPlugin);
	}
}

RocketChat.Plugins = new ClientPluginRegistry();

