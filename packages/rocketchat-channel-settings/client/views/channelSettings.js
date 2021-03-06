import toastr from 'toastr';

Template.channelSettings.helpers({
	toArray(obj) {
		return Object.keys(obj).map((key) => {
			return {
				$key: key,
				$value: obj[key]
			};
		});
	},
	valueOf(obj, key) {
		if (key === 't') {
			if (obj[key] === 'c') {
				return false;
			}
			return true;
		}
		if (this.$value.getValue) {
			return this.$value.getValue(obj, key);
		}
		return obj && obj[key];
	},
	showSetting(setting, room) {
		if (setting.showInDirect === false) {
			return room.t !== 'd';
		}
		return true;
	},
	settings() {
		return Template.instance().settings;
	},
	getRoom() {
		return ChatRoom.findOne(this.rid);
	},
	editing(field) {
		return Template.instance().editing.get() === field;
	},
	isDisabled(field, room) {
		const setting = Template.instance().settings[field];
		return (typeof setting.disabled === 'function' && setting.disabled(room)) || setting.processing.get() || !RocketChat.authz.hasAllPermission('edit-room', room._id);
	},
	channelSettings() {
		return RocketChat.ChannelSettings.getOptions(Template.currentData(), 'room');
	},
	unscape(value) {
		return s.unescapeHTML(value);
	},
	canDeleteRoom() {
		const room = ChatRoom.findOne(this.rid, {
			fields: {
				t: 1
			}
		});
		const roomType = room && room.t;
		/*
		dirty hack since custom permissions create in packages/assistify-help-request/startup/customRoomTypes.js
		lead to a streamer exception in some occasions.
		*/
		if (roomType === 'e') {
			return roomType && RocketChat.authz.hasAtLeastOnePermission('delete-c');
		}
		return roomType && RocketChat.authz.hasAtLeastOnePermission(`delete-${ roomType }`, this.rid);
	},
	readOnly() {
		const room = ChatRoom.findOne(this.rid, {
			fields: {
				ro: 1
			}
		});
		return room && room.ro;
	},
	has(v, key) {
		return !!(v && v[key]);
	},
	readOnlyDescription() {
		const room = ChatRoom.findOne(this.rid, {
			fields: {
				ro: 1
			}
		});
		return t(room && room.ro ? 'True' : 'False');
	}
});

Template.channelSettings.events({
	'click .delete'() {
		return swal({
			title: t('Are_you_sure'),
			text: t('Delete_Room_Warning'),
			type: 'warning',
			showCancelButton: true,
			confirmButtonColor: '#DD6B55',
			confirmButtonText: t('Yes_delete_it'),
			cancelButtonText: t('Cancel'),
			closeOnConfirm: false,
			html: false
		}, () => {
			swal.disableButtons();
			Meteor.call('eraseRoom', this.rid, function(error) {
				if (error) {
					handleError(error);
					return swal.enableButtons();
				}
				swal({
					title: t('Deleted'),
					text: t('Room_has_been_deleted'),
					type: 'success',
					timer: 2000,
					showConfirmButton: false
				});
			});
		});
	},
	'keydown input[type=text]'(e, t) {
		if (e.keyCode === 13) {
			e.preventDefault();
			t.saveSetting();
		}
	},
	'click [data-edit], click .button.edit'(e, t) {
		e.preventDefault();
		let input = $(e.currentTarget);

		if (input.hasClass('button')) {
			input = $(e.currentTarget).siblings('.current-setting');
		}

		if (input.data('edit')) {
			t.editing.set(input.data('edit'));
			setTimeout((function() {
				return t.$('input.editing').focus().select();
			}), 100);
		}
	},
	'change [type="radio"]'(e, t) {
		return t.editing.set($(e.currentTarget).attr('name'));
	},
	'change [type="checkbox"]'(e, t) {
		t.editing.set($(e.currentTarget).attr('name'));
		return t.saveSetting();
	},
	'click .cancel'(e, t) {
		e.preventDefault();
		return t.editing.set();
	},
	'click .save'(e, t) {
		e.preventDefault();
		return t.saveSetting();
	}
});

Template.channelSettings.onCreated(function() {
	this.editing = new ReactiveVar;
	this.settings = {
		name: {
			type: 'text',
			label: 'Name',
			canView(room) {
				return room.t !== 'd';
			},
			canEdit(room) {
				return RocketChat.authz.hasAllPermission('edit-room', room._id);
			},
			getValue(room) {
				if (RocketChat.settings.get('UI_Allow_room_names_with_special_chars')) {
					return room.fname || room.name;
				}
				return room.name;
			},
			save(value, room) {
				let nameValidation;
				if (!RocketChat.authz.hasAllPermission('edit-room', room._id) || (room.t !== 'c' && room.t !== 'p' && room.t !== 'e' && room.t !== 'r')) {
					return toastr.error(t('error-not-allowed'));
				}
				if (!RocketChat.settings.get('UI_Allow_room_names_with_special_chars')) {
					try {
						nameValidation = new RegExp(`^${ RocketChat.settings.get('UTF8_Names_Validation') }$`);
					} catch (error1) {
						nameValidation = new RegExp('^[0-9a-zA-Z-_.]+$');
					}
					if (!nameValidation.test(value)) {
						return toastr.error(t('error-invalid-room-name', {
							room_name: {
								name: value
							}
						}));
					}
				}
				Meteor.call('saveRoomSettings', room._id, 'roomName', value, function(err) {
					if (err) {
						return handleError(err);
					}
					RocketChat.callbacks.run('roomNameChanged', {
						_id: room._id,
						name: value
					});
					return toastr.success(TAPi18n.__('Room_name_changed_successfully'));
				});
			}
		},
		topic: {
			type: 'markdown',
			label: 'Topic',
			canView() {
				return true;
			},
			canEdit(room) {
				return RocketChat.authz.hasAllPermission('edit-room', room._id);
			},
			save(value, room) {
				return Meteor.call('saveRoomSettings', room._id, 'roomTopic', value, function(err) {
					if (err) {
						return handleError(err);
					}
					toastr.success(TAPi18n.__('Room_topic_changed_successfully'));
					return RocketChat.callbacks.run('roomTopicChanged', room);
				});
			}
		},
		announcement: {
			type: 'markdown',
			label: 'Announcement',
			canView() {
				return true;
			},
			canEdit(room) {
				return RocketChat.authz.hasAllPermission('edit-room', room._id);
			},
			save(value, room) {
				return Meteor.call('saveRoomSettings', room._id, 'roomAnnouncement', value, function(err) {
					if (err) {
						return handleError(err);
					}
					toastr.success(TAPi18n.__('Room_announcement_changed_successfully'));
					return RocketChat.callbacks.run('roomAnnouncementChanged', room);
				});
			}
		},
		description: {
			type: 'text',
			label: 'Description',
			canView(room) {
				return room.t !== 'd';
			},
			canEdit(room) {
				return RocketChat.authz.hasAllPermission('edit-room', room._id);
			},
			save(value, room) {
				return Meteor.call('saveRoomSettings', room._id, 'roomDescription', value, function(err) {
					if (err) {
						return handleError(err);
					}
					return toastr.success(TAPi18n.__('Room_description_changed_successfully'));
				});
			}
		},
		t: {
			type: 'boolean',
			label: 'Private',
			isToggle: true,
			processing: new ReactiveVar(false),
			disabled(room) {
				return room['default'] && !RocketChat.authz.hasRole(Meteor.userId(), 'admin');
			},
			message(room) {
				if (RocketChat.authz.hasAllPermission('edit-room', room._id) && room['default']) {
					if (!RocketChat.authz.hasRole(Meteor.userId(), 'admin')) {
						return 'Room_type_of_default_rooms_cant_be_changed';
					}
				}
			},
			canView(room) {
				if (['c', 'p'].includes(room.t) === false) {
					return false;
				} else if (room.t === 'p' && !RocketChat.authz.hasAllPermission('create-c')) {
					return false;
				} else if (room.t === 'c' && !RocketChat.authz.hasAllPermission('create-p')) {
					return false;
				}
				return true;
			},
			canEdit(room) {
				return (RocketChat.authz.hasAllPermission('edit-room', room._id) && !room['default']) || RocketChat.authz.hasRole(Meteor.userId(), 'admin');
			},
			save(value, room) {
				const saveRoomSettings = () => {
					this.processing.set(true);
					value = value ? 'p' : 'c';
					RocketChat.callbacks.run('roomTypeChanged', room);
					return Meteor.call('saveRoomSettings', room._id, 'roomType', value, (err) => {
						if (err) {
							return handleError(err);
						}
						this.processing.set(false);
						return toastr.success(TAPi18n.__('Room_type_changed_successfully'));
					});
				};
				if (room['default']) {
					if (RocketChat.authz.hasRole(Meteor.userId(), 'admin')) {
						swal({
							title: t('Room_default_change_to_private_will_be_default_no_more'),
							type: 'warning',
							showCancelButton: true,
							confirmButtonColor: '#DD6B55',
							confirmButtonText: t('Yes'),
							cancelButtonText: t('Cancel'),
							closeOnConfirm: true,
							html: false
						}, function(confirmed) {
							if (confirmed) {
								return saveRoomSettings();
							}
						});
					}
					return $('.channel-settings form [name=\'t\']').prop('checked', !!room.type === 'p');
				} else {
					return saveRoomSettings();
				}
			}
		},
		ro: {
			type: 'boolean',
			label: 'Read_only',
			isToggle: true,
			processing: new ReactiveVar(false),
			canView(room) {
				return room.t !== 'd';
			},
			canEdit(room) {
				return RocketChat.authz.hasAllPermission('set-readonly', room._id);
			},
			save(value, room) {
				this.processing.set(true);
				return Meteor.call('saveRoomSettings', room._id, 'readOnly', value, (err) => {
					if (err) {
						return handleError(err);
					}
					this.processing.set(false);
					return toastr.success(TAPi18n.__('Read_only_changed_successfully'));
				});
			}
		},
		reactWhenReadOnly: {
			type: 'boolean',
			label: 'React_when_read_only',
			isToggle: true,
			processing: new ReactiveVar(false),
			canView(room) {
				return room.t !== 'd' && room.ro;
			},
			canEdit(room) {
				return RocketChat.authz.hasAllPermission('set-react-when-readonly', room._id);
			},
			save(value, room) {
				this.processing.set(true);
				return Meteor.call('saveRoomSettings', room._id, 'reactWhenReadOnly', value, (err) => {
					if (err) {
						return handleError(err);
					}
					this.processing.set(false);
					return toastr.success(TAPi18n.__('React_when_read_only_changed_successfully'));
				});
			}
		},
		archived: {
			type: 'boolean',
			label: 'Room_archivation_state_true',
			isToggle: true,
			processing: new ReactiveVar(false),
			canView(room) {
				return room.t !== 'd';
			},
			canEdit(room) {
				return RocketChat.authz.hasAtLeastOnePermission(['archive-room', 'unarchive-room'], room._id);
			},
			save(value, room) {
				return swal({
					title: t('Are_you_sure'),
					type: 'warning',
					showCancelButton: true,
					confirmButtonColor: '#DD6B55',
					confirmButtonText: value ? t('Yes_archive_it') : t('Yes_unarchive_it'),
					cancelButtonText: t('Cancel'),
					closeOnConfirm: false,
					html: false
				}, function(confirmed) {
					swal.disableButtons();
					if (confirmed) {
						const action = value ? 'archiveRoom' : 'unarchiveRoom';
						return Meteor.call(action, room._id, function(err) {
							if (err) {
								swal.enableButtons();
								handleError(err);
							}
							swal({
								title: value ? t('Room_archived') : t('Room_has_been_archived'),
								text: value ? t('Room_has_been_archived') : t('Room_has_been_unarchived'),
								type: 'success',
								timer: 2000,
								showConfirmButton: false
							});
							return RocketChat.callbacks.run(action, room);
						});
					} else {
						return $('.channel-settings form [name=\'archived\']').prop('checked', !!room.archived);
					}
				});
			}
		},
		joinCode: {
			type: 'text',
			label: 'Password',
			canView(room) {
				return room.t === 'c' && RocketChat.authz.hasAllPermission('edit-room', room._id);
			},
			canEdit(room) {
				return RocketChat.authz.hasAllPermission('edit-room', room._id);
			},
			save(value, room) {
				return Meteor.call('saveRoomSettings', room._id, 'joinCode', value, function(err) {
					if (err) {
						return handleError(err);
					}
					toastr.success(TAPi18n.__('Room_password_changed_successfully'));
					return RocketChat.callbacks.run('roomCodeChanged', room);
				});
			}
		}
	};
	return this.saveSetting = () => {
		const room = ChatRoom.findOne(this.data && this.data.rid);
		const field = this.editing.get();
		let value;
		if (this.settings[field].type === 'select') {
			value = this.$(`.channel-settings form [name=${ field }]:checked`).val();
		} else if (this.settings[field].type === 'boolean') {
			value = this.$(`.channel-settings form [name=${ field }]`).is(':checked');
		} else {
			value = this.$(`.channel-settings form [name=${ field }]`).val();
		}
		if (value !== room[field]) {
			this.settings[field].save(value, room);
		}
		return this.editing.set();
	};
});
