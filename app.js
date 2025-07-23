/** @jsx createElement */
// ===== Virtual DOM Functions =====
function createElement(type, props, ...children) {
    props = props || {};
    const flatChildren = children
        .flat()
        .map((child) =>
            typeof child === 'object' ? child : createTextElement(child)
        );

    if (typeof type === 'function') {
        return type({ ...props, children: flatChildren });
    }

    return {
        type,
        props: {
            ...props,
            children: flatChildren,
        },
    };
}

function createTextElement(text) {
    return {
        type: 'TEXT_ELEMENT',
        props: {
            nodeValue: text,
            children: [],
        },
    };
}

// ===== Real DOM Rendering =====
function render(vnode, container) {
    const dom = createDom(vnode);
    container.appendChild(dom);
}

function createDom(vnode) {
    const dom =
        vnode.type === 'TEXT_ELEMENT'
            ? document.createTextNode(vnode.props.nodeValue)
            : document.createElement(vnode.type);

    // Set props and event listeners
    Object.keys(vnode.props).forEach((name) => {
        if (name === 'children') return;

        if (name.startsWith('on')) {
            // Example: onClick → click
            const eventType = name.slice(2).toLowerCase();
            dom.addEventListener(eventType, vnode.props[name]);
        } else {
            dom[name] = vnode.props[name];
        }
    });

    vnode.props.children.forEach((child) => {
        dom.appendChild(createDom(child));
    });

    return dom;
}

function updateProps(dom, newProps, oldProps = {}) {
    // Remove old or changed event listeners
    for (const name in oldProps) {
        if (name.startsWith('on')) {
            const eventType = name.slice(2).toLowerCase();
            dom.removeEventListener(eventType, oldProps[name]);
        } else if (!(name in newProps)) {
            dom[name] = '';
        }
    }

    // Add new event listeners or set new props
    for (const name in newProps) {
        if (name === 'children') continue;

        if (name.startsWith('on')) {
            const eventType = name.slice(2).toLowerCase();
            dom.addEventListener(eventType, newProps[name]);
        } else {
            dom[name] = newProps[name];
        }
    }
}

// ===== Component Reconciliation =====
// let rootInstance = null;

function updateDom(parent, newVNode, oldVNode, index = 0) {
    const existingDom = parent.childNodes[index];

    if (!oldVNode) {
        parent.appendChild(createDom(newVNode));
    } else if (!newVNode) {
        parent.removeChild(existingDom);
    } else if (newVNode.type !== oldVNode.type) {
        parent.replaceChild(createDom(newVNode), existingDom);
    } else {
        updateProps(existingDom, newVNode.props, oldVNode.props);

        const max = Math.max(
            newVNode.props.children.length,
            oldVNode.props.children.length
        );
        for (let i = 0; i < max; i++) {
            updateDom(
                existingDom,
                newVNode.props.children[i],
                oldVNode.props.children[i],
                i
            );
        }
    }
}

// ===== useState Hook System =====
let currentComponent = null;
let hookIndex = 0;

function useState(initial) {
    const hooks = currentComponent.hooks;

    if (hookIndex >= hooks.length) {
        hooks.push(initial);
    }

    const state = hooks[hookIndex];
    const currentIndex = hookIndex; // ✅ fix: capture index

    const setState = (newValue) => {
        hooks[currentIndex] = newValue; // ✅ use fixed index
        rerender();
    };

    hookIndex++;

    return [state, setState];
}

function rerender() {
    hookIndex = 0;
    const newVNode = currentComponent.render();
    updateDom(
        document.getElementById('root'),
        newVNode,
        currentComponent.vnode
    );
    currentComponent.vnode = newVNode;
}

// ===== Example App =====
function Counter() {
    const [count, setCount] = useState(0);

    let countClass = 'gray';
    if (count > 0) countClass = 'green';
    else if (count < 0) countClass = 'red';

    return (
        <div>
            <h1>
                Count: <span className={countClass}>{count}</span>
            </h1>
            <button onClick={() => setCount(count + 1)}>Increase</button>
            <button onClick={() => setCount(count - 1)}>Decrease</button>
        </div>
    );
}

function Toggle() {
    const [on, setOn] = useState(true);

    return (
        <div>
            <h2>
                The toggle is{' '}
                <span className={on ? 'green' : 'red'}>
                    {on ? 'ON' : 'OFF'}
                </span>
            </h2>
            <button onClick={() => setOn(!on)}>Toggle</button>
        </div>
    );
}
// ===== Main App Component =====
function App() {
    return (
        <div>
            <h1>React Clone</h1>
            <Counter />
            <Toggle />
        </div>
    );
}

// ===== Bootstrapping =====
currentComponent = {
    hooks: [],
    render: App,
    vnode: null,
};

currentComponent.vnode = currentComponent.render();
render(currentComponent.vnode, document.getElementById('root'));
