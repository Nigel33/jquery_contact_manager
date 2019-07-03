$(function() {
	const $main = $('main');

	let NewContactEngine = {
		newContactHeaderTemplate: null,
		registerTemplate: function() {
			this.newContactHeaderTemplate = Handlebars.compile($('#new_contact_header').html());
		},

		renderNewContactForm: function(e) {


			$main.append(this.newContactHeaderTemplate());
			FormBehaviorEngine.bindEvents();
			FormBehaviorEngine.bindSubmitNewContactEvent();
		},

		init: function() {
			this.registerTemplate();
			// this.renderNewContactForm();
			AllContactsEngine.renderMainPage();
		},
	};

	// -----------------------------------------------------------------------------
	// -----------------------------------------------------------------------------

	let FormBehaviorEngine = {
		result: null,
		$form: null,
		formTemplate: null,

		registerPartialTemplate: function() {
			this.formTemplate = Handlebars.compile($('#form').html());
			Handlebars.registerPartial('formTemplate', $('#form').html());
		},

		bindEvents: function() {
			this.$form = $('form');

			this.$form.on('focus', 'input', this.focusOnField.bind(this));
			this.$form.on('blur', 'input', this.leaveField.bind(this));
			$('#full_name').on('keypress', this.blockNumericChars.bind(this));
			$('#phone_number').on('keypress', this.blockAlphabetChars.bind(this));
		},

		bindSubmitNewContactEvent: function() {
			this.$form.off('submit').on('submit', this.submitData.bind(this));
		},

		bindSubmitEditContactEvent: function() {
			this.$form.off('submit').on('submit', this.editData.bind(this));
		},

		unbindEvents: function() {
			this.$form.off();
			$('#full_name').off();
			$('#phone_number').off();
		},

		submitData: function(e) {
			e.preventDefault();
			let currentForm = e.target;

			this.processForm(currentForm, 'post');
		},

		editData: function(e) {
			e.preventDefault();

			let currentForm = e.target;

			this.processForm(currentForm, 'put');
		},

		processForm: function(form, method) {
			let formValid = this.verifyForm();
			let id = Number($(form).attr('data-id'));
			let path;

			if (id) {
				path = form.action + '/' + id;
			} else {
				path = form.action;
			}

			if (!formValid) {
				this.highlightInvalidFields();
				$('.form_errors').text('Fix errors before submitting this form');
			} else {
				let self = this;
				$.ajax({
					type: method,
					url: path,
					dataType: 'json',
					data: $(form).serializeArray(),
				})

				.done(function(json) {
					$('.new').slideUp(function() {
						$(this).remove();
						self.unbindEvents();
						AllContactsEngine.renderMainPage();
					});
				})

				.fail(function(json) {
					console.log('fail');
				});
			}
		},

		focusOnField: function(e) {
			let $span = $(e.target).next('.error_message');
			$span.text('');

			$(e.target).removeClass('invalid_field');
		},

		leaveField: function(e) {
			let formValid = this.verifyForm();

			if (formValid) {
				$('.form_errors').text('');
			};

			this.handleInvalidInput(e.target);
		},

		handleInvalidInput: function(field) {
			let validState = field.validity;
			let info = $('label[for='+ $(field).attr('id') + ']').text();
			let $span = $(field).next('span');

			if (!validState || validState.valid) {
				return;
			}

			$(field).addClass('invalid_field');

			if (validState.valueMissing) {
				$span.text(info + ' ' + 'is a required field');
			} else if (validState.patternMismatch) {
				$span.text('Please enter a valid ' + info);
			}
		},

		verifyForm: function() {
			let data = this.$form.serializeArray();

			this.result = data.filter(function(point) {
				return !$('input[name=' + point.name + ']').get(0).validity.valid;
			});

			return this.result.length === 0;
		},

		highlightInvalidFields: function(e) {
			this.result.forEach(function (field) {
				let input = ($('input[name=' + field.name + ']')).get(0);
				this.handleInvalidInput(input);
			}, this);
		},


		blockNumericChars: function(e) {
			if (e.key.match(/[0-9]/)) {
				e.preventDefault();
			}
		},

		blockAlphabetChars: function(e) {
			if (e.key.match(/[a-z]/i)) {
				e.preventDefault();
			}
		},
	};

	// -----------------------------------------------------------------------------
	// -------------------------------------------------------------------------------

	let AllContactsEngine = {
		contacts: null,
		contactsTemplate: Handlebars.compile($('#contacts').html()),

		getAllContacts: function() {
			return new Promise(function(resolve, reject) {
				$.ajax({
					type: 'get',
					url: 'api/contacts',
					dataType: 'json',
				})

				.done(function(json) {
					resolve(json);
				});
			})
		},

		renderMainPage: function() {
			let self = this;
			this.getAllContacts().then(function(data) {
				self.contacts = self.processTags(data);
				$('main').append(self.contactsTemplate({contacts: self.contacts}));
				setTimeout(self.bindEvents.bind(self), 500);
			});
		},

		processTags: function(info) {
			info.map(function(contact) {
				let tags = contact.tags;
				contact.tags = this.formatTags(tags);
				return contact;
			}, this)

			return info;
		},

		formatTags: function(string) {
		 	return string.replace(/[' ']/g, '').split(',');
		},

		bindEvents: function() {
			$('main').on('click', this.editContact.bind(this));
			$('.tags').on('click', 'dd', this.filterByTag.bind(this));
			$('#add_contact').on('click', this.displayNewContact.bind(this));
			$('input[name="delete"]').on('click', this.removeContact.bind(this));
		},

		unbindEvents: function() {
			$('main').off();
			$('.tags').off();
			$('#add_contact').off();
			$('input[name="delete"]').off();
		},

		filterByTag: function(e) {
			e.stopPropagation();
			let tag = $(e.target).text().replace('#', '');
			let regex = new RegExp(tag);
			let matches;


			this.getAllContacts().then(function(result) {
				matches = result.filter(function(contact) {
					return !regex.test(contact.tags);
				})

				matches.forEach(function(contact) {
					let id = contact.id;
					$('.contact[data-id=' + id + ']').remove();
				});
			});
		},



		removeContact: function(e) {
			e.stopPropagation();
			let id = this.getContactId(e);
			let $contact = $(e.target).parents('.contact');

			$.ajax({
				url: 'api/contacts/' + id,
				type: 'delete',
			})

			.done(() => $contact.remove());
		},

		getContactId: function(e) {
			e.stopPropagation();
			return $(e.target).parent('div').attr('data-id');
		},

		getInfo: function(number) {
			let result = null;
			console.log(typeof number);
			return new Promise(function(resolve, reject) {
				$.ajax({
					url: 'api/contacts/' + number,
					type: 'get',
				})

				.done(function(response) {
					resolve(response);
				});
			});
		},

		editContact: function(e) {
			e.stopPropagation();

			let id = this.getContactId(e);
			let self = this;

			self.getInfo(id).then(function(result) {
				console.log(result);
				$('.all_contacts').slideUp(function() {
					$(this).remove();
					self.unbindEvents();
					EditContactEngine.renderContactForm(result);
				});
			});
		},

		displayNewContact: function(e) {
			e.stopPropagation();
			let self = this;

			$('.all_contacts').slideUp(function() {
				$(this).remove();
				self.unbindEvents();
				NewContactEngine.renderNewContactForm();
			});
		},
	};

	// -----------------------------------------------------------------------------
	// -------------------------------------------------------------------------------

	let EditContactEngine = {
		editContactHeaderTemplate: null,
		registerTemplate: function() {
			this.editContactHeaderTemplate = Handlebars.compile($('#edit_contact_header').html());
		},

		renderContactForm: function(data) {
			$main.append(this.editContactHeaderTemplate(data));
			FormBehaviorEngine.bindEvents();
			FormBehaviorEngine.bindSubmitEditContactEvent();
		},
	};



	FormBehaviorEngine.registerPartialTemplate();
	EditContactEngine.registerTemplate();
	NewContactEngine.init();
});







