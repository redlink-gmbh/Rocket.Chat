import {RocketChat} from 'meteor/rocketchat:lib';

class CreateRequestBase {
	constructor(requestTitle, roomId, openingQuestion, expertise, members, environment) {
		this.requestTitle = requestTitle;
		this.roomId = roomId;
		this.expertise = expertise;
		this.openingQuestion = openingQuestion;
		this.members = members;
		this.environment = environment;
	}

	static getExpertiseRoom(roomId, expertise) {
		if (roomId) {
			return RocketChat.models.Rooms.findOne(roomId);
		} else {
			return RocketChat.models.Rooms.findOneByName(expertise);
		}
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

	static getExperts(expertise) {
		const expertiseRoom = RocketChat.models.Rooms.findOneByName(expertise);
		if (expertiseRoom) {
			return expertiseRoom.usernames;
		} else {
			return []; // even if there are no experts in the room, this is valid. A bot could notify later on about this flaw
		}
	}

	createNotifications(requestId, usernames) {
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

	create() {
		const expertiseRoom = CreateRequestBase.getExpertiseRoom(this.roomId);
		if (expertiseRoom.name && !this.requestTitle) {
			this.name = `${ expertiseRoom.name }-${ CreateRequestBase.getNextId() }`;
		} else if (this.roomId && this.requestTitle) {
			this.name = `${ this.requestTitle }`;
		}

		const roomCreateResult = RocketChat.createRoom('r', this.name, Meteor.user() && Meteor.user().username, expertiseRoom.usernames, false, {parentRoomId: this.roomId});
		if (this.requestTitle) {
			RocketChat.saveRoomTopic(roomCreateResult.rid, expertiseRoom.name, Meteor.user());
		}
		if (expertiseRoom.t === 'e') {
			expertiseRoom.usernames.concat([Meteor.user().username]);
		}
		// Invoke create notifications
		this.createNotifications(roomCreateResult.rid, expertiseRoom.usernames);

		// Instance of newly created room.
		const room = RocketChat.models.Rooms.findOneById(roomCreateResult.rid);

		if (this.openingQuestion) {
			const msg = this.openingQuestion;
			const msgObject = {_id: Random.id(), rid: roomCreateResult.rid, msg};
			RocketChat.sendMessage(Meteor.user(), msgObject, room);
		}

		const helpRequestId = RocketChat.models.HelpRequests.createForSupportArea(expertiseRoom.name, roomCreateResult.rid, '');
		//propagate help-id to room in order to identify it as a "helped" room
		RocketChat.models.Rooms.addHelpRequestInfo(room, helpRequestId);

		return roomCreateResult;
	}

}

class CreateRequestFromRoomId extends CreateRequestBase {
	constructor(requestTitle, roomId, openingQuestion) {
		super(requestTitle, roomId, openingQuestion);
	}

	create() {
		return super.create();
	}
}

class CreateRequestFromExpertise extends CreateRequestBase {
	constructor(requestTitle, expertise, openingQuestion, members, environment) {
		super(requestTitle, '', openingQuestion, expertise, members, environment);
	}

	create() {
		if (this.expertise && !this.requestTitle) {
			this.name = `${ this.expertise }-${ CreateRequestBase.getNextId(this.expertise) }`;
		} else if (this.expertise && this.requestTitle) {
			this.name = `${ this.requestTitle }`;
		}

		if (this.expertise) {
			this.members = CreateRequestBase.getExperts(this.expertise);
		}
		const roomCreateResult = RocketChat.createRoom('r', this.name, Meteor.user() && Meteor.user().username, this.members, false, {expertise: this.expertise});
		if (this.requestTitle) {
			RocketChat.saveRoomTopic(roomCreateResult.rid, this.expertise, Meteor.user());
		}
		this.createNotifications(roomCreateResult.rid, this.members.concat([Meteor.user().username]));
		const room = RocketChat.models.Rooms.findOneById(roomCreateResult.rid);
		if (this.openingQuestion) {
			const msg = this.openingQuestion;
			const msgObject = {_id: Random.id(), rid: roomCreateResult.rid, msg};
			RocketChat.sendMessage(Meteor.user(), msgObject, room);
		}

		const helpRequestId = RocketChat.models.HelpRequests.createForSupportArea(this.expertise, roomCreateResult.rid, '', this.environment);
		//propagate help-id to room in order to identify it as a "helped" room
		RocketChat.models.Rooms.addHelpRequestInfo(room, helpRequestId);

		return roomCreateResult;
	}
}

Meteor.methods({
	createRequestFromRoomId(name, roomId, openingQuestion) {
		const createRequestRoom = new CreateRequestFromRoomId(
			name,
			roomId,
			openingQuestion
		);

		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {method: 'createRequestFromRoomId'});
		}
		const result = createRequestRoom.create();
		return result;
	},
	createRequest(name, expertise, openingQuestion, members, environment) {
		const createRequestRoom = new CreateRequestFromExpertise(
			name,
			expertise,
			openingQuestion,
			members,
			environment
		);
		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {method: 'createRequest'});
		}
		const result = createRequestRoom.create();
		return result;
	}
});

