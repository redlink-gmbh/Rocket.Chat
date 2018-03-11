Meteor.methods({
	'assistify:getMessageURL'(msgId) {
		if (msgId) {
			const message = RocketChat.models.Messages.findOneById(msgId);
			const room = RocketChat.models.Rooms.findOneById(message.rid);
			const routePath = RocketChat.roomTypes.getRouteLink(room.t, room);
			return `${ Meteor.absoluteUrl().replace(/\/$/, '') + routePath }?msg=${ msgId }`;
		}
		throw new Meteor.Error('error-invalid-room', 'Invalid room', { method: 'getMessageURL' });
	}
});
