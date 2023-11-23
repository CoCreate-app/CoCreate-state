import '@cocreate/element-prototype';
import observer from '@cocreate/observer';
import action from '@cocreate/actions';
import uid from '@cocreate/uuid';
import localStorage from '@cocreate/local-storage';


function init() {
    let elements = document.querySelectorAll('[pass_id]');
    initElements(elements);
    window.addEventListener('storage', function (e) {
        if (e.key == 'passedAttributes') {
            elements = document.querySelectorAll('[pass_id]:not([pass-onstoragechange="false"])')
            initElements(elements)
        }
    });
    document.addEventListener('click', function (e) {
        const target = e.target.closest('[pass_to]');
        if (target) {
            if (target.closest('[actions*="pass"]')) return;
            passAttributes(target);
        }
    });
}

function initElements(elements) {
    for (let element of elements)
        initElement(element);
}

function initElement(element) {
    let pass_id = element.getAttribute('pass_id');
    if (!pass_id) return;

    let passedAttributes = localStorage.getItem('passedAttributes');

    if (!passedAttributes || passedAttributes.length == 0) return;
    passedAttributes = JSON.parse(passedAttributes);

    let attrValues = passedAttributes[`${pass_id}`];
    if (!attrValues) return;
    _setAttributeValues(element, attrValues);
}

function _setAttributeValues(el, attrValues) {
    let isOverwrite = el.getAttribute('pass-overwrite');
    if (isOverwrite === null || isOverwrite === undefined)
        isOverwrite = attrValues['overwrite']

    if (isOverwrite && isOverwrite != 'false' || isOverwrite === '')
        isOverwrite = true;
    else if (!isOverwrite || isOverwrite === 'false')
        isOverwrite = false;

    delete attrValues['overwrite']

    Object.keys(attrValues).forEach(key => {
        _setAttributeValue(el, key, attrValues[key], isOverwrite);
        _setAttributeValue(el, `pass-${key}`, attrValues[key], isOverwrite);
        if (key == 'array' || key == 'object' || key == 'name') {
            _setAttributeValue(el, `fetch-${key}`, attrValues[key], isOverwrite);
            _setAttributeValue(el, `pass-fetch-${key}`, attrValues[key], isOverwrite);
        }
        if (key == 'template') {
            _setAttributeValue(el, 'template_id', attrValues[key], isOverwrite);
        }
        if (key == 'template_id') {
            _setAttributeValue(el, 'template', attrValues[key], isOverwrite);
        }
    });
}

async function _setAttributeValue(element, attribute, value, isOverwrite) {
    // TODO: if (value !== undefined)???
    if (!element.getAttribute(attribute) || isOverwrite) {
        if (attribute == 'value') {
            if (element.value == '' || element.value && isOverwrite)
                element.value = value;
            else if (isOverwrite || element.hasAttribute('value') && !await element.getValue())
                element.setValue(value)
        } else if (element.hasAttribute(attribute) && value)
            element.setAttribute(attribute, value);
    }
}

async function passAttributes(element) {
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
        let attrValues = await _getAttributeValues(elements[i]);
        let pass_to = elements[i].getAttribute('pass_to');
        Object.assign(passedAttributes, { [`${pass_to}`]: attrValues });
        _getPassId(attrValues, pass_to);
    }
    
    if (!element.closest('href')) {
        let currentState = localStorage.getItem('passedAttributes');
        if (currentState)
            history.pushState({ passedAttributes: currentState, title: '', url: '' }, '', location.href);
    }

    localStorage.setItem('passedAttributes', JSON.stringify(passedAttributes));

    document.dispatchEvent(new CustomEvent('passEnd', {
        detail: {}
    }))

}

async function _getAttributeValues(element) {
    let attributeValues = {};
    let attributes = element.attributes;
    for (let attribute of attributes) {
        if (attribute.name.startsWith('pass-')) {
            if (attribute.value == '$uid')
                Object.assign(attributeValues, { [`${attribute.name.substring(5)}`]: uid.generate(6) });
            else if (attribute.name == 'pass-value' && !attribute.value)
                Object.assign(attributeValues, { value: await element.getvalue() });
            else
                Object.assign(attributeValues, { [`${attribute.name.substring(5)}`]: attribute.value });
        }
    }
    if (element.value !== undefined && !element.hasAttribute('pass-value') && element.getvalue)
        Object.assign(attributeValues, { value: await element.getvalue() });

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
    callback: function (mutation) {
        initElement(mutation.target);
    }
});

action.init({
    name: "pass",
    endEvent: "passEnd",
    callback: (data) => {
        passAttributes(data.element);
    },
});

init();

export default { initElements, initElement, passAttributes };
