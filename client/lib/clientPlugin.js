class ClientPlugin {

	/**
	 Hook which allows to perform one-time operations, such as loading another framework, initializing globals and alike
	 */
	onStartup();

	/**
	 Returns an object with configuration about visualization
	 Which template shall be loaded into which tab with which name and icon?
	 */
	getTabConfig();

}
