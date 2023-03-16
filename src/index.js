import observer from '@cocreate/observer';
import action from '@cocreate/actions';
import uid from '@cocreate/uuid';
import '@cocreate/element-prototype';
import localStorage from '@cocreate/local-storage';


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
	document.addEventListener('click', function(e) {
		const target = e.target.closest('[pass_to]');
		if (target) {
			if (target.closest('[actions*="pass"]')) return;
			passAttributes(target);
		}
	});

}

// ToDo: can be depreciated do to component localStorage
function __initPassSessionIds() {
	let orgId = localStorage.getItem('organization_id');
	let user_id = localStorage.getItem('user_id');
	__initPassItems(orgId, ".sessionOrg_Id", true);
	__initPassItems(user_id, ".sessionUser_Id");
}

// ToDo: can be depreciated do to component localStorage add to crud as a keyword document_id="{{user_id}}"
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

	let passedAttributes = localStorage.getItem('passedAttributes');
	
	if (!passedAttributes || passedAttributes.length == 0) return;
	passedAttributes = JSON.parse(passedAttributes);

	let attrValues = passedAttributes[`${pass_id}`];
	if (!attrValues) return;
	_setAttributeValues(element, attrValues);
}

function _setAttributeValues (el, attrValues) {
	let isRefresh = el.getAttribute('pass-refresh');
	if (isRefresh === null || isRefresh === undefined)
		isRefresh = attrValues['refresh']

	if (isRefresh && isRefresh != 'false' || isRefresh === '')
		isRefresh = true;
	else if (!isRefresh || isRefresh === 'false')
		isRefresh = false;

	delete attrValues['refresh']

	Object.keys(attrValues).forEach(key => {
		_setAttributeValue(el, key, attrValues[key], isRefresh);
		_setAttributeValue(el, `pass-${key}`, attrValues[key], isRefresh);
		if (key == 'collection' || key == 'document_id' || key == 'name') {
			_setAttributeValue(el, `fetch-${key}`, attrValues[key], isRefresh);
			_setAttributeValue(el, `pass-fetch-${key}`, attrValues[key], isRefresh);
		}
		if (key == 'template') {
			_setAttributeValue(el, 'template_id', attrValues[key], isRefresh);
		}
		if (key == 'template_id') {
			_setAttributeValue(el, 'template', attrValues[key], isRefresh);
		}
	});
}

function _setAttributeValue (element, attribute, value, isRefresh) {
	// ToDo: if (value !== undefined)???
	if (!element.getAttribute(attribute) || isRefresh) {
		if (attribute == 'value') {					
			if (element.value == '' || element.value && isRefresh)
				element.value = value;
			else if (isRefresh || element.hasAttribute('value') && !element.getValue())
				element.setValue(value)
		} else if (element.hasAttribute(attribute) && value)
			element.setAttribute(attribute, value);
	}
}

function passAttributes(element) {
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
		Object.assign(passedAttributes, {[`${pass_to}`]: attrValues});
		_getPassId(attrValues, pass_to);
	}
	
	localStorage.setItem('passedAttributes', JSON.stringify(passedAttributes));

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
				Object.assign(attributeValues, {[`${attribute.name.substring(5)}`]: uid.generate(6)});
			else if (attribute.name == 'pass-value' && !attribute.value) 
				Object.assign(attributeValues, {value: element.getvalue()});
			else
				Object.assign(attributeValues, {[`${attribute.name.substring(5)}`]: attribute.value});
		}
	}
	if (element.value !== undefined && !element.hasAttribute('pass-value'))
		Object.assign(attributeValues, {value: element.getvalue()});

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

export default {initElements, initElement, passAttributes};
