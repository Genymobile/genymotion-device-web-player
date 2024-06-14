'use strict';

// TODO voir videoWrapper pour remplacer parentElement !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

const DEAULT_CONFIG = {
    97: {
        command: 'tap',
        options: {
            x: 50,
            y: 50,
        },
    },
    101: {
        command: 'dtap',
        options: {
            x: 50,
            y: 50,
        },
    },
    114: {
        command: 'tilt',
        options: {
            x: 0,
            y: 0,
        },
    },
    113: {
        command: 'left-swipe',
        options: {
            x: 50,
            y: 50,
            distance: 100,
        },
    },
    115: {
        command: 'down-swipe',
        options: {
            x: 0,
            y: 50,
            distance: 100,
        },
    },
    100: {
        command: 'right-swipe',
        options: {
            x: 50,
            y: 50,
            distance: 100,
        },
    },
    122: {
        command: 'up-swipe',
        options: {
            x: 0,
            y: 50,
            distance: 100,
        },
    },
};
const MINECRAFT = {
    z: {
        command: 'keepPressing',
        options: {
            initialX: 21,
            initialY: 60,
            x: 21,
            y: 50,
        },
        description: 'up',
    },
    s: {
        command: 'keepPressing',
        options: {
            initialX: 21,
            initialY: 60,
            x: 21,
            y: 70,
        },
        description: 'down',
    },
    q: {
        command: 'keepPressing',
        options: {
            initialX: 21,
            initialY: 60,
            x: 11,
            y: 60,
        },
        description: 'left',
    },
    d: {
        command: 'keepPressing',
        options: {
            initialX: 21,
            initialY: 60,
            x: 31,
            y: 60,
        },
        description: 'right',
    },
    r: {
        command: 'tap',
        options: {
            x: 90,
            y: 90,
        },
        description: 'jump',
    },
    t: {
        command: 'keepPressing',
        options: {
            initialX: 30,
            initialY: 60,
            x: 21,
            y: 70,
        },
    },
};

const SOUL_KNIGHT = {
    z: {
        command: 'keepPressing',
        options: {
            initialX: 30,
            initialY: 50,
            x: 30,
            y: 40,
        },
        description: 'up',
    },
    s: {
        command: 'keepPressing',
        options: {
            initialX: 30,
            initialY: 50,
            x: 30,
            y: 60,
        },
        description: 'down',
    },
    q: {
        command: 'keepPressing',
        options: {
            initialX: 30,
            initialY: 50,
            x: 20,
            y: 50,
        },
        description: 'left',
    },
    d: {
        command: 'keepPressing',
        options: {
            initialX: 30,
            initialY: 50,
            x: 40,
            y: 50,
        },
        description: 'right',
    },
    r: {
        command: 'tap',
        options: {
            x: 75,
            y: 85,
        },
        description: 'special',
    },
    e: {
        command: 'tap',
        options: {
            x: 85,
            y: 80,
        },
        description: 'fire',
    },
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
        this.currentKeepPressing = [];

        this.config = SOUL_KNIGHT; // DEAULT_CONFIG;

        // Register plugin
        this.instance.KeyboardMapping = this;

        this.isActive = false;
        this.isPaused = false;
        this.keyboardCallbacks = [];
        this.currentlyPressedKeys = new Map();

        // deactivate the plugin listening when dialog is open
        this.instance.store.subscribe(({overlay: {isOpen}}) => {
            // TODO passer par un proxy
            if (isOpen) {
                this.removeKeyboardCallbacks();
                this.isPaused = true;
            } else if (this.isActive && this.isPaused) {
                this.isPaused = false;
                this.activate();
            }
        });

        // register setConfigFile for api
        this.instance.apiManager.registerFunction(
            'setConfigFile',
            (config) => {
                // check it's a valid JSON
                try {
                    JSON.parse(JSON.stringify(config));
                } catch (err) {
                    throw new Error('Invalid JSON');
                }
                this.config = config;
                this.resetMapping();
            },
            'Submit a config for mapping keys',
        );

        // Display widget
        this.renderToolbarButton();

        // activate plugin TODO passer par un proxy pour gerer isActive
        this.activate();

        // debug mode TODO en faire une option du widget
        this.instance.apiManager.registerFunction(
            'activeKeyMappingDebug',
            (activate = true) => {
                if (activate) {
                    this.activateDebugMode();
                } else {
                    this.activateDebugMode(false);
                }
            },
            'Activate debug mode for key mapping. Click on screen add a div with x, y coordonates.',
        );
        // debug grid mode TODO en faire une option du widget
        this.instance.apiManager.registerFunction(
            'activeKeyMappingGridHelper',
            (activate = true) => {
                if (activate) {
                    this.activateGrid();
                } else {
                    this.activateGrid(false);
                }
            },
            'Display a grid on the screen to help mapping keys. 10% of the screen width and height.',
        );

        //TEST OK multi touch TODO en faire une option du widget OK
        // setTimeout(async () => {
        //     const json = {type: 'MULTI_TOUCH', nb: 2, mode: 0, points: []};

        //     //click joystick
        //     json.mode = 0;
        //     json.nb = 2;
        //     json.points = [];
        //     const x = 393;
        //     const y = 100;

        //     json.points.push({x: x, y: y});
        //     json.points.push({x: 1106, y: 589});
        //     this.instance.sendEvent(json);

        //     json.mode = 2;
        //     json.nb = 2;

        //     // Move joystick
        //     for (const i of Array.from(Array(1).keys())) {
        //         json.points = [];
        //         json.points.push({x: x, y: y + i + 100});
        //         json.points.push({x: 1106, y: 589});

        //         //json.points.push({x: 1038, y: 623});
        //         this.instance.sendEvent(json);
        //     }
        // }, 1000);
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
        this.toolbarBtn.onclick = () => this.activate(!this.isActive);
        this.toolbarBtn.appendChild(this.toolbarBtnImage);
        toolbar.appendChild(this.toolbarBtn);
    }

    activate(state = true) {
        this.isActive = state;
        if (this.isActive) {
            this.toolbarBtnImage.classList.add('gm-active');
            this.addKeyboardCallbacks();
            this.instance.store.dispatch({type: 'KEYBOARD_EVENTS_ENABLED', payload: false});
        } else {
            this.toolbarBtnImage.classList.remove('gm-active');
            this.removeKeyboardCallbacks();
            this.instance.store.dispatch({type: 'KEYBOARD_EVENTS_ENABLED', payload: true});
        }
    }

    /**
     * Cancel all pressed keys.
     * This is mainly used to avoid continuously pressed keys because of alt+tab
     * or any other command that remove focus (blur) the page.
     */
    cancelAllPressedKeys() {
        this.currentlyPressedKeys.forEach((value) => {
            const text = '';
            const json = {
                type: 'KEYBOARD_RELEASE',
                keychar: text,
                keycode: value,
            };
            this.instance.sendEvent(json);
        });
        this.currentlyPressedKeys.clear();
    }

    /**
     * Called when the user press a key. Handle special events like backspace.
     *
     * @param  {Event}   event Event.
     * @return {boolean}  Whether or not the event must continue propagation.
     */
    onKeyDown(event) {
        const key = event.key;

        if (this.config[key]) {
            const {options, command} = this.config[key];

            switch (command) {
                case 'keepPressing':
                    if (-1 === this.currentKeepPressing.findIndex((keepPressingObject) => keepPressingObject[key])) {
                        console.log('uuuuhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh');
                        this.currentKeepPressing.push({
                            [key]: this.keepPressing(options.x, options.y, options.initialX, options.initialY),
                        });
                    }
                    break;
                case 'tilt':
                    this.tilt();
                    break;
                case 'tap':
                    this.tap(options.x, options.y);
                    break;
                case 'dtap':
                    this.doubleTap(options.x, options.y);
                    break;
                case 'left-swipe':
                    this.slide(options.x, options.y, options.x - options.distance, options.y);
                    break;
                case 'right-swipe':
                    this.slide(options.x, options.y, options.x + options.distance, options.y);
                    break;
                case 'down-swipe':
                    this.slide(options.x, options.y, options.x, options.y + options.distance);
                    break;
                case 'up-swipe':
                    this.slide(options.x, options.y, options.x, options.y - options.distance);
                    break;
                default:
                    break;
            }
        }
    }

    /**
     * Called when the user release a key. Handle special events like backspace
     *
     * @param  {Event}   event Event.
     * @return {boolean}       Whether or not the event must continue propagation.
     */
    async onKeyUp(event) {
        const key = event.key;

        if (this.config[key]) {
            const {options, command} = this.config[key];

            switch (command) {
                case 'keepPressing':
                    console.log(
                        'onKeyUp****************************************************',
                        key,
                        this.currentKeepPressing,
                    );
                    this.currentKeepPressing = this.currentKeepPressing.filter((keyPressedObject) => {
                        if (keyPressedObject[key]) {
                            keyPressedObject[key]();
                            return false;
                        }
                        return true;
                    });
                    console.log(
                        'onKeyUp****************************************************FIN',
                        key,
                        this.currentKeepPressing,
                    );

                    // resend keydown always push release and resend key
                    if (this.currentKeepPressing.length) {
                        /*console.log(
                            'resend keydown------------------------------',
                            Object.keys(this.currentKeepPressing[this.currentKeepPressing.length - 1])[0],
                        );*/

                        const lastKeyPressed = Object.keys(
                            this.currentKeepPressing[this.currentKeepPressing.length - 1],
                        )[0];
                        const {options} = this.config[lastKeyPressed];
                        this.currentKeepPressing = this.currentKeepPressing.filter((keyPressedObject) => {
                            if (keyPressedObject[lastKeyPressed]) {
                                keyPressedObject[lastKeyPressed]();
                                return false;
                            }
                            return true;
                        });
                        /*
                         * delay with await promise setimeout
                         * await cause event isn't already sent to the vm
                         * ugly hack !!!!!!!!!
                         */
                        this.currentKeepPressing.push({[lastKeyPressed]: () => {}});
                        await new Promise((resolve) => setTimeout(resolve, 25));
                        console.log(
                            'aaaaaaaaaaaaaaaaahhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh',
                            this.currentKeepPressing,
                            options,
                        );
                        const lastKeyPressedIndex = this.currentKeepPressing.findIndex(
                            (keepPressingObject) => keepPressingObject[lastKeyPressed],
                        );
                        if (this.currentKeepPressing[lastKeyPressedIndex]) {
                            this.currentKeepPressing[lastKeyPressedIndex][lastKeyPressed] = this.keepPressing(
                                options.x,
                                options.y,
                                options.initialX,
                                options.initialY,
                            );
                        }
                    }
                    break;
                default:
                    break;
            }
        }
    }

    // eslint-disable-next-line no-undefined
    keepPressing(x, y, initialX = undefined, initialY = undefined) {
        const videoSize = this.instance.video.getBoundingClientRect();

        // const xFromPercent = (x / 100) * videoSize.width;
        // const yFromPercent = (y / 100) * videoSize.height; /*+ this.instance.coordinateUtils.getTopBorder()*/

        const xFromPercent = (x / 100) * videoSize.width * this.instance.coordinateUtils.getXRatio();
        const yFromPercent =
            (y / 100) *
            (videoSize.height - this.instance.coordinateUtils.getTopBorder() * 2) *
            this.instance.coordinateUtils.getYRatio();

        if (initialX && initialY) {
            // const initialXFromPercent = (initialX / 100) * videoSize.width;
            // const initialYFromPercent =
            //     (initialY / 100) * videoSize.height; /*+ this.instance.coordinateUtils.getTopBorder()*/

            const initialXFromPercent = (initialX / 100) * videoSize.width * this.instance.coordinateUtils.getXRatio();
            const initialYFromPercent =
                (initialY / 100) *
                (videoSize.height - this.instance.coordinateUtils.getTopBorder() * 2) *
                this.instance.coordinateUtils.getYRatio();

            this.instance.sendEvent({type: 'MOUSE_PRESS', x: initialXFromPercent, y: initialYFromPercent});
            this.instance.sendEvent({type: 'MOUSE_MOVE', x: xFromPercent, y: yFromPercent});
            console.log(
                'xxxCONNECTkeepPressing',
                this.instance.coordinateUtils.getXRatio(),
                initialX,
                initialY,
                xFromPercent,
                yFromPercent,
                initialXFromPercent,
                initialYFromPercent,
                this.instance.coordinateUtils.getTopBorder(),
            );
        } else {
            this.instance.sendEvent({type: 'MOUSE_PRESS', x: xFromPercent, y: yFromPercent});
        }

        // this.displayDebugTrace(this.instance.video.parentElement, xFromPercent, yFromPercent);

        return () => {
            console.log('xxxRELEASEkeepPressing', x, y, xFromPercent, yFromPercent);
            this.instance.sendEvent({type: 'MOUSE_RELEASE', x: xFromPercent, y: yFromPercent});
        };
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
    slide(startX, startY, stopX, stopY) {
        this.instance.sendEvent({type: 'MOUSE_PRESS', x: startX, y: startY});
        this.instance.sendEvent({type: 'MOUSE_MOVE', x: stopX, y: stopY});
        this.instance.sendEvent({type: 'MOUSE_RELEASE', x: stopX, y: stopY});
    }

    async tap(x, y) {
        // this.instance.sendEvent({type: 'MOUSE_PRESS', x, y});
        // this.instance.sendEvent({type: 'MOUSE_RELEASE', x, y});
        const videoSize = this.instance.video.getBoundingClientRect();

        let xFromPercent = (x / 100) * videoSize.width * this.instance.coordinateUtils.getXRatio();
        let yFromPercent =
            (y / 100) *
            (videoSize.height - this.instance.coordinateUtils.getTopBorder() * 2) *
            this.instance.coordinateUtils.getYRatio();

        //xFromPercent = 1000; //min 31 max 96 delta 65
        //yFromPercent = 25;

        console.log('tap', xFromPercent, yFromPercent);
        // this.displayDebugTrace(this.instance.video.parentElement, xFromPercent, yFromPercent);

        this.instance.sendEvent({type: 'MOUSE_PRESS', x: xFromPercent, y: yFromPercent});
        //await new Promise((resolve) => setTimeout(resolve, 100));
        this.instance.sendEvent({type: 'MOUSE_RELEASE', x: xFromPercent, y: yFromPercent});
    }

    doubleTap(x, y) {
        this.tap(x, y);
        this.tap(x, y);
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
        return;
        Array.from(Array(2).keys()).forEach(() => {
            this.instance.sendEvent({type: 'ACCELEROMETER', x: -100, y: -10, z: 0});
            this.instance.sendEvent({type: 'ACCELEROMETER', x: 100, y: -10, z: 0});
            this.instance.sendEvent({type: 'ACCELEROMETER', x: 200, y: 0, z: 0});
        });
    }
    activateDebugMode(isActive = true) {
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

            //adding x and y coordonates of this.instantce.root element to the div create above

            const videoSize = this.instance.video.getBoundingClientRect();

            const xPercent = 100 / ((videoSize.width * this.instance.coordinateUtils.getXRatio()) / xCoor);
            const yPercent =
                100 /
                (((videoSize.height - this.instance.coordinateUtils.getTopBorder() * 2) *
                    this.instance.coordinateUtils.getYRatio()) /
                    yCoor);

            div.style.whiteSpace = 'pre-line';
            const text = document.createTextNode(
                `x: ${xCoor}\ny: ${yCoor}\nx%: ${String(xPercent).substring(0, 5)}\ny%: ${String(yPercent).substring(0, 5)}`,
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
            this.removeDebugListener();
            this.removeDebugListener = null;
        }
    }

    activateGrid(isActive = true) {
        if (isActive) {
            const parentSize = this.instance.video.parentElement.getBoundingClientRect();
            const videoSize = this.instance.video.getBoundingClientRect();
            videoSize.height = videoSize.height - this.instance.coordinateUtils.getTopBorder() * 2;

            //div vertical
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
                this.instance.video.parentElement.appendChild(div);
            });
            //div horizontal
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
                this.instance.video.parentElement.appendChild(div);
            });
        } else {
            this.instance.video.parentElement.querySelectorAll('.keyMapping-helping-grid').forEach((e) => e.remove());
        }
    }

    displayDebugTrace(element, x, y) {
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.left = `${x}px`;
        div.style.top = `${y}px`;
        div.style.width = '100px';
        div.style.height = '100px';
        div.style.background = 'red';

        const text = document.createTextNode(`x: ${x}, y: ${y}, x%: ${x}, y%: ${y}`);
        div.appendChild(text);

        div.onclick = (e) => {
            e.stopPropagation();
            div.remove();
        };

        element.appendChild(div);
    }
};
