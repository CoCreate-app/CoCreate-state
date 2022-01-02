const CoCreatePassAttributes = {

	init: function() {
		var elements = document.querySelectorAll('[pass_id]');
		this.initElements(elements);
	},

	initElements: function(elements) {
		for (let element of elements)
			this.initElement(element);
	},

	initElement: function(element) {
		let pass_id = element.getAttribute('pass_id');
		if (!pass_id) return;

		let passedAttributes = window.localStorage.getItem('passedAttributes');
		passedAttributes = JSON.parse(passedAttributes);
		if (!passedAttributes || passedAttributes.length == 0) return;
		
		let attrValues = passedAttributes[`'${pass_id}'`];
		if (!attrValues) return;
		this._setAttributeValues(element, attrValues);
	},

	_setAttributeValues: function(el, attrValues) {
		const isRefresh = el.hasAttribute('pass-refresh') ? true : false;

		Object.keys(attrValues).forEach(key => {
			let attName = key.replace("'", '').replace("'", '');
			this._setAttributeValue(el, attName, attrValues[key], isRefresh);
			this._setAttributeValue(el, `pass-${attName}`, attrValues[key], isRefresh);
			if (attName == 'collection' || attName == 'document_id' || attName == 'name'){
				this._setAttributeValue(el, `fetch-${attName}`, attrValues[key], isRefresh);
				this._setAttributeValue(el, `pass-fetch-${attName}`, attrValues[key], isRefresh);
			}
		});

		// if (prefix) {
		// 	this._setAttributeValue(el, 'name', prefix + el.getAttribute('name'), isRefresh, true);
		// 	this._setAttributeValue(el, 'fetch-name', prefix + el.getAttribute('fetch-name'), isRefresh, true);
		// 	this._setAttributeValue(el, 'pass-prefix', prefix, isRefresh);
		// }
	},

	_setAttributeValue: function(element, attrname, value, isRefresh) {
		if (value) {
			// if (attrname == 'value') {
			// 	if (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) {
			// 		element.value = value;
			// 	// element.setAttribute(attrname, value);
			// 	}
			// 	else {
			// 		element.innerHTML = value;
			// 	}
			// }
			if (element.hasAttribute(attrname)) {
				if (!element.getAttribute(attrname) || isRefresh)
					element.setAttribute(attrname, value);
			}
		}
	},

	_setPassAttributes: function(element) {
		let passedAttributes = {};
		const self = this;
		if (element.hasAttribute('pass_to')) {
			let attrValues = self._getPassAttributes(element);
			let pass_to = element.getAttribute('pass_to');
			Object.assign(passedAttributes, {[`'${pass_to}'`]: attrValues});
			self._getPassId(attrValues, pass_to);
		}

		let elements = element.querySelectorAll('[pass_to]');
		elements.forEach((el) => {
			let attrValues = self._getPassAttributes(el);
			let pass_to = el.getAttribute('pass_to');
			Object.assign(passedAttributes, {[`'${pass_to}'`]: attrValues});
			self._getPassId(attrValues, pass_to);
		});
		
		window.localStorage.setItem('passedAttributes', JSON.stringify(passedAttributes));
	},
	
	_getPassAttributes: function(element) {
		let attributeValues = {};
		let attributes = element.attributes;
		for (let attribute of attributes){
			if (attribute.name.startsWith('pass-')){
				Object.assign(attributeValues, {[`'${attribute.name.substring(5)}'`]: attribute.value});
			}
		}
		return attributeValues;
	},
	
	_getPassId: function(attrValues, pass_to) {
	    const elements = document.querySelectorAll(`[pass_id="${pass_to}"]`);
		for (let element of elements)
        	this._setAttributeValues(element, attrValues);
	}
};

CoCreatePassAttributes.init();

export default CoCreatePassAttributes;
