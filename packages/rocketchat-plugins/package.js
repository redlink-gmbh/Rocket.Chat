Package.describe({
	name: 'rocketchat:plugins',
	version: '0.0.1',
	summary: 'Provides mechanisms for modification-free enhancements of Rocket.Chat',
	git: '',
	documentation: 'README.md'
});

Npm.depends({
});

Package.onUse(function(api) {
	api.use([
		'ecmascript',
		'templating',
		'rocketchat:lib'
	]);

	api.addFiles('lib/pluginRegistry.js');

	api.addFiles('client/lib/clientRegistry.js', 'client');
	api.addFiles('client/lib/clientPlugin.js', 'client');

	api.addFiles('server/lib/serverRegistry.js', 'client');
	api.addFiles('server/lib/serverPlugin.js', 'client');
	api.addFiles('server/lib/pluginAPI.js', 'client');

	// api.addFiles('server/methods/...', 'server');

    // api.addFiles('server/models/...', 'server');

	// api.addFiles('server/...', 'server');
});
