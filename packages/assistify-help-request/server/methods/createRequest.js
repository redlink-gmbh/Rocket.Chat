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
	_sendMessage(room) {
		const msg = this._openingQuestion;
		const msgObject = {_id: Random.id(), rid: room.rid, msg};
		RocketChat.sendMessage(Meteor.user(), msgObject, room);
	}
	//abstract method should implemented.
	create() {}

}

class CreateRequestFromRoomId extends CreateRequestBase {
	constructor(parentRoomId, openingQuestion) {
		super(openingQuestion);
		this._parentRoomId = parentRoomId;
	}
	_linkRequests(roomCreated, parentRoom) {
		const rocketCatUser = RocketChat.models.Users.findOneByUsername('rocket.cat');
		if (rocketCatUser) {
			//Create link to child room
			RocketChat.models.Messages.createWithTypeRoomIdMessageAndUser('link-requests', parentRoom._id, `#${ roomCreated.name } `, rocketCatUser, {channels:[{_id: roomCreated._id, name: roomCreated.fname}]});
			// Create link to parent room
			RocketChat.models.Messages.createWithTypeRoomIdMessageAndUser('link-requests', roomCreated._id, `#${ parentRoom.name } `, rocketCatUser, {channels:[{_id: parentRoom._id, name: parentRoom.fname || parentRoom.name }]});
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
		if (this._openingQuestion) {
			this._sendMessage(room);
		}
		//create parent and child room association.
		if (parentRoom && room) {
			this._linkRequests(room, parentRoom);
		}
		const helpRequestId = RocketChat.models.HelpRequests.createForSupportArea(expertiseRoom.name, roomCreateResult.rid, '');
		//propagate help-id to room in order to identify it as a "helped" room
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
			this._sendMessage(room);
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

