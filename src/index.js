import "@cocreate/element-prototype";
import Observer from "@cocreate/observer";
import Action from "@cocreate/actions";
import uid from "@cocreate/uuid";
import storage from "@cocreate/local-storage";

const { localStorage, sessionStorage } = storage;

function init() {
    let elements = document.querySelectorAll("[state-id]");
    initElements(elements);
    
    window.addEventListener("storage", function (e) {
        if (e.key == "state") {
            // Re-initialize only elements that are explicitly listening to storage changes
            elements = document.querySelectorAll(
                '[state-id][state-onstoragechange]:not([state-onstoragechange="false"])'
            );
            initElements(elements);
        }
    });
    
    document.addEventListener("click", function (e) {
        const target = e.target.closest("[state-to]");
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
    let state_id = element.getAttribute("state-id");
    if (!state_id) return;

    // Determine target storage based on attributes
    let isLocal = element.hasAttribute("state-localstorage") || element.hasAttribute("state-onstoragechange");
    let storageObj = isLocal ? localStorage : sessionStorage;

    let statedAttributes = storageObj.getItem("state");

    if (!statedAttributes || statedAttributes.length == 0) return;
    
    try {
        statedAttributes = JSON.parse(statedAttributes);
    } catch(e) {
        return;
    }

    if (state_id.includes(",")) state_id = state_id.split(",");

    if (!Array.isArray(state_id)) state_id = [state_id];

    for (let i = 0; i < state_id.length; i++) {
        let attrValues = statedAttributes[`${state_id[i].trim()}`];
        if (!attrValues) continue; // Use continue to ensure other IDs in the array still process
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
        } else if (attribute === "class" && value) {
            const classes = String(value).split(/\s+/).filter(Boolean);
            if (classes.length) element.classList.add(...classes);
        } else if (element.hasAttribute(attribute) && (value || value === "")) {
            element.setAttribute(attribute, value);
        } else if (attribute.startsWith("$")) {
            // Handle using operators.js
            const prop = attribute.substring(1);
            if (element[prop]) {
                if (typeof element[prop] === "function") {
                    element[prop](value);
                } else {
                    element[prop] = value;
                }
            }
        }
    }
}

async function stateAttributes(element) {
    let sessionState = {};
    let localState = {};
    
    try { sessionState = JSON.parse(sessionStorage.getItem("state") || "{}"); } catch(e) {}
    try { localState = JSON.parse(localStorage.getItem("state") || "{}"); } catch(e) {}
    
    let elements = [];

    // let form = element.closest("form");
    // if (form) {
    //  elements = form.querySelectorAll("[state_to]");
    // } else {
    if (element.hasAttribute("state-to")) elements.push(element);
    let nestedElements = element.querySelectorAll("[state-to]");
    elements.push(...nestedElements);
    let current = element;
    while (current) {
        if (current.hasAttribute("state-to") && !elements.includes(current)) {
            elements.push(current);
        }
        current = current.parentElement;
    }
    // }

    let changeState = false;
    let sessionChanged = false;
    let localChanged = false;
    let triggerIsLocal = element.hasAttribute("state-localstorage") || element.hasAttribute("state-onstoragechange");

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

        let state_to = elements[i].getAttribute("state-to");
        
        let isLocal = triggerIsLocal || elements[i].hasAttribute("state-localstorage") || elements[i].hasAttribute("state-onstoragechange");
        
        if (isLocal) {
            Object.assign(localState, { [`${state_to}`]: attrValues });
            localChanged = true;
        } else {
            Object.assign(sessionState, { [`${state_to}`]: attrValues });
            sessionChanged = true;
        }
        
        _getStateId(attrValues, state_to);
    }
    
    let href = element.closest("href");
    if (!changeState && !href) {
        // TODO: Handle $title when adding statedAttributes
        let title = element.getAttribute("title") || document.title || "";
        
        history.pushState(
            { sessionState: JSON.stringify(sessionState), localState: JSON.stringify(localState), title, url: location.href },
            title,
            location.href
        );
    }

    if (!changeState) {
        if (sessionChanged) sessionStorage.setItem("state", JSON.stringify(sessionState));
        if (localChanged) localStorage.setItem("state", JSON.stringify(localState));
    }

    element.dispatchEvent(
        new CustomEvent("stateEnd", {
            detail: {}
        })
    );
}

async function _getAttributeValues(element) {
    let attributeValues = {};
    let attributes = element.attributes;
    for (let attribute of attributes) {
        if (attribute.name.startsWith("state.")) {
            const key = attribute.name.slice(6);
            if (attribute.value == "$uid") {
                Object.assign(attributeValues, { [key]: uid.generate(6) });
            } else if (key === "value" && !attribute.value) {
                Object.assign(attributeValues, { value: await element.getValue() });
            } else {
                Object.assign(attributeValues, { [key]: element.getAttribute(attribute.name) });
            }
        }
    }
    return attributeValues;
}

function _getStateId(attrValues, state_to) {
    const elements = document.querySelectorAll(`[state-id="${state_to}"]`);
    for (let element of elements) _setAttributeValues(element, attrValues);
}

window.onload = function () {
    if (!history.length) {
        const sessionState = sessionStorage.getItem("state") || "";
        const localState = localStorage.getItem("state") || "";
        history.replaceState(
            { sessionState, localState, url: location.href, title: document.title },
            document.title,
            location.href
        );
    } else if (!history.state || history.state.url !== location.href) {
        const sessionState = sessionStorage.getItem("state") || "";
        const localState = localStorage.getItem("state") || "";
        history.pushState(
            { sessionState, localState, url: location.href, title: document.title },
            document.title,
            location.href
        );
    }
};

window.addEventListener("popstate", function (event) {
    if (event.state) {
        if (event.state.sessionState || event.state.localState) {
            if (event.state.sessionState) sessionStorage.setItem("state", event.state.sessionState);
            if (event.state.localState) localStorage.setItem("state", event.state.localState);
            
            let elements = document.querySelectorAll("[state-id]");
            initElements(elements);
        }

        if (event.state.url && event.state.url !== window.location.href) {
            if (event.state.title)
                sessionStorage.setItem("currentPageTitle", event.state.title); // Store title using the wrapper

            location.href = event.state.url; // Navigate if the URL is different
        } else if (event.state.title) {
            document.title = event.state.title; // Update the title if provided
        }
    }
});

Observer.init({
    name: "CoCreateState",
    types: ["addedNodes"],
    selector: "[state-id]",
    callback: function (mutation) {
        initElement(mutation.target);
    }
});

Action.init({
    name: "state",
    endEvent: "stateEnd",
    callback: (action) => {
        stateAttributes(action.element);
    }
});

init();

export default { initElements, initElement, stateAttributes };
