import observer from '@cocreate/observer';
import action from '@cocreate/actions';
import uid from '@cocreate/uuid';


function init() {
	__initPassSessionIds(); // will be derprciated for CoCreate-localStorage
	let elements = document.querySelectorAll('[pass_id]');
	initElements(elements);
	window.addEventListener('storage', function(e) {
		if (e.key == 'passedAttributes') {
			elements = document.querySelectorAll('[pass_id]')
			initElements(elements)
		}
	});

}

// ToDo: can be depreciated do to component localStorage
function __initPassSessionIds() {
	let orgId = window.localStorage.getItem('organization_id');
	let user_id = window.localStorage.getItem('user_id');
	__initPassItems(orgId, ".sessionOrg_Id", true);
	__initPassItems(user_id, ".sessionUser_Id");
}

// ToDo: can be depreciateddo to component localStorage
function __initPassItems(id, selector, noFetch) {
	if (id) {
		let elements = document.querySelectorAll(selector);
		elements.forEach(el => {
			_setAttributeValue(el, 'document_id', id);
			_setAttributeValue(el, 'fetch-document_id', id);
			_setAttributeValue(el, 'filter-value', id);
		});
	}
}

function initElements (elements) {
	for (let element of elements)
		initElement(element);
}

function initElement (element) {
	let pass_id = element.getAttribute('pass_id');
	if (!pass_id) return;

	let passedAttributes = window.localStorage.getItem('passedAttributes');
	
	passedAttributes = JSON.parse(passedAttributes);
	if (!passedAttributes || passedAttributes.length == 0) return;
	
	let attrValues = passedAttributes[`'${pass_id}'`];
	if (!attrValues) return;
	_setAttributeValues(element, attrValues);
}

function _setAttributeValues (el, attrValues) {
	let isRefresh = el.getAttribute('pass-refresh') || el.hasAttribute('pass-refresh');
	if (isRefresh === 'false' || isRefresh === false || isRefresh === null || isRefresh === undefined)
		isRefresh = false;
	else
		isRefresh = true;

	Object.keys(attrValues).forEach(key => {
		let attName = key.replace("'", '').replace("'", '');
		_setAttributeValue(el, attName, attrValues[key], isRefresh);
		_setAttributeValue(el, `pass-${attName}`, attrValues[key], isRefresh);
		if (attName == 'collection' || attName == 'document_id' || attName == 'name'){
			_setAttributeValue(el, `fetch-${attName}`, attrValues[key], isRefresh);
			_setAttributeValue(el, `pass-fetch-${attName}`, attrValues[key], isRefresh);
		}
	});

	// if (prefix) {
	// 	_setAttributeValue(el, 'name', prefix + el.getAttribute('name'), isRefresh, true);
	// 	_setAttributeValue(el, 'fetch-name', prefix + el.getAttribute('fetch-name'), isRefresh, true);
	// 	_setAttributeValue(el, 'pass-prefix', prefix, isRefresh);
	// }
}

function _setAttributeValue (element, attrname, value, isRefresh) {
	// ToDo: if (value !== undefined)???
	if (!element.getAttribute(attrname) || isRefresh) {
		if (attrname == 'value') {					
			if (element.value == '' || element.value && isRefresh)
				element.value = value;
			else if (isRefresh || !element.getValue())
				element.setValue(value)
		} else if (element.hasAttribute(attrname) && value)
			element.setAttribute(attrname, value);
	}
}

function passAttributes (element) {
	let passedAttributes = {};
	let elements = []

	let form = element.closest('form');
	if (form) {
		elements = form.querySelectorAll('[pass_to]')
	} else {
		if (element.hasAttribute('pass_to'))
			elements.push(element)
		let nestedElements = element.querySelectorAll('[pass_to]')
		elements.push(...nestedElements)
	}

	for (let i = 0; i < elements.length; i++) {
		let attrValues = _getAttributeValues(elements[i]);
		let pass_to = elements[i].getAttribute('pass_to');
		Object.assign(passedAttributes, {[`'${pass_to}'`]: attrValues});
		_getPassId(attrValues, pass_to);
	}
	
	window.localStorage.setItem('passedAttributes', JSON.stringify(passedAttributes));

	document.dispatchEvent(new CustomEvent('passEnd', {
		detail: {}
	}))

}

function _getAttributeValues (element) {
	let attributeValues = {};
	let attributes = element.attributes;
	for (let attribute of attributes){
		if (attribute.name.startsWith('pass-')) {
			if (attribute.value == '$uid')
				Object.assign(attributeValues, {[`'${attribute.name.substring(5)}'`]: uid.generate(6)});
			else if (attribute.name == 'pass-value' && !attribute.value) 
				Object.assign(attributeValues, {value: element.getvalue()});
			else
				Object.assign(attributeValues, {[`'${attribute.name.substring(5)}'`]: attribute.value});
		}
	}
	return attributeValues;
}

function _getPassId(attrValues, pass_to) {
	const elements = document.querySelectorAll(`[pass_id="${pass_to}"]`);
	for (let element of elements)
		_setAttributeValues(element, attrValues);
}


observer.init({
	name: 'CoCreatePass',
	observe: ['addedNodes'],
	target: '[pass_id]',
	callback: function(mutation) {
		initElement(mutation.target);
	}
});

action.init({
	name: "pass",
	endEvent: "passEnd",
	callback: (btn, data) => {
		passAttributes(btn);
	},
});

init();

export default {passAttributes};
