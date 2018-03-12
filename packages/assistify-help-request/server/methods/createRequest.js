import {RocketChat} from 'meteor/rocketchat:lib';

class CreateRequestBase {
	constructor(openingQuestion) {
		this._openingQuestion = openingQuestion;
	}

	static getNextId() {
		const settingsRaw = RocketChat.models.Settings.model.rawCollection();
		const findAndModify = Meteor.wrapAsync(settingsRaw.findAndModify, settingsRaw);

		const query = {
			_id: 'Assistify_Room_Count'
		};
		const update = {
			$inc: {
				value: 1
			}
		};
		const findAndModifyResult = findAndModify(query, null, update);
		return findAndModifyResult.value.value;
	}

	static getExpertiseRoom(roomId) {
		return RocketChat.models.Rooms.findOne(roomId);
	}

	_createNotifications(requestId, usernames) {
		const request = RocketChat.models.Rooms.findOneById(requestId);
		const expertise = RocketChat.models.Rooms.findByNameContainingAndTypes(request.expertise, 'e').fetch()[0];

		usernames.forEach((username) => {
			const user = RocketChat.models.Users.findOneByUsername(username);
			let subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(requestId, user._id);
			if (!subscription) {
				subscription = RocketChat.models.Subscriptions.createWithRoomAndUser(request, user);
			}

			if (expertise) {
				const expertiseSubscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(expertise._id, user._id);
				if (expertiseSubscription) {
					RocketChat.models.Subscriptions.updateDesktopNotificationsById(subscription._id, expertiseSubscription.desktopNotifications);
					RocketChat.models.Subscriptions.updateMobilePushNotificationsById(subscription._id, expertiseSubscription.mobilePushNotifications);
					RocketChat.models.Subscriptions.updateEmailNotificationsById(subscription._id, expertiseSubscription.emailNotifications);
					RocketChat.models.Subscriptions.updateAudioNotificationsById(subscription._id, expertiseSubscription.audioNotifications);
				}
			} else {
				// Fallback: notify everything
				RocketChat.models.Subscriptions.updateDesktopNotificationsById(subscription._id, 'all');
				RocketChat.models.Subscriptions.updateMobilePushNotificationsById(subscription._id, 'all');
				RocketChat.models.Subscriptions.updateEmailNotificationsById(subscription._id, 'all');
			}
		});
	}

	// abstract method must be implemented.
	_postMessage(room, user) {
		const msg = this._openingQuestion.msg;
		const msgObject = {_id: Random.id(), rid: room.rid, msg};
		return RocketChat.sendMessage(user, msgObject, room);
	}

	//abstract method should implemented.
	create() {
	}

}

class CreateRequestFromRoomId extends CreateRequestBase {
	constructor(parentRoomId, openingQuestion) {
		super(openingQuestion);
		this._parentRoomId = parentRoomId;
	}

	_linkMessages(roomCreated, parentRoom) {
		const rocketCatUser = RocketChat.models.Users.findOneByUsername('rocket.cat');
		if (rocketCatUser && Meteor.userId()) {
			/**
			 * When a message is eligible to be answered as a independent question then it can be threaded into a new channel.
			 * When threading, the question is re-posted into a new room. To leave origin traces between the messages we update
			 * the original message with system message to allow user to navigate to the message created in the new Room and vice verse.
			 */
			/* Parent Room */
			const message = RocketChat.models.Messages.createWithTypeRoomIdMessageAndUser('thread-started-message', parentRoom._id, '', rocketCatUser,
				{
					mentions: [
						{
							_id: Meteor.user()._id, // Thread Initiator
							name: Meteor.user().username
						}]
				});

			// synchronous call: Get the message url of the system message
			const messageURL = Meteor.call('assistify:getMessageURL', message._id);
			/* Child Room*/
			RocketChat.models.Messages.createWithTypeRoomIdMessageAndUser('thread-welcome-message', roomCreated._id, messageURL, rocketCatUser,
				{
					mentions: [{
						_id: Meteor.user()._id, // Thread Initiator
						name: Meteor.user().username // User @Name field for navigation
					}],
					channels: [{
						_id: parentRoom._id, // Parent Room ID
						name: parentRoom.fname || parentRoom.name
					}]
				});
			// Re-post message
			const msgAuthor = RocketChat.models.Users.findOneByUsername(this._openingQuestion.u.username); // Search with the technical username
			const msgRePosted = this._postMessage(roomCreated, msgAuthor);
			if (msgRePosted) {
				Meteor.call('assistify:getMessageURL', msgRePosted._id, (error, result) => {
					if (result) {
						/* Parent Room update the links by attaching the child room */
						RocketChat.models.Messages.setMessageAttachments(message._id, [{
							text: this._openingQuestion.msg,
							author_name: this._openingQuestion.u.username || this._openingQuestion.u.name,
							author_icon: `/avatar/${ this._openingQuestion.u.username }?_dc=0 `,
							message_link: result,
							ts: this._openingQuestion.ts,
							fields: [{
								short: true,
								value: `[Post your answer](${ result })`
							}]
						}]);
					}

				});
				// Delete the original message.
				Meteor.call('deleteMessage', {_id: this._openingQuestion._id});
			}
		}
	}

	create() {
		const expertiseRoom = CreateRequestBase.getExpertiseRoom(this._parentRoomId);
		if (expertiseRoom.name && !this._requestTitle) {
			this.name = `${ expertiseRoom.name }-${ CreateRequestBase.getNextId() }`;
		} else if (this._parentRoomId && this._requestTitle) {
			this.name = `${ this._requestTitle }`;
		}
		const roomCreateResult = RocketChat.createRoom('r', this.name, Meteor.user() && Meteor.user().username, expertiseRoom.usernames, false, {parentRoomId: this._parentRoomId});
		if (this._requestTitle) {
			RocketChat.saveRoomTopic(roomCreateResult.rid, expertiseRoom.name, Meteor.user());
		}
		if (expertiseRoom.t === 'e') {
			expertiseRoom.usernames.concat([Meteor.user().username]);
		}
		// Invoke create notifications
		this._createNotifications(roomCreateResult.rid, expertiseRoom.usernames);
		// Instance of newly created room.
		const room = RocketChat.models.Rooms.findOneById(roomCreateResult.rid);
		const parentRoom = RocketChat.models.Rooms.findOneById(this._parentRoomId);
		if (room && parentRoom) {
			this._linkMessages(room, parentRoom);
		}
		const helpRequestId = RocketChat.models.HelpRequests.createForSupportArea(expertiseRoom.name, roomCreateResult.rid, '');
		//propagate help-id to room in order to identify it  as a "helped" room
		RocketChat.models.Rooms.addHelpRequestInfo(room, helpRequestId);
		return roomCreateResult;
	}
}

class CreateRequestFromExpertise extends CreateRequestBase {
	constructor(requestTitle, expertise, openingQuestion, members, environment) {
		super(openingQuestion);
		this._expertise = expertise;
		this._members = members;
		this._environment = environment;
		this._requestTitle = requestTitle;
	}

	static getExperts(expertise) {
		const expertiseRoom = RocketChat.models.Rooms.findOneByName(expertise);
		if (expertiseRoom) {
			return expertiseRoom.usernames;
		} else {
			return []; // even if there are no experts in the room, this is valid. A bot could notify later on about this flaw
		}
	}

	create() {
		if (this._expertise && !this._requestTitle) {
			this.name = `${ this._expertise }-${ CreateRequestBase.getNextId(this._expertise) }`;
		} else if (this._expertise && this._requestTitle) {
			this.name = `${ this._requestTitle }`;
		}
		if (this._expertise) {
			this._members = CreateRequestFromExpertise.getExperts(this._expertise);
		}
		const roomCreateResult = RocketChat.createRoom('r', this.name, Meteor.user() && Meteor.user().username, this._members, false, {expertise: this._expertise});
		if (this._requestTitle) {
			RocketChat.saveRoomTopic(roomCreateResult.rid, this._expertise, Meteor.user());
		}
		this._createNotifications(roomCreateResult.rid, this._members.concat([Meteor.user().username]));
		const room = RocketChat.models.Rooms.findOneById(roomCreateResult.rid);
		if (this._openingQuestion) {
			this._postMessage(room, Meteor.user());
		}
		const helpRequestId = RocketChat.models.HelpRequests.createForSupportArea(this._expertise, roomCreateResult.rid, '', this._environment);
		//propagate help-id to room in order to identify it as a "helped" room
		RocketChat.models.Rooms.addHelpRequestInfo(room, helpRequestId);
		return roomCreateResult;
	}
}

class CreateRequestFactory {
	static getInstance(type, room) {
		if (type === 'E') {
			return new CreateRequestFromExpertise(
				room.requestTitle,
				room.expertise,
				room.openingQuestion,
				room.members,
				room.environment
			);
		} else {
			return new CreateRequestFromRoomId(
				room.parentRoomId,
				room.openingQuestion
			);
		}
	}
}

Meteor.methods({
	createRequestFromRoomId(parentRoomId, openingQuestion) {
		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {method: 'createRequestFromRoomId'});
		}
		const config = {
			parentRoomId,
			openingQuestion
		};
		return CreateRequestFactory.getInstance('R', config).create();
	},
	createRequest(requestTitle, expertise, openingQuestion, members, environment) {
		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {method: 'createRequest'});
		}
		const config = {
			requestTitle,
			expertise,
			openingQuestion,
			members,
			environment
		};
		return CreateRequestFactory.getInstance('E', config).create();
	}
});

