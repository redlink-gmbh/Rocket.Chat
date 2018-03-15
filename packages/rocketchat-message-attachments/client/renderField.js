Template.renderField.helpers({
	specializedRendering(field) {
		let html = '';

		switch (field.type) {
			case 'threadReference':
				html = `<div><div class='thread-reference'>${ field.value }</div><a href='${ field.threadUrl }'>`;
				html += `<button class='rc-button rc-button--primary thread-url'>`;
				html += `<svg class="rc-icon tab-button-icon tab-button-icon--jump" aria-hidden="true"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#icon-jump"></use></svg>`
				html += `${ TAPi18n.__('Thread_view') }</button>`;
				html += `</a></div>`;
				break;
			default:
				// consider the value already formated as html
				html = value;
		}

		return html;
	}
});
