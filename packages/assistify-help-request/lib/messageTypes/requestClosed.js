/* globals RocketChat */
import {RocketChat} from 'meteor/rocketchat:lib';

Meteor.startup(function() {
	RocketChat.MessageTypes.registerType({
		id: 'request_closed',
		system: true,
		message: 'Request_closed',
		data(message) {
			return {
				user_by: message.u.username,
				comment: message.msg
			};
		}
	});
	RocketChat.MessageTypes.registerType({
		id: 'request_closed_explanation',
		system: true,
		message: 'Request_closed_explanation',
		data(message) {
			return {
				user_by: message.u.username
			};
		}
	});
	RocketChat.MessageTypes.registerType({
		id: 'link-requests',
		system: true,
		message: 'Link-requests',
		data(message) {
			const room = RocketChat.models.Rooms.findOne({_id: message.channels[0]._id});
			let eventFound = null;
			for (const e of Template.room.__eventMaps) {
				eventFound = Object.keys(e).find(eventName => eventName === 'click .mention-navigate');
			}
			if (!eventFound) {
				const attachEvents = {
					'click .mention-navigate'(event) {
						//get the request name for router navigation
						FlowRouter.go('request', {name: $(event.currentTarget).data('request')}, FlowRouter.current().queryParams);
					}
				};
				//attach room events
				Template.room.events(attachEvents);
			}

			if (room.t === 'r') {
				return {
					roomName: ` <a class="mention-navigate" data-request="${ room.name }">${ message.msg } </a>`
				};
			}
			return {
				roomName: ` <a class="mention-link" data-channel="${ room.name }" >${ message.msg } </a>`
			};
		}
	});
});
