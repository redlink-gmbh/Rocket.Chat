export class PluginRegistry {
	constructor() {
		this.plugins = new Map(); //todo: can be a collection as well
	}

	add(plugin) {
		return this.plugins.set(plugin.id, plugin);
	}

	get(id) {
		return this.plugins.get(id);
	}

	// remove(id) {
	// 	return this.plugins.delete(id);
	// }
}
