# General Purpose
Assistify is a multi-party-instant-messaging platform with integrated AI. Teams can use it for collaboration and solving problems. In this process, all participants are supported by "an AI" (natural language processing based text mining) which accelerates problem resolution.
In turn, interactions with AI results can help it to learn and get better.
Assistify is a symbiosis of human and machine brains.

## Compared to...
* Compared to slack and its plugins, it offers a flexible, open and enhanceable platform. With open source components out of the box, it has a very small footprint in dollars while at the same time running on premise. This makes it easy from a compliance point of view to be integrated into companies where ownership of conversational data plays a major role.
* Compared to instant messengers it offers native channel-oriented discussions and a flexible, web based architecture which makes it more than easy to be integrated into the actual context where the problems-to-be-solved occur.
* Compared to help desk solutions it offers ... much less from a functional side. And this can be a features as well: Professional help desk solutions are optimized for solving problems and documenting solutions. However, those solutions are usually quite expensive, integrated with telephony and imply a customer-agent-relationship. In collaborative scenarios, where colleagues or part-time-experts solve problems, a real help desk is a huge overhead with low user acceptance.

## Current status
Assistify has been developed as a proof of concept. As such, it has no production grade quality (yet). However, we're constantly improving quality and are positive we can reach enterprise readiness. If you are following the same goal and want to contribute: You're most welcome!

# Components / architecture
Assistify consists of majorly three logical components: A multi-party chat, an AI making sense of the conversation and multiple knowledge provides which cover particular domains of expertise.
Currently, those components are not yet separated properly, but the conversational AI and knowledge providers are tightly coupled.
Goal is flexible architecture in which interfaces are defined and a reference implementation is shipped, but where all components can be exchanged using dependency injection.

## Chat-implementation: Rocket.Chat
Rocket.Chat (short RC) is a popular open source chat tool. Based on the Meteor framework (Javascript + MongoDB) it allows hooks for extensibility out of the box. The project has a lot of traction and has reached a good level of maturity. Compared to the Go-Based competitor Mattermost, it provides much more features necessary at enterprise level (e. g. SAML authentication). The core-team at Rocket.Chat provides releases on an irregular frequency but at high speed (about every two weeks). Plus Javascript makes it very easy to hack enhancements on our own fork. On the downside, untyped Javascript makes it comparatively hard to provide stable, high quality software. Rocket.Chat has started to tackle this by providing more and more unit tests.
For Assistify, Rocket.Chat is the main runtime and as such place for extensions.

### Functional enhancements to Rocket.Chat
Being optimized for multi-party chats and making use of the event-based programming paradigm providing in-built hooks, we initially thought of providing a modification free plug-in. In reality, those interfaces however were not documented to such a level of detail that all aspects could be covered - and once we started making changes on fork-level, we stuck to it. The following sections aim at explaining why and where modifications have been implemented. If the RC core team decides to provide better APIs in order to re-implement those features as modification-free plug-ins, the better ;)

#### Knowledge base
Well, this is the obvious part: Once a message has been issued, the conversation needs to be sent to the conversational AI.
RC itself has provided a very basic integration for livechat-rooms and API.ai. Based on this implementation a custom adapter has been implemented. As the AI engine itself is stateless, state of the NLP analysis is captured within RC.

_Features:_
* Also trigger AI in non-livechat-rooms
* Visualize queries and results
* Caching of results
* Some sort of UI framework to "easily" integrate new query- and result-providers

_What's missing:_
* In RC:
  * A proper API (registry) to register AI-providers (e. g. triggering room types, filters) and their visualization (templates)
  * Additional callbacks for reacting on results (e. g. triggering a bot)
* In the current state of the custom modification:
  * Visualization of extracted tokens and interaction with them (confirmation, rejection, adding of custom tokens)
  * Actually, this whole integration visualization should better be provided by the AI-component. However, preferred technology (iFrame???) has not been decided yet. Suggestions welcome.
  * Code quality

#### Results bot
A custom bot has been implemented which is triggered once all results have been retrieved. This could of course be as well achieved by a (hu-)bot. However, this requires a different interface (compared to handing over the messages, structured results including their NLP-analysis need to be transmitted) and a dedicated hook.

#### Request - a room with an end
Channels as implemented in RC, Slack, Mattermost and alike are topic-driven multi-party discussions. However, what they are **lacking is that they end** once the purpose of the discussion has been fulfilled.
This is also what makes channels different compared to threads of the newsgroup-age.
With respect to learning (and this is what we're aiming at), threads are much easier to consume. Trolls removed, the condensed content is quite coherent. In a channel, multiple questions and answers can be mixed which makes it hard to learn from.
Therefore, two custom room types have been added: Request and expertise.

An _expertise_ denotes some area of knowledge. Multiple experts may personify this knowledge. An expertise is represented as a (never ending) channel in which experts may discuss internally.

A _request_ is a discussion between someone seeking information within a particular area of knowledge and the experts providing it. A request is comparable to a livechat-room with the difference that multiple persons may be joined providing information at once.

_Features:_
* An [API](https://github.com/mrsimpson/Rocket.Chat/blob/master/packages/assistify-help-request/server/api.js#L116) for creating requests
* An experts-channel (private group) where all experts (across expertises) meet. Users joined to this channel are given the ability to create expertises themselves.

_What's missing:_
* [Support for tags](https://github.com/mrsimpson/Rocket.Chat/issues/12)
* [Real authorizations](https://github.com/mrsimpson/Rocket.Chat/issues/12)
* [Externally provided expertises](https://github.com/mrsimpson/Rocket.Chat/issues/13)
* A **lot** of refactoring and code quality (e. g. fully reactive data sources, proper naming, coherent use of either extending existing collections or joined metadata, ...)

#### APIs used, APIs missed
* `RocketChat.roomTypes`
  * This seemed to be quite straight-forward copy-pasting.
  * The client side however is lacking some APIs in order to exposing the roomTypes to the user (particularly creation of custom room types listing them in the combinedFlex).
  * Some in-built views do not respect room types added via API (`membersList.coffee, adminRooms.coffee, room.coffee, createCombinedFlex.html/.coffee`)
* `RocketChat.Settings`
  * In general really mighty, but not too well documented. Particularly its properties. A schema would be appreciated.
  * Missed an ability to set settings from external configuration (e. g. a file provided in an env-variable)
  * Missed automatic cleanup (after startup, all settings which are not "added" anymore could be removed)
  * Missed API to display a setting in another group (maybe also in addition to the origin group)
* `RocketChat.callbacks`
  * Both add and run are very intuitive
  * Ability to remove callback (for API.ai-integration). All callbacks are in fact optional and should provide an ID in order to be able to remove them.
* `RocketChat.models.permissions` (still erroneous, though)
  * API could use some documentation (particularly the scope of the permission)
  * There are some places, where implicit assumptions about permission naming are made (e. g. `RocketChat.authz.hasAtLeastOnePermission("delete-#{roomType}")`)
  * Currently, a streamer exception is raised on the server once a custom permission for a room type is added

Other hacks
* I18N: This really gives a headache. Once i18n-files are being added to packages other than `rocketchat-i18n`, they are loadable but not available at runtime.
* tbc
