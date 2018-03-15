/* globals RocketChat */
import {RocketChat} from 'meteor/rocketchat:lib';
import {FlowRouter} from 'meteor/kadira:flow-router';

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
		id: 'thread-started-message',
		system: true,
		message: 'Thread-started-message',
		data(message) {
			/* Thread Start Message
			 * @Returns
			 * Thread Initiator
			 * Thread Room
			 * */
			return {
				initiator: ` <a class="mention-link" data-username= "${ message.mentions[0].name }" >${ message.mentions[0].name } </a> `
			};
		}
	});
	RocketChat.MessageTypes.registerType({
		id: 'thread-welcome-message',
		system: true,
		message: 'Thread-welcome-message',
		data(message) {
			/* Thread Welcome Message
 			 * @Returns
		     * Thread Initiator
		     * Parent Room Name
			 * Original Message
 			 * */
			const room = RocketChat.models.Rooms.findOne({_id: message.channels[0]._id});
			let attachEvents = true;
			for (const e of Template.room.__eventMaps) {
				if (Object.keys(e).find(eventName => eventName === 'click .mention-request' || eventName === 'click .mention-expertise')) {
					attachEvents = false; // we do not need to attach the events over and over.
				}
			}
			if (attachEvents) {
				Template.room.events({
					'click .mention-request'(event) {
						//Get the request name for router navigation
						FlowRouter.go('request', {name: $(event.currentTarget).data('request')}, FlowRouter.current().queryParams);
					},
					'click .mention-expertise'(event) {
						//Get the expertise name for router navigation
						FlowRouter.go('expertise', {name: $(event.currentTarget).data('expertise')}, FlowRouter.current().queryParams);
					}
				});
				console.log('eventsAttached');
			}
			/* Replace the place holder values of the system message*/
			if (room.t === 'r') {
				return {
					initiator: ` <a class="mention-link" data-username= "${ message.mentions[0].name }" >${ message.mentions[0].name } </a> `,
					roomName: ` <a class="mention-request" data-request="${ room.name }">${ room.fname || room.name } </a>`,
					message: ` <a href="${ message.msg }"> message </a>`
				};
			} else if (room.t === 'e') {
				return {
					initiator: ` <a class="mention-link" data-username= "${ message.mentions[0].name }" >${ message.mentions[0].name } </a> `,
					roomName: ` <a class="mention-expertise" data-expertise="${ room.name }">${ room.fname || room.name } </a>`,
					message: ` <a href="${ message.msg }"> message </a>`
				};
			}
			return {
				initiator: ` <a class="mention-link" data-username= "${ message.mentions[0].name }" >${ message.mentions[0].name } </a> `,
				roomName: ` <a class="mention-link" data-channel="${ room.name }" >${ room.fname || room.name } </a>`,
				message: ` <a href="${ message.msg }"> message </a>`
			};
		}
	});
});
