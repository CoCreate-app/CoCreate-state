const CoCreatePassValues = {

	initPassValue: function() {
		const elements = document.querySelectorAll('[pass-value_id]');
		this.initPassValueElements(elements);
		let self = this;
		window.addEventListener('storage', function(e) {
			if (e.key == 'passedValues') {
				elements = document.querySelectorAll('[pass-value_id]')
				self.initPassValueElements(elements)
			}
		});

	},

	initPassValueElements: function(elements) {
		for (let element of elements)
			this.initPassValueElement(element);
	},

	// ToDo: increase performance by get values from local strage which contain pass_id then query elements using pass_id
	initPassValueElement: function(element) {
		let pass_value_id = element.getAttribute('pass-value_id');

		if (!pass_value_id) return;
		
		let passedValues = window.localStorage.getItem('passedValues');
		passedValues = JSON.parse(passedValues );
		if (!passedValues || passedValues.length == 0) return;
        let found = passedValues.find(everyItem => everyItem.pass_value_to == pass_value_id);
		if (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) {
			element.value = found.value;
			element.dispatchEvent(new Event('change'));
		}
		else 
			element.innerHTML = found.value;
	},

	passValueAction: function(btn) {
		let form = btn.closest('form');
		if (!form) return;

		let elements = form.querySelectorAll('[pass-value_to]');
		let passedValues = [];

		elements.forEach(el => {
			const pass_value_to = el.getAttribute('pass-value_to');

			let value;

			if (pass_value_to) {
				if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
					value = el.value;
				}
				else {
					value = el.innerHTML;
				}

				passedValues.push({
					pass_value_to: pass_value_to,
					value: value
				});
			}
		});

		if (passedValues.length > 0) {
			window.localStorage.setItem('passedValues', JSON.stringify(passedValues));
		}

		this._getPassValueId()

		// Todo: replace with custom event system
		document.dispatchEvent(new CustomEvent('passValueActionEnd', {
			detail: {}
		}))
	},

	initDataPassValues: function() {
		window.localStorage.removeItem('passedValues');
	},

	_getPassValueId: function() {
	    const elements = document.querySelectorAll('[pass-value_id]');
		this.initPassValueElements(elements);
	}

}

CoCreatePassValues.initPassValue();

export default CoCreatePassValues;
