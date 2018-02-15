import {RocketChat} from 'meteor/rocketchat:lib';


class CreateRequestBase {
	constructor(requestTitle, openingQuestion) {
		this._requestTitle = requestTitle;
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

	static getExpertiseRoom(roomId) {
		return RocketChat.models.Rooms.findOne(roomId);
	}

	create() {
		const expertiseRoom = CreateRequestBase.getExpertiseRoom(this._roomId);
		if (expertiseRoom.name && !this._requestTitle) {
			this.name = `${ expertiseRoom.name }-${ CreateRequestBase.getNextId() }`;
		} else if (this._roomId && this._requestTitle) {
			this.name = `${ this._requestTitle }`;
		}

		const roomCreateResult = RocketChat.createRoom('r', this.name, Meteor.user() && Meteor.user().username, expertiseRoom.usernames, false, {parentRoomId: this._roomId});
		if (this._requestTitle) {
			RocketChat.saveRoomTopic(roomCreateResult.rid, expertiseRoom.name, Meteor.user());
		}
		if (expertiseRoom.t === 'e') {
			expertiseRoom.usernames.concat([Meteor.user().username]);
		}
		// Invoke create notifications
		this.createNotifications(roomCreateResult.rid, expertiseRoom.usernames);

		// Instance of newly created room.
		const room = RocketChat.models.Rooms.findOneById(roomCreateResult.rid);

		if (this._openingQuestion) {
			const msg = this._openingQuestion;
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
		super(requestTitle, openingQuestion);
		this._roomId = roomId;
	}

	create() {
		return super.create();
	}
}

class CreateRequestFromExpertise extends CreateRequestBase {
	constructor(requestTitle, expertise, openingQuestion, members, environment) {
		super(requestTitle, openingQuestion);
		this._expertise = expertise;
		this._members = members;
		this._environment = environment;
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
		this.createNotifications(roomCreateResult.rid, this._members.concat([Meteor.user().username]));
		const room = RocketChat.models.Rooms.findOneById(roomCreateResult.rid);
		if (this._openingQuestion) {
			const msg = this._openingQuestion;
			const msgObject = {_id: Random.id(), rid: roomCreateResult.rid, msg};
			RocketChat.sendMessage(Meteor.user(), msgObject, room);
		}

		const helpRequestId = RocketChat.models.HelpRequests.createForSupportArea(this._expertise, roomCreateResult.rid, '', this._environment);
		//propagate help-id to room in order to identify it as a "helped" room
		RocketChat.models.Rooms.addHelpRequestInfo(room, helpRequestId);

		return roomCreateResult;
	}
}

class CreateRequestFactory {
	static getInstance(type, requestTitle, expertise, roomId, openingQuestion, members, environment) {
		if (type === 'E') {
			return new CreateRequestFromExpertise(
				requestTitle,
				expertise,
				openingQuestion,
				members,
				environment
			);
		} else {
			return new CreateRequestFromRoomId(
				requestTitle,
				roomId,
				openingQuestion
			);
		}
	}
}

Meteor.methods({
	createRequestFromRoomId(requestTitle, roomId, openingQuestion) {
		const result = CreateRequestFactory.getInstance(
			'R',
			requestTitle,
			'',
			roomId,
			openingQuestion
		).create();
		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {method: 'createRequestFromRoomId'});
		}
		return result;
	},
	createRequest(requestTitle, expertise, openingQuestion, members, environment) {
		const result = CreateRequestFactory.getInstance(
			'E',
			requestTitle,
			expertise,
			'',
			openingQuestion,
			members,
			environment
		).create();
		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {method: 'createRequest'});
		}
		return result;
	}
});

