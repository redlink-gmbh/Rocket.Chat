# Purpose
This package provides APIs for registering plugins.
All APIs in this package aim at being changed in a compatible mode, so that using those APIs can be considered safe.

# What is a plugin
A plugin is an application living in the right-hand-side "tab bar". It can be though of as a widget which visualizes an external system. Usually, this application depends on the room: What is the communication about, what additional information is necessary in order to support it.
In order to do that, the widget (precisely its server) needs to be updated in specific events (usually on creation of a new message). Also, it needs to update once the state of the external service changes and might even need to interact with the chat.

# Architecture
What you as a developer of a plugin should know:

## Coupling
Rocket.Chat already provides outgoing and incoming webhooks - so why is something else useful? You can think of a plugin being
* a set of outgoing and incoming webhooks
* with (client-side) visualization in the tabbar
* which can be pre-delivered and maintained as a package (no need to configure it in each and every Rocket.Chat-instance)

## Registry
On bot, server and client, `RocketChat.Plugins` provides a registry to which plugins can be provided. This is usually done on startup of the application.
_Please note that `RocketChat.Plugins` looks different on client and server!_

Rocket.Chat ships definitions of the plugins capabilities as abstract classes _(yeah, we know it's not what a Javascript native loves, but it's useful for defining a - well - interface)_.
Please check the method documentation for details on it usage.
Simply inherit from those classes and implement the methods you need to get it up and running.
