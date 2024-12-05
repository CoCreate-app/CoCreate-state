import "@cocreate/element-prototype";
import observer from "@cocreate/observer";
import action from "@cocreate/actions";
import uid from "@cocreate/uuid";
import localStorage from "@cocreate/local-storage";

function init() {
	let elements = document.querySelectorAll("[state_id]");
	initElements(elements);
	window.addEventListener("storage", function (e) {
		if (e.key == "statedAttributes") {
			elements = document.querySelectorAll(
				'[state_id]:not([state-onstoragechange="false"])'
			);
			initElements(elements);
		}
	});
	document.addEventListener("click", function (e) {
		const target = e.target.closest("[state_to]");
		if (target) {
			if (target.closest('[actions*="state"]')) return;
			stateAttributes(target);
		}
	});
}

function initElements(elements) {
	for (let element of elements) initElement(element);
}

function initElement(element) {
	let state_id = element.getAttribute("state_id");
	if (!state_id) return;

	let statedAttributes = localStorage.getItem("statedAttributes");

	if (!statedAttributes || statedAttributes.length == 0) return;
	statedAttributes = JSON.parse(statedAttributes);

	if (state_id.includes(",")) state_id = state_id.split(",");

	if (!Array.isArray(state_id)) state_id = [state_id];

	for (let i = 0; i < state_id.length; i++) {
		let attrValues = statedAttributes[`${state_id[i].trim()}`];
		if (!attrValues) return;
		_setAttributeValues(element, attrValues);
	}
}

function _setAttributeValues(el, attrValues) {
	let isOverwrite = el.getAttribute("state-overwrite");
	if (isOverwrite === null || isOverwrite === undefined)
		isOverwrite = attrValues["overwrite"];

	if ((isOverwrite && isOverwrite != "false") || isOverwrite === "")
		isOverwrite = true;
	else if (!isOverwrite || isOverwrite === "false") isOverwrite = false;

	// delete attrValues["overwrite"];

	for (const key of Object.keys(attrValues)) {
		_setAttributeValue(el, key, attrValues[key], isOverwrite);
		_setAttributeValue(el, `state-${key}`, attrValues[key], isOverwrite);
		if (key == "array" || key == "object" || key == "name") {
			_setAttributeValue(
				el,
				`fetch-${key}`,
				attrValues[key],
				isOverwrite
			);
			_setAttributeValue(
				el,
				`state-fetch-${key}`,
				attrValues[key],
				isOverwrite
			);
		}
		if (key == "template") {
			_setAttributeValue(el, "template_id", attrValues[key], isOverwrite);
		}
		if (key == "template_id") {
			_setAttributeValue(el, "template", attrValues[key], isOverwrite);
		}
	}
}

async function _setAttributeValue(element, attribute, value, isOverwrite) {
	// TODO: if (value !== undefined)???
	if (!element.getAttribute(attribute) || isOverwrite) {
		if (attribute == "value") {
			if (element.value == "" || (element.value && isOverwrite))
				element.value = value;
			else if (
				isOverwrite ||
				(element.hasAttribute("value") && !(await element.getValue()))
			)
				element.setValue(value);
		} else if (element.hasAttribute(attribute) && (value || value === ""))
			element.setAttribute(attribute, value);
	}
}

async function stateAttributes(element) {
	let statedAttributes = {};
	try {
		const storedAttributes = localStorage.getItem("statedAttributes");
		if (storedAttributes) {
			statedAttributes = JSON.parse(storedAttributes);
		}
	} catch (error) {
		console.error(
			"Failed to parse statedAttributes from localStorage:",
			error
		);
		// Optionally reset `statedAttributes` in localStorage to ensure valid data:
		localStorage.setItem("statedAttributes", JSON.stringify({}));
	}
	let elements = [];

	let form = element.closest("form");
	if (form) {
		elements = form.querySelectorAll("[state_to]");
	} else {
		if (element.hasAttribute("state_to")) elements.push(element);
		let nestedElements = element.querySelectorAll("[state_to]");
		elements.push(...nestedElements);
	}

	let changeState = false;
	for (let i = 0; i < elements.length; i++) {
		let attrValues = await _getAttributeValues(elements[i]);
		if (attrValues.src === "$back" || attrValues.href === "$back") {
			changeState = true;
			window.history.back();
			break;
		} else if (
			attrValues.src === "$forward" ||
			attrValues.href === "$forward"
		) {
			changeState = true;
			window.history.forward();
			break;
		}

		let state_to = elements[i].getAttribute("state_to");
		Object.assign(statedAttributes, { [`${state_to}`]: attrValues });
		_getStateId(attrValues, state_to);
	}
	statedAttributes = JSON.stringify(statedAttributes);
	let href = element.closest("href");
	if (!changeState && !href) {
		// TODO: Handle $title when adding statedAttributes
		let title = element.getAttribute("title") || document.title || "";
		history.pushState(
			{ statedAttributes, title, url: location.href },
			title,
			location.href
		);
	}

	if (!changeState)
		localStorage.setItem("statedAttributes", statedAttributes);

	document.dispatchEvent(
		new CustomEvent("stateEnd", {
			detail: {}
		})
	);
}

async function _getAttributeValues(element) {
	let attributeValues = {};
	let attributes = element.attributes;
	for (let attribute of attributes) {
		if (attribute.name.startsWith("state-")) {
			if (attribute.value == "$uid")
				Object.assign(attributeValues, {
					[`${attribute.name.substring(5)}`]: uid.generate(6)
				});
			else if (attribute.name == "state-value" && !attribute.value)
				Object.assign(attributeValues, {
					value: await element.getvalue()
				});
			else
				Object.assign(attributeValues, {
					[`${attribute.name.substring(6)}`]: attribute.value
				});
		}
	}
	if (
		element.value !== undefined &&
		!element.hasAttribute("state-value") &&
		element.getvalue
	)
		Object.assign(attributeValues, { value: await element.getvalue() });

	return attributeValues;
}

function _getStateId(attrValues, state_to) {
	const elements = document.querySelectorAll(`[state_id="${state_to}"]`);
	for (let element of elements) _setAttributeValues(element, attrValues);
}

window.onload = function () {
	if (!history.length) {
		const statedAttributes = localStorage.getItem("statedAttributes") || "";
		history.replaceState(
			{ statedAttributes, url: location.href, title: document.title },
			document.title,
			location.href
		);
	} else if (!history.state || history.state.url !== location.href) {
		const statedAttributes = localStorage.getItem("statedAttributes") || "";
		history.pushState(
			{ statedAttributes, url: location.href, title: document.title },
			document.title,
			location.href
		);
	}
};

window.addEventListener("popstate", function (event) {
	if (event.state) {
		if (event.state.statedAttributes) {
			localStorage.setItem(
				"statedAttributes",
				event.state.statedAttributes
			);
			let elements = document.querySelectorAll("[state_id]");
			initElements(elements);
		}

		if (event.state.url && event.state.url !== window.location.href) {
			if (event.state.title)
				sessionStorage.setItem("currentPageTitle", event.state.title); // Store title in session storage

			location.href = event.state.url; // Navigate if the URL is different
		} else if (event.state.title) {
			document.title = event.state.title; // Update the title if provided
		}
	}
});

observer.init({
	name: "CoCreateState",
	observe: ["addedNodes"],
	selector: "[state_id]",
	callback: function (mutation) {
		initElement(mutation.target);
	}
});

action.init({
	name: "state",
	endEvent: "stateEnd",
	callback: (data) => {
		stateAttributes(data.element);
	}
});

init();

export default { initElements, initElement, stateAttributes };
