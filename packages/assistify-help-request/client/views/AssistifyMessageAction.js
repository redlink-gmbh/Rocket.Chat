import {RocketChat} from 'meteor/rocketchat:lib';
import {FlowRouter} from 'meteor/kadira:flow-router';
import {ReactiveVar} from 'meteor/reactive-var';


Meteor.startup(function() {
	const instance = this;
	instance.room = new ReactiveVar('');
	RocketChat.MessageAction.addButton({
		id: 'help',
		icon: 'help',
		label: 'Help',
		context: ['message', 'message-mobile'],
		action() {
			const question = this._arguments[1];
			const modalConfig = {
				title: t('New_Request'),
				type: 'input',
				inputPlaceholder: t('New_request_for_expertise'),
				showCancelButton: true,
				confirmButtonText: t('Yes'),
				cancelButtonText: t('Cancel'),
				closeOnConfirm: true,
				html: true
			};
			modal.open(
				modalConfig,
				(requestTitle) => {
					if (question === false) {
						return;
					}
					Meteor.call('createRequestFromRoomId', requestTitle, question.rid, question.msg, function(error, success) {
						if (error) {
							console.log(error);
							switch (error.error) {
								default:
									return handleError(error);
							}
						}
					});
				});
		},
		condition(message) {
			if (RocketChat.models.Subscriptions.findOne({rid: message.rid}) == null) {
				return false;
			}

			return true;
		},
		order: 0,
		group: 'menu'
	});
});
