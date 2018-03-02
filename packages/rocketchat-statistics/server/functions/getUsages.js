

export function getUsages() {
	const db = RocketChat.models.Users;
	const usages = db.model.aggregate([
		{
			$lookup:
					{
						from: 'rocketchat_message',
						localField: '_id',
						foreignField: 'u._id',
						as: 'msg'
					}
		},
		{
			$unwind: '$msg'
		},
		{
			$lookup:
					{
						from: 'rocketchat_room',
						localField: 'msg.rid',
						foreignField: '_id',
						as: 'msgRooms'
					}
		},
		{
			$unwind: '$msgRooms'
		},
		{
			$unwind: '$emails'
		},
		{
			$group:
					{
						_id: { uid: '$_id', email: '$emails.address', msgRoom: '$msgRooms.t'},
						messages: { $sum: 1 }
					}
		},
		{
			$lookup:
					{
						from: 'rocketchat_subscription',
						localField: '_id.uid',
						foreignField: 'u._id',
						as: 'subs'
					}
		},
		{
			$unwind: '$subs'
		},
		{
			$group:
					{
						_id: { email: '$_id.email', msgRoom: '$_id.msgRoom', messages: '$messages', subsRoom: '$subs.t'},
						subs: { $sum: 1 }
					}
		},
		{
			$group:
					{
						_id: { email: '$_id.email'},
						sub:
							{
								$addToSet:
									{
										type: '$_id.subsRoom',
										subscriptions: '$subs'
									}

							},
						msg:
							{
								$addToSet:
									{
										type: '$_id.msgRoom',
										messages: '$_id.messages'
									}
							}
					}
		}
	]);

	console.log(usages);
	return usages;
}



// db.users.aggregate([
// 	{
// 			$match: { _id: 'rocketchat.internal.admin.test'}
// 	},
// 	{
// 			$lookup:
// 			{
// 					from: 'rocketchat_message',
// 					localField: '_id',
// 					foreignField: 'u._id',
// 					as: 'msg'
// 			}
// 	},
// 	{
// 			$unwind: '$msg'
// 	},
// 	{
// 			$lookup:
// 			{
// 					from: 'rocketchat_room',
// 					localField: 'msg.rid',
// 					foreignField: '_id',
// 					as: 'msgRooms'
// 			}
// 	},
// 	{
// 			$unwind: '$msgRooms'
// 	},
// 	{
// 			$unwind: '$emails'
// 	},
// 	{
// 			$group:
// 			{
// 					_id: { uid: '$_id', email: '$emails.address', msgRoom: '$msgRooms.t'},
// 					messages: { $sum: 1 }
// 			}
// 	},
// 	{
// 			$lookup:
// 			{
// 					from: 'rocketchat_subscription',
// 					localField: '_id.uid',
// 					foreignField: 'u._id',
// 					as: 'subs'
// 			}
// 	},
// 	{
// 			$unwind: '$subs'
// 	},
// 	{
// 			$group:
// 			{
// 					_id: { email: '$_id.email', msgRoom: '$_id.msgRoom', messages: '$messages', subsRoom: '$subs.t'},
// 					subs: { $sum: 1 }
// 			}
// 	},
// 	{
// 			$group:
// 			{
// 					_id: { email: '$_id.email'},
// 					sub:
// 					{
// 							$addToSet:
// 							{
// 									type: '$_id.subsRoom',
// 									subscriptions: '$subs'
// 							}

// 					},
// 					msg:
// 					{
// 							$addToSet:
// 							{
// 									type: '$_id.msgRoom',
// 									messages: '$_id.messages'
// 							}
// 					}
// 			}
// 	}
// 	])
