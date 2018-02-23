import {RocketChat} from 'meteor/rocketchat:lib';
import {FlowRouter} from 'meteor/kadira:flow-router';
import {ReactiveVar} from 'meteor/reactive-var';


Meteor.startup(function() {
	const instance = this;
	instance.room = new ReactiveVar('');
	RocketChat.MessageAction.addButton({
		id: 'help',
		icon: 'help',
		label: t('ask_help'),
		context: ['message', 'message-mobile'],
		action() {
			const question = this._arguments[1];
			const modalConfig = {
				title: t('Create request'),
				type: 'input',
				inputPlaceholder: t('New_request_for_expertise'),
				showCancelButton: true,
				confirmButtonText: t('Create'),
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
					Meteor.call('createRequestFromRoomId', requestTitle, question.rid, question.msg, function(error, result) {
						if (error) {
							console.log(error);
							switch (error.error) {
								default:
									return handleError(error);
							}
						}
						console.log('Room Created');
						// toastr.success(TAPi18n.__('New_request_created'));
						const roomCreated = RocketChat.models.Rooms.findOne({_id: result.rid});
						FlowRouter.go('request', {name: roomCreated.name}, FlowRouter.current().queryParams);
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
