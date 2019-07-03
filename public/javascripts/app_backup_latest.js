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
			this.renderNewContactForm();
			// AllContactsEngine.renderMainPage();
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

			this.$form.off('focus').on('focus', 'input', this.focusOnField.bind(this));
			this.$form.off('blur').on('blur', 'input', this.leaveField.bind(this));
			$('#full_name').off().on('keypress', this.blockNumericChars.bind(this));
			$('#phone_number').off().on('keypress', this.blockAlphabetChars.bind(this));
		},

		bindSubmitNewContactEvent: function() {
			this.$form.off('submit').on('submit', this.submitData.bind(this));
		},

		bindSubmitEditContactEvent: function() {
			this.$form.off('submit').on('submit', this.editData.bind(this));
		},

		submitData: function(e) {
			e.preventDefault();
			let form = e.target;

			let formValid = this.verifyForm();

			if (!formValid) {
				this.highlightInvalidFields();
				$('.form_errors').text('Fix errors before submitting this form');
			} else {
				console.log(form.action);
				console.log($(form).serializeArray());
				$.ajax({
					type: 'post',
					url: form.action,
					dataType: 'json',
					data: $(form).serializeArray(),
				})

				.done(function(json) {
					$('.new').slideUp(function() {
						$(this).remove();
						AllContactsEngine.renderMainPage();
					});
				})

				.fail(function(json) {
					console.log('fail');
				});
			}
		},

		editData: function(e) {
			e.preventDefault();
			let form = e.target;
			let id = Number($(form).attr('data-id'));

			let formValid = this.verifyForm();

			if (!formValid) {
				this.highlightInvalidFields();
				$('.form_errors').text('Fix errors before submitting this form');
			} else {
				$.ajax({
					type: 'put',
					url: form.action + '/' + id,
					dataType: 'json',
					data: $(form).serializeArray(),
				})

				.done(function(json) {
					$('.new').slideUp(function() {
						$(this).remove();
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
				self.contacts = data;
				$('main').append(self.contactsTemplate({contacts: self.contacts}));
				setTimeout(self.bindEvents.bind(self), 500);
			});
		},

		bindEvents: function() {
			$('input[name="delete"]').off('click').on('click', this.removeContact.bind(this));
			$('main').off('click').on('click', 'input[name="edit"]', this.editContact.bind(this));
			$('#add_contact').off('click').on('click', this.displayNewContact.bind(this));
		},

		removeContact: function(e) {
			let id = this.getContactId(e);
			let $contact = $(e.target).parents('.contact');

			$.ajax({
				url: 'api/contacts/' + id,
				type: 'delete',
			})

			.done(() => $contact.remove());
		},

		getContactId: function(e) {
			return $(e.target).parent('div').attr('data-id');
		},

		getInfo: function(number) {
			let result = null;
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
			let id = Number(this.getContactId(e));
			let self = this;

			self.getInfo(id).then(function(result) {
				$('.all_contacts').slideUp(function() {
					$(this).remove();
					EditContactEngine.renderContactForm(result);
				});
			});
		},

		displayNewContact: function(e) {
			$('.all_contacts').slideUp(function() {
				$(this).remove();
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







