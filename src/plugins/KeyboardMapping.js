'use strict';

const {generateUID} = require('../utils/helpers');

const NEW_SOUL_KNIGHT = {
    dPad: [
        {
            keys: {
                z: {
                    initialX: 20,
                    initialY: 80,
                    distanceX: 0,
                    distanceY: -10,
                    description: 'move up',
                },
                s: {
                    initialX: 20,
                    initialY: 80,
                    distanceX: 0,
                    distanceY: 10,
                    description: 'move down',
                },
                q: {
                    initialX: 20,
                    initialY: 80,
                    distanceX: -10,
                    distanceY: 0,
                    description: 'move left',
                },
                d: {
                    initialX: 20,
                    initialY: 80,
                    distanceX: 10,
                    distanceY: 0,
                    description: 'move right',
                },
            },
            name: 'character movement',
            description: 'dpad used for move the character',
        },
    ],
    tap: [
        {
            keys: {
                r: {
                    x: 75,
                    y: 85,
                    description: 'special',
                },
            },
            name: 'special',
            description: 'special attack',
        },
        {
            keys: {
                p: {
                    x: 85,
                    y: 80,
                    description: 'fire',
                },
            },
            name: 'fire',
            description: 'fire attack',
        },
        {
            keys: {
                t: {
                    x: 85,
                    y: 55,
                    description: 'change the weapon',
                },
            },
            name: 'changeWeapon',
            description: 'change the weapon',
        },
    ],
};

// eslint-disable-next-line no-unused-vars
const MINECRAFT = {
    dPad: [
        {
            keys: {
                z: {
                    initialX: 15,
                    initialY: 64,
                    distanceX: 0,
                    distanceY: -15,
                    description: 'move up',
                },
                s: {
                    initialX: 15,
                    initialY: 64,
                    distanceX: 0,
                    distanceY: 15,
                    description: 'move down',
                },
                q: {
                    initialX: 15,
                    initialY: 64,
                    distanceX: -15,
                    distanceY: 0,
                    description: 'move left',
                },
                d: {
                    initialX: 15,
                    initialY: 64,
                    distanceX: 15,
                    distanceY: 0,
                    description: 'move right',
                },
            },
            name: 'character movement',
            description: 'dpad used for move the character',
        },
    ],
    swipe: [
        {
            keys: {
                a: {
                    x: 50,
                    y: 50,
                    distanceX: -10,
                    distanceY: 0,
                    description: 'swipe left',
                },
                e: {
                    x: 50,
                    y: 50,
                    distanceX: 10,
                    distanceY: 0,
                    description: 'swipe right',
                },
            },
        },
    ],
    tap: [
        {
            keys: {
                r: {
                    x: 93,
                    y: 30,
                    description: 'jump',
                },
            },
            name: 'jump',
            description: 'jump',
        },
    ],
};
// eslint-disable-next-line no-unused-vars
const SUBWAY_SURFERS = {
    swipe: [
        {
            keys: {
                q: {
                    x: 50,
                    y: 50,
                    distanceX: -10,
                    distanceY: 0,
                    description: 'swipe left',
                },
                d: {
                    x: 50,
                    y: 50,
                    distanceX: 10,
                    distanceY: 0,
                    description: 'swipe right',
                },
                z: {
                    x: 50,
                    y: 50,
                    distanceX: 0,
                    distanceY: -10,
                    description: 'swipe up',
                },
                s: {
                    x: 50,
                    y: 50,
                    distanceX: 0,
                    distanceY: 10,
                    description: 'swipe down',
                },
            },
        },
    ],
};

/**
 * Instance keyboard plugin.KeyboardMapping
 * Translate and forward keyboard events to instance.
 */
module.exports = class KeyboardMapping {
    /**
     * Plugin initialization.
     *
     * @param {Object} instance Associated instance.
     * @param {Object} i18n     Translations keys for the UI.
     */
    constructor(instance, i18n) {
        // Reference instance
        this.instance = instance;
        this.i18n = i18n || {};

        // Register plugin
        this.instance.KeyboardMapping = this;

        this.keyboardCallbacks = [];

        this.dPadPushed = [];

        this.state = new Proxy(
            {
                isActive: false,
                isPaused: false,
                currentlyPressedKeys: [],
                mappedKeysConfig: {},
                workingMappedKeysConfig: {},
            },
            {
                set: (state, prop, value) => {
                    const oldValue = state[prop];
                    state[prop] = value;
                    switch (prop) {
                        case 'isActive':
                            this.activatePlugin();
                            break;
                        case 'isPaused':
                            if (value) {
                                this.state.isActive = false;
                            } else {
                                this.state.isActive = true;
                            }
                            break;
                        case 'mappedKeysConfig':
                            this.setupMappedKeysConfig();
                            break;
                        case 'currentlyPressedKeys':
                            // logic to handle key pressed / unpressed depending on the mappedKeysConfig
                            if (!value.length) {
                                // unpressed key
                                const jsonForReleaseTouch = this.generateTouchEventForRelease(
                                    oldValue.filter((key) => !value.includes(key)),
                                );
                                this.instance.sendEvent(jsonForReleaseTouch);
                            } else {
                                this.sendMultiTouch();
                            }
                            break;
                        default:
                            break;
                    }
                    return true;
                },
            },
        );

        // pause the listeners when dialog is open and plugin isActive
        this.instance.store.subscribe(({overlay: {isOpen}}) => {
            if (isOpen && this.state.isActive) {
                this.state.isPaused = true;
            } else if (!isOpen && this.state.isPaused) {
                this.state.isPaused = false;
            }
        });

        // Display widget
        this.renderToolbarButton();

        // activate plugin
        this.state.isActive = true;

        // register api function

        // set config file
        this.instance.apiManager.registerFunction({
            name: 'setConfig',
            category: 'keyMapping',
            fn: (config) => {
                // check it's a valid JSON
                try {
                    this.state.mappedKeysConfig = JSON.parse(JSON.stringify(config));
                } catch (err) {
                    throw new Error('Invalid JSON');
                }
                this.state.config = config;
            },
            description: 'Submit a config for mapping keys',
        });

        // active trace when click on screen
        this.instance.apiManager.registerFunction({
            name: 'activeKeyMappingDebug',
            category: 'keyMapping',
            fn: (isTraceActivate = false, isGridActivate = false) => {
                this.activateTrace(isTraceActivate);
                this.activateGrid(isGridActivate);
            },
            description: `Activate debug mode for key mapping. the first parameter activate 
            feature "click on screen add a div with x, y and x%, y%coordonates.\n
            The second parameter activate a grid on the screen to help mapping keys. 
            10% of the screen width and height.`,
        });

        // load default config to test purpose TODO delete for production
        this.state.mappedKeysConfig = NEW_SOUL_KNIGHT;
    }

    sendMultiTouch() {
        const reversedCurrentlyPressedKeys = this.state.currentlyPressedKeys.reverse();
        const {touchPoints, movePoints} = this.generateTouchEventForPush(reversedCurrentlyPressedKeys);

        const json = {type: 'MULTI_TOUCH', nb: 0, mode: 0, points: []};
        if (touchPoints.length) {
            json.nb = touchPoints.length;
            json.points = touchPoints;
            this.instance.sendEvent(json);
        }

        if (movePoints.length) {
            json.nb = movePoints.length;
            json.points = movePoints;
            json.mode = 2;
            this.instance.sendEvent(json);
        }
    }

    renderToolbarButton() {
        const toolbars = this.instance.getChildByClass(this.instance.root, 'gm-toolbar');
        if (!toolbars) {
            return; // if we don't have toolbar, we can't spawn the widget
        }

        const toolbar = toolbars.children[0];
        this.toolbarBtn = document.createElement('li');
        this.toolbarBtnImage = document.createElement('div');
        this.toolbarBtnImage.className = 'gm-icon-button gm-fingerprint-button';
        this.toolbarBtnImage.title = this.i18n.KEYMAPPING_TITLE || 'Key Mapping';
        this.toolbarBtn.onclick = () => (this.state.isActive = !this.state.isActive);
        this.toolbarBtn.appendChild(this.toolbarBtnImage);
        toolbar.appendChild(this.toolbarBtn);
    }

    activatePlugin() {
        if (this.state.isActive) {
            this.toolbarBtnImage.classList.add('gm-active');
            this.addKeyboardCallbacks();
            this.instance.store.dispatch({type: 'KEYBOARD_EVENTS_ENABLED', payload: false});
        } else {
            this.toolbarBtnImage.classList.remove('gm-active');
            this.removeKeyboardCallbacks();
            this.instance.store.dispatch({type: 'KEYBOARD_EVENTS_ENABLED', payload: !this.state.isPaused});
        }
    }

    setupMappedKeysConfig() {
        // reset
        this.state.workingMappedKeysConfig = {};

        // Create a working version of the mappedKeysConfig, this will chane the structure to be more performant and avoid incepth loop
        Object.entries(this.state.mappedKeysConfig).forEach(([gestureType, gestureConfig]) => {
            gestureConfig.forEach((gesture) => {
                const groupId = generateUID();
                Object.entries(gesture.keys).forEach(([key, value]) => {
                    this.state.workingMappedKeysConfig[key] = {
                        ...value,
                        key,
                        type: gestureType,
                        name: gesture.name,
                        groupId,
                    };
                });
            });
        });
    }

    /**
     * Cancel all pressed keys.
     * This is mainly used to avoid continuously pressed keys because of alt+tab
     * or any other command that remove focus (blur) the page.
     */
    cancelAllPressedKeys() {
        this.state.currentlyPressedKeys.forEach((value) => {
            const text = '';
            const json = {
                type: 'KEYBOARD_RELEASE',
                keychar: text,
                keycode: value,
            };
            this.instance.sendEvent(json);
        });
        this.state.currentlyPressedKeys = [];
    }

    onKeyDown(event) {
        const key = event.key;

        if (this.state.workingMappedKeysConfig[key] && !this.state.currentlyPressedKeys.includes(key)) {
            // we need to assign a new array to trigger the setter of the proxy (pass by the proxy's trap)
            this.state.currentlyPressedKeys = [...this.state.currentlyPressedKeys, key];
        }
    }

    onKeyUp(event) {
        const key = event.key;

        if (this.state.workingMappedKeysConfig[key]) {
            // filter return a new array so the setter of the proxy while be triggered (pass by the proxy's trap)
            this.state.currentlyPressedKeys = this.state.currentlyPressedKeys.filter(
                (pressedKey) => pressedKey !== key,
            );
        }
        // Remove the dPadPushed key if in dPadPushed

        const keyConfig = this.state.workingMappedKeysConfig[key];
        if (keyConfig && keyConfig.type === 'dPad') {
            // check if another key of the same dPad is still pressed
            const dPadGroupKeys = Object.values(this.state.workingMappedKeysConfig)
                .filter((kConfig) => kConfig.groupId === keyConfig.groupId)
                .map((kConfig) => kConfig.key);
            const dPadGroupKeysPressed = dPadGroupKeys.filter((k) => this.state.currentlyPressedKeys.includes(k));
            if (!dPadGroupKeysPressed.length) {
            this.dPadPushed = this.dPadPushed.filter((groupId) => groupId !== keyConfig.groupId);
            }
        }
    }

    /**
     * Generate the touch event when a key to send to the vm
     * @returns {Object} - the json to send to the vm
     */
    generateTouchEventForPush() {
        const touchPointsBeforeMove = [];
        const touchPoints = [];
        const movePoints = [];

        // All keys in currentPressedKeys for a dPad must be address as a single touch event
        const dPadAlreadyTriggered = [];

        this.state.currentlyPressedKeys.forEach((key) => {
            // All keys in currentPressedKeys for a given dPad are calculate once, as a single touch event
            if (dPadAlreadyTriggered.includes(key)) {
                return;
            }
            const keyConfig = this.state.workingMappedKeysConfig[key];
            switch (keyConfig.type) {
                case 'dPad':
                    // eslint-disable-next-line no-case-declarations
                    const dPadGroupKeys = Object.values(this.state.workingMappedKeysConfig)
                        .filter((kConfig) => kConfig.groupId === keyConfig.groupId)
                        .map((kConfig) => kConfig.key);
                    dPadAlreadyTriggered.push(...dPadGroupKeys);

                    // eslint-disable-next-line no-case-declarations
                    const [dPadT, dPadM] = this.getDPADTouchEvent(keyConfig);

                    if (this.dPadPushed.includes(keyConfig.groupId)) {
                        touchPoints.push(dPadT);
                    } else {
                        touchPointsBeforeMove.push(dPadT);
                        movePoints.push(dPadM);
                        // also add the groupId to the dPadPushed array to keep track of the dPad pressed
                        this.dPadPushed.push(keyConfig.groupId);
                    }
                    break;
                case 'tap':
                    touchPoints.push(this.getTapTouchEvent(keyConfig));
                    break;
                case 'swipe':
                    // eslint-disable-next-line no-case-declarations
                    const [swipeT, swipeM] = this.getSwipeTouchEvent(keyConfig);

                    touchPointsBeforeMove.push(swipeT);
                    movePoints.push(swipeM);

                    break;
                default:
                    break;
            }
        });

        // adding touchpoins to movePoints to keep static touch when moving
        return {
            touchPoints: [...touchPointsBeforeMove, ...touchPoints],
            movePoints: movePoints.length ? [...touchPoints, ...movePoints] : [],
        };
    }

    generateTouchEventForRelease() {
        const json = {type: 'MULTI_TOUCH', nb: 0, mode: 1, points: []};
        return json;
    }

    getDPADTouchEvent(keyConfig) {
        // get all touch for this dPad
        const dPadGroupedKeys = Object.values(this.state.workingMappedKeysConfig).filter(
            (kConfig) => kConfig.groupId === keyConfig.groupId,
        );

        const newPosition = {x: keyConfig.initialX, y: keyConfig.initialY};

        const pressedKeys = dPadGroupedKeys.filter((kConfig) => this.state.currentlyPressedKeys.includes(kConfig.key));

        // calculate the new position of the touch based on the dPad pressed keys
        pressedKeys.forEach((pressedKeyConfig) => {
            if (this.state.workingMappedKeysConfig[pressedKeyConfig.key]) {
                newPosition.x += pressedKeyConfig.distanceX;
                newPosition.y += pressedKeyConfig.distanceY;
            }
        });

        const touchPointsBeforeMove = this.calculateCoorFromPercent(keyConfig.initialX, keyConfig.initialY);
        const movePoints = this.calculateCoorFromPercent(newPosition.x, newPosition.y);

        if (this.dPadPushed.includes(keyConfig.groupId)) {
            return [movePoints];
        }
        return [touchPointsBeforeMove, movePoints];
    }
    getTapTouchEvent(keyConfig) {
        return this.calculateCoorFromPercent(keyConfig.x, keyConfig.y);
    }

    getSwipeTouchEvent(keyConfig) {
        const newPosition = {x: keyConfig.x, y: keyConfig.y};

        const touchPointsBeforeMove = this.calculateCoorFromPercent(keyConfig.x, keyConfig.y);

        newPosition.x += keyConfig.distanceX;
        newPosition.y += keyConfig.distanceY;

        const movePoints = this.calculateCoorFromPercent(newPosition.x, newPosition.y);

        return [touchPointsBeforeMove, movePoints];
    }

    /**
     * Bind all event listener callback.
     */
    addKeyboardCallbacks() {
        this.instance.root.tabIndex = 0;
        if (!this.keyboardCallbacks.length) {
            // This avoid having continuously pressed keys because of alt+tab or any other command that blur from tab
            this.removeBlurListener = this.instance.addListener(window, 'blur', this.cancelAllPressedKeys.bind(this));

            this.keyboardCallbacks = [
                {event: 'keydown', handler: this.onKeyDown.bind(this), removeListener: null},
                {event: 'keyup', handler: this.onKeyUp.bind(this), removeListener: null},
            ];

            this.instance.root.focus();
            this.keyboardCallbacks.forEach((item, index, array) => {
                array[index].removeListener = this.instance.addListener(this.instance.root, item.event, item.handler);
            });
        }
    }

    /**
     * Remove the event handlers callbacks (if they were created)
     */
    removeKeyboardCallbacks() {
        if (!this.keyboardCallbacks.length) {
            return;
        }
        this.removeBlurListener();
        this.keyboardCallbacks.forEach((item) => {
            item.removeListener();
        });
    }

    tilt() {
        const json = {
            channel: 'sensors',
            messages: [
                'set accelerometer 0:9.81:0',
                'set gyroscope 0:9.81:0',
                'set accelerometer 1:8.81:0',
                'set gyroscope 1:9.81:0',
                'set accelerometer 0:9.81:0',
                'set gyroscope 0:9.81:0',
            ],
        };
        this.instance.sendEvent(json);
        /*
         * Array.from(Array(2).keys()).forEach(() => {
         *     this.instance.sendEvent({type: 'ACCELEROMETER', x: -100, y: -10, z: 0});
         *     this.instance.sendEvent({type: 'ACCELEROMETER', x: 100, y: -10, z: 0});
         *     this.instance.sendEvent({type: 'ACCELEROMETER', x: 200, y: 0, z: 0});
         * });
         */
        return;
    }

    activateTrace(isActive) {
        const debug = (event) => {
            // create div with x, y coordonates where this.instantce.root element is clicked
            const xCoor = this.instance.coordinateUtils.getXCoordinate(event);
            const yCoor = this.instance.coordinateUtils.getYCoordinate(event);
            const div = document.createElement('div');
            div.style.position = 'absolute';
            div.style.left = `${event.clientX}px`;
            div.style.top = `${event.clientY}px`;
            div.style.width = '80px';
            div.style.height = '80px';
            div.style.padding = '10px';
            div.style.background = 'red';

            // adding x and y coordonates of this.instantce.root element to the div create above
            const videoSize = this.instance.video.getBoundingClientRect();

            const xPercent = 100 / ((videoSize.width * this.instance.coordinateUtils.getXRatio()) / xCoor);
            const yPercent =
                100 /
                (((videoSize.height - this.instance.coordinateUtils.getTopBorder() * 2) *
                    this.instance.coordinateUtils.getYRatio()) /
                    yCoor);

            div.style.whiteSpace = 'pre-line';
            const text = document.createTextNode(
                `x: ${xCoor}\ny: ${yCoor}\nx%: ${String(xPercent).substring(0, 5)}\n
                y%: ${String(yPercent).substring(0, 5)}`,
            );
            div.appendChild(text);

            div.onclick = (e) => {
                e.stopPropagation();
                div.remove();
            };

            document.body.appendChild(div);
        };

        if (isActive) {
            this.removeDebugListener = this.instance.addListener(window, ['click'], debug.bind(this));
        } else {
            // eslint-disable-next-line no-unused-expressions
            if (this.removeDebugListener) {
                this.removeDebugListener();
            }
            this.removeDebugListener = null;
        }
    }

    activateGrid(isActive) {
        if (isActive) {
            const parentSize = this.instance.videoWrapper.getBoundingClientRect();
            const videoSize = this.instance.video.getBoundingClientRect();
            videoSize.height = videoSize.height - this.instance.coordinateUtils.getTopBorder() * 2;

            // div vertical
            Array.from(Array(11).keys()).forEach((val, i) => {
                const div = document.createElement('div');
                div.style.position = 'absolute';
                div.style.left = `${i * (videoSize.width * 0.1) + (parentSize.width - videoSize.width) / 2}px`;
                div.style.top = `${0}px`;
                div.style.width = '1px';
                div.style.height = '100%';
                div.style.background = 'red';
                if (i === 0) {
                    div.style.background = 'green';
                }

                div.classList.add('keyMapping-helping-grid');
                this.instance.videoWrapper.appendChild(div);
            });
            // div horizontal
            Array.from(Array(11).keys()).forEach((val, i) => {
                const div = document.createElement('div');
                div.style.position = 'absolute';
                div.style.left = `${0}px`;
                div.style.top = `${i * (videoSize.height * 0.1) + this.instance.coordinateUtils.getTopBorder()}px`;
                div.style.width = '100%';
                div.style.height = '1px';
                div.style.background = 'red';
                if (i === 0) {
                    div.style.background = 'green';
                }
                div.classList.add('keyMapping-helping-grid');
                this.instance.videoWrapper.appendChild(div);
            });
        } else {
            this.instance.videoWrapper.querySelectorAll('.keyMapping-helping-grid').forEach((e) => {
                e.remove();
            });
        }
    }

    calculateCoorFromPercent(x, y) {
        const videoSize = this.instance.video.getBoundingClientRect();

        const xFromPercent = (x / 100) * videoSize.width * this.instance.coordinateUtils.getXRatio();
        const yFromPercent =
            (y / 100) *
            (videoSize.height - this.instance.coordinateUtils.getTopBorder() * 2) *
            this.instance.coordinateUtils.getYRatio();

        return {x: xFromPercent, y: yFromPercent};
    }
};
