/* globals RocketChat */

import {FlowRouter} from 'meteor/kadira:flow-router';

/**
 * in order to provide links to messages which are stable (e. g. survive renaming a room or changing its type)
 * we introduce an explicit route. Since this needs to be executable on the client, we provide a method along with it
 */
FlowRouter.route('/message/:id', {
	name: 'message',
	action(params) {
		Meteor.call('getCurrentRouteLink', params.id, (err, res) => {
			if (!err && res) {
				FlowRouter.go(res);
			}
		});
	}
});

Meteor.methods({
	getCurrentRouteLink(messageId) {
		if (Meteor.isServer) {
			const message = RocketChat.models.Messages.findOneById(messageId);

			if (message && message.rid) {
				const room = RocketChat.models.Rooms.findOneById(message.rid);
				return FlowRouter.path(RocketChat.roomTypes.getRouteLink(room.t, room), '', {msg: message._id});
			} else {
				throw new Meteor.Error('invalid message');
			}
		}
	}
});
