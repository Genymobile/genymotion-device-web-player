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
    dtap: [
        {
            keys: {
                v: {
                    x: 95,
                    y: 20,
                    description: 'test',
                },
            },
            name: 'test',
            description: 'test',
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
                    distanceY: -10,
                    description: 'move up',
                },
                s: {
                    initialX: 15,
                    initialY: 64,
                    distanceX: 0,
                    distanceY: 10,
                    description: 'move down',
                },
                q: {
                    initialX: 15,
                    initialY: 64,
                    distanceX: -10,
                    distanceY: 0,
                    description: 'move left',
                },
                d: {
                    initialX: 15,
                    initialY: 64,
                    distanceX: 10,
                    distanceY: 0,
                    description: 'move right',
                },
            },
            name: 'character movement',
            description: 'dpad used for move the character',
        },
        {
            keys: {
                o: {
                    initialX: 80,
                    initialY: 80,
                    distanceX: 0,
                    distanceY: -19,
                    description: 'move up',
                },
                l: {
                    initialX: 80,
                    initialY: 80,
                    distanceX: 0,
                    distanceY: 19,
                    description: 'move down',
                },
                k: {
                    initialX: 80,
                    initialY: 80,
                    distanceX: -19,
                    distanceY: 0,
                    description: 'move left',
                },
                m: {
                    initialX: 80,
                    initialY: 80,
                    distanceX: 19,
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
                    initialX: 50,
                    initialY: 50,
                    distanceX: -10,
                    distanceY: 0,
                    description: 'swipe left',
                },
                d: {
                    initialX: 50,
                    initialY: 50,
                    distanceX: 10,
                    distanceY: 0,
                    description: 'swipe right',
                },
                z: {
                    initialX: 50,
                    initialY: 50,
                    distanceX: 0,
                    distanceY: -10,
                    description: 'swipe up',
                },
                s: {
                    initialX: 50,
                    initialY: 50,
                    distanceX: 0,
                    distanceY: 10,
                    description: 'swipe down',
                },
            },
        },
    ],
};

const LEGENDS = {
    dPad: [
        {
            keys: {
                z: {
                    initialX: 10,
                    initialY: 60,
                    distanceX: 0,
                    distanceY: -10,
                    description: 'move up',
                },
                s: {
                    initialX: 10,
                    initialY: 60,
                    distanceX: 0,
                    distanceY: 10,
                    description: 'move down',
                },
                q: {
                    initialX: 10,
                    initialY: 60,
                    distanceX: -10,
                    distanceY: 0,
                    description: 'move left',
                },
                d: {
                    initialX: 10,
                    initialY: 60,
                    distanceX: 10,
                    distanceY: 0,
                    description: 'move right',
                },
            },
            name: 'character movement',
            description: 'dpad used for move the character',
        },
        {
            keys: {
                o: {
                    initialX: 80,
                    initialY: 80,
                    distanceX: 0,
                    distanceY: -19,
                    description: 'move up',
                },
                l: {
                    initialX: 80,
                    initialY: 80,
                    distanceX: 0,
                    distanceY: 19,
                    description: 'move down',
                },
                k: {
                    initialX: 80,
                    initialY: 80,
                    distanceX: -19,
                    distanceY: 0,
                    description: 'move left',
                },
                m: {
                    initialX: 80,
                    initialY: 80,
                    distanceX: 19,
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
                e: {
                    x: 96,
                    y: 41,
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

        this.sequences = {};
        this.requestToGenerate = [];
        this.currentlyPressedKeys = [];

        // internal state
        this.state = new Proxy(
            {
                isActive: false,
                /*
                 * when a dialog is open we want disable listeners for keyMapping, but when dialog is closed we want to re-enable them
                 * this is the isPaused purpose
                 */
                isPaused: false,
                mappedKeysConfig: {},
                workingMappedKeysConfig: {},
            },
            {
                set: (state, prop, value) => {
                    state[prop] = value;
                    switch (prop) {
                        case 'isActive':
                            this.activatePlugin();
                            break;
                        case 'isPaused':
                            if (value) {
                                this.toolbarBtnImage.classList.add('keymapping-paused');
                                this.state.isActive = false;
                            } else {
                                this.toolbarBtnImage.classList.remove('keymapping-paused');
                                this.state.isActive = true;
                            }
                            break;
                        case 'mappedKeysConfig':
                            this.setupMappedKeysConfig();
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

        // TODO son't do this in production activate plugin
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

        // active trace when click on screen
        this.instance.apiManager.registerFunction({
            name: 'enable',
            category: 'keyMapping',
            fn: (isActive = false) => {
                this.state.isActive = isActive;
            },
            description: 'Activate the keyMapping plugin.',
        });

        // load default config to test purpose TODO delete for production
        this.state.mappedKeysConfig = MINECRAFT;
        this.state.mappedKeysConfig = SUBWAY_SURFERS;
        this.state.mappedKeysConfig = NEW_SOUL_KNIGHT;
        this.state.mappedKeysConfig = LEGENDS;
    }

    renderToolbarButton() {
        const toolbars = this.instance.getChildByClass(this.instance.root, 'gm-toolbar');
        if (!toolbars) {
            return; // if we don't have toolbar, we can't spawn the widget
        }

        const toolbar = toolbars.children[0];
        this.toolbarBtn = document.createElement('li');
        this.toolbarBtnImage = document.createElement('div');
        this.toolbarBtnImage.className = 'gm-icon-button gm-keymapping-button';
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

        // create key for sequences

        Object.entries(this.state.mappedKeysConfig).forEach(([gestureType, gestureConfig]) => {
            gestureConfig.forEach((gesture) => {
                const groupId = generateUID();
                this.sequences[groupId] = [];
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
        this.sequences.mouse = [];
    }

    /**
     * Cancel all pressed keys.
     * This is mainly used to avoid continuously pressed keys because of alt+tab
     * or any other command that remove focus (blur) the page.
     */
    cancelAllPressedKeys() {
        this.releaseAllTouch();
        this.state.currentlyPressedKeys = [];
        Object.keys(this.sequences).forEach((key) => {
            this.sequences[key] = [];
        });
    }

    async generateSequences() {
        const sequences = Object.values(this.sequences);

        const biggestSequence = sequences
            .map((seq) => {
                return seq.length;
            })
            .sort()
            .pop();

        const sequencesToMerge = [];
        Array.from(Array(biggestSequence).keys()).forEach((i) => {
            sequences.forEach((seq) => {
                // group sequences by index in order to merge sequences of same index into one sequence
                if (!seq.length) {
                    // no sequence for this key
                    return;
                }
                if (seq[i]) {
                    if (!sequencesToMerge[i]) {
                        sequencesToMerge[i] = [];
                    }
                    sequencesToMerge[i].push(seq[i]);
                } else {
                    // if not found take the last element
                    if (!sequencesToMerge[i]) {
                        sequencesToMerge[i] = [];
                    }
                    sequencesToMerge[i].push(seq[seq.length - 1]);
                }
            });
        });

        // Group the sequences in same index of sequencesToMerge array
        const mergedSequences = [];
        sequencesToMerge.forEach((sequencesToGroup) => {
            // TODO calculate mode
            mergedSequences.push({
                type: 'MULTI_TOUCH',
                nb: sequencesToGroup.length,
                mode: sequencesToGroup[0].mode, // TODO ?
                points: sequencesToGroup.reduce((acc, val) => {
                    acc = [...acc, ...val.points];
                    return acc;
                }, []),
            });
        });

        for (let i = 0; i < mergedSequences.length; i++) {
            // Don't await for the first event, games which no need too many data will be faster
            if (i % 2 === 0 && i !== 0) {
                await new Promise((resolve) => setTimeout(resolve, 1));
            }
            this.sendEvent(mergedSequences[i]);
        }

        // keep only last sequence for each key
        Object.entries(this.sequences).forEach(([key, value]) => {
            if (value.length > 0) {
                this.sequences[key] = [value[value.length - 1]];
            } else {
                this.sequences[key] = [];
            }
        });
    }

    generateDPADSequence(key) {
        // look for the group id
        const groupId = this.state.workingMappedKeysConfig[key].groupId;
        let initialX = 0;
        let initialY = 0;

        // look if other pressed keys of this groupId, if yes then empty the sequence and generate a new one
        const pressedKeysConfig = Object.values(this.state.workingMappedKeysConfig).filter((value) => {
            return value.groupId === groupId && this.currentlyPressedKeys.includes(value.key);
        });

        initialX = this.state.workingMappedKeysConfig[key].initialX;
        initialY = this.state.workingMappedKeysConfig[key].initialY;

        const newPosition = {
            x: initialX,
            y: initialY,
        };

        pressedKeysConfig.forEach((pressedKeyConfig) => {
            if (this.state.workingMappedKeysConfig[pressedKeyConfig.key]) {
                newPosition.x += pressedKeyConfig.distanceX;
                newPosition.y += pressedKeyConfig.distanceY;
            }
        });

        // if another key is always pressed then initial coord must be from lastpoint
        const lastDPADSequence = this.sequences[groupId]?.[this.sequences[groupId].length - 1];
        if (lastDPADSequence) {
            // get percent of screen from lastDPADSequence.points.x
            const {x, y} = this.calculateCoorToPercent(lastDPADSequence.points[0].x, lastDPADSequence.points[0].y);
            // change initialX and initialY
            initialX = x;
            initialY = y;
        }

        // now we have the destination position we need to generate more points, cause some games need like 5 points to trigger a move
        const steps = 10;

        // generate the sequences

        // make this only when we start a touch, exclude the current key from the pressedKeysConfig length
        if (pressedKeysConfig.length - 1 === 0 && !lastDPADSequence) {
            this.sequences[groupId].push({
                type: 'MULTI_TOUCH',
                mode: 0,
                nb: 1,
                points: [this.calculateCoorFromPercent(initialX, initialY)],
            });
        }
        // get the last sequence of previous dpad position
        if (lastDPADSequence) {
            this.sequences[groupId].push(lastDPADSequence);
        }
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = Math.floor(initialX + t * (newPosition.x - initialX));
            const y = Math.floor(initialY + t * (newPosition.y - initialY));

            this.sequences[groupId].push({
                type: 'MULTI_TOUCH',
                mode: 2,
                nb: 1,
                points: [this.calculateCoorFromPercent(x, y)],
            });
        }
    }

    generateTouchSequence(key) {
        const groupId = this.state.workingMappedKeysConfig[key].groupId;
        const x = this.state.workingMappedKeysConfig[key].x;
        const y = this.state.workingMappedKeysConfig[key].y;

        this.sequences[groupId].push({
            type: 'MULTI_TOUCH',
            mode: 0,
            nb: 1,
            points: [this.calculateCoorFromPercent(x, y)],
        });
    }

    generateSwipeSequence(key) {
        const groupId = this.state.workingMappedKeysConfig[key].groupId;
        const keyConfig = this.state.workingMappedKeysConfig[key];

        const newPosition = {x: keyConfig.initialX, y: keyConfig.initialY};
        this.sequences[groupId].push({
            type: 'MULTI_TOUCH',
            mode: 0,
            nb: 1,
            points: [this.calculateCoorFromPercent(newPosition.x, newPosition.y)],
        });

        newPosition.x += keyConfig.distanceX;
        newPosition.y += keyConfig.distanceY;

        this.sequences[groupId].push({
            type: 'MULTI_TOUCH',
            mode: 2,
            nb: 1,
            points: [this.calculateCoorFromPercent(newPosition.x, newPosition.y)],
        });
    }

    async onKeyDown(event) {
        const key = event.key;
        // if key not found in the config then return
        if (!this.state.workingMappedKeysConfig[key]) {
            return;
        }

        // if key is already pressed then return
        if (this.currentlyPressedKeys.includes(key)) {
            return;
        }
        this.currentlyPressedKeys.push(key);

        // generate the sequence for the key pressed
        if (this.state.workingMappedKeysConfig[key]) {
            switch (this.state.workingMappedKeysConfig[key].type) {
                case 'dPad':
                    this.generateDPADSequence(key);
                    break;
                case 'tap':
                    this.generateTouchSequence(key);
                    break;
                case 'swipe':
                    this.generateSwipeSequence(key);
                    break;
                case 'dtap':
                    // Todo better way to manage this ?
                    this.generateTouchSequence(key);
                    await Promise.all(this.requestToGenerate);
                    this.requestToGenerate.push(this.generateSequences());
                    await this.onKeyUp(event);
                    this.generateTouchSequence(key);
                    await Promise.all(this.requestToGenerate);
                    this.requestToGenerate.push(this.generateSequences());
                    await this.onKeyUp(event);
                    break;
                default:
                    break;
            }
        }

        // wait for other sequence to be sent
        await Promise.all(this.requestToGenerate);
        this.requestToGenerate.push(this.generateSequences());
    }

    async onKeyUp(event) {
        const key = event.key;
        // if key not found in the config then return
        if (!this.state.workingMappedKeysConfig[key]) {
            return;
        }

        const groupId = this.state.workingMappedKeysConfig[key].groupId;

        // remove the key from the currentlyPressedKeys
        if (this.currentlyPressedKeys.includes(key)) {
            this.currentlyPressedKeys = this.currentlyPressedKeys.filter((k) => k !== key);
        }

        // if all keys are released then empty this.sequence and send release to vm and return
        if (!this.currentlyPressedKeys.length) {
            await this.releaseAllTouch();

            return;
        }

        // If another key with the same groupId is pressed then generate new coordonate for dpad and return
        if (
            this.currentlyPressedKeys.some(
                (k) =>
                    this.state.workingMappedKeysConfig[k].groupId === this.state.workingMappedKeysConfig[key].groupId &&
                    this.state.workingMappedKeysConfig[k].type === 'dPad',
            )
        ) {
            // update dpad sequence
            this.generateDPADSequence(key);
            await Promise.all(this.requestToGenerate);
            this.requestToGenerate = [];
            this.requestToGenerate.push(this.generateSequences());

            return;
        }

        this.sequences[groupId] = [];
        await Promise.all(this.requestToGenerate);
        this.requestToGenerate.push(this.generateSequences());
    }

    async onMouseDown(event) {
        this.sequences.mouse.push({
            type: 'MULTI_TOUCH',
            mode: 0,
            nb: 1,
            points: [
                {
                    x: this.instance.coordinateUtils.getXCoordinate(event),
                    y: this.instance.coordinateUtils.getYCoordinate(event),
                },
            ],
        });
        await Promise.all(this.requestToGenerate);
        this.requestToGenerate.push(this.generateSequences());
    }

    async onMouseUp() {
        // if all key are up then send touch up
        if (!this.currentlyPressedKeys.length) {
            await this.releaseAllTouch();
            return;
        }
        // TODO have a fn to push and wait
        await Promise.all(this.requestToGenerate);
        this.sequences.mouse = [];

        this.requestToGenerate.push(this.generateSequences());
    }

    async onMouseMove(event) {
        if (event.buttons !== 1) {
            return;
        }

        this.sequences.mouse.push({
            type: 'MULTI_TOUCH',
            mode: 2,
            nb: 1,
            points: [
                {
                    x: this.instance.coordinateUtils.getXCoordinate(event),
                    y: this.instance.coordinateUtils.getYCoordinate(event),
                },
            ],
        });
        await Promise.all(this.requestToGenerate);
        this.requestToGenerate.push(this.generateSequences());
    }

    getTapTouchEvent(keyConfig) {
        return this.calculateCoorFromPercent(keyConfig.x, keyConfig.y);
    }

    async releaseAllTouch() {
        const json = {
            type: 'MULTI_TOUCH',
            nb: 0,
            mode: 1,
            points: [],
        };

        await Promise.all(this.requestToGenerate);
        this.sendEvent(json);
        Object.keys(this.sequences).forEach((k) => {
            this.sequences[k] = [];
        });
    }

    sendEvent(json) {
        // Stop all curently events
        this.instance.sendEvent(json);
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
                {event: 'mousedown', handler: this.onMouseDown.bind(this), removeListener: null},
                {event: 'mouseup', handler: this.onMouseUp.bind(this), removeListener: null},
                {event: 'mousemove', handler: this.onMouseMove.bind(this), removeListener: null},
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
        this.keyboardCallbacks.length = 0;
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

        return {x: Math.floor(xFromPercent), y: Math.floor(yFromPercent)};
    }

    calculateCoorToPercent(x, y) {
        const videoSize = this.instance.video.getBoundingClientRect();

        const xPercent = 100 / ((videoSize.width * this.instance.coordinateUtils.getXRatio()) / x);
        const yPercent =
            100 /
            (((videoSize.height - this.instance.coordinateUtils.getTopBorder() * 2) *
                this.instance.coordinateUtils.getYRatio()) /
                y);
        return {x: Math.round(xPercent), y: Math.round(yPercent)};
    }
};
