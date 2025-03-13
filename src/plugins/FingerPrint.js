'use strict';

const OverlayPlugin = require('./util/OverlayPlugin');
const {switchButton} = require('./util/components');
const log = require('loglevel');
log.setDefaultLevel('debug');

/**
 * Instance fingerprint plugin.
 * Provides fingerprint authentification capability between client and instance.
 */
const FINGERPRINT_MESSAGES = {
    toSend: {
        SCAN_RECOGNIZED: 'scan recognized',
        SCAN_UNRECOGNIZED: 'scan unrecognized',
        SCAN_DIRTY: 'scan dirty',
        SCAN_TOO_FAST: 'scan too_fast',
        SCAN_PARTIAL: 'scan partial',
        SCAN_INSUFFICIENT: 'scan insufficient',
        SET_AUTO_RECOGNIZE_FALSE: 'set auto_recognize false',
        SET_AUTO_RECOGNIZE_TRUE: 'set auto_recognize true',
        NOTIFY_ALL: 'notify all',
    },
    toReceive: {
        SCAN_ERROR: 'scan error',
        SCAN_ERROR_TIMEOUT: 'scan error timeout',
        SCAN_ERROR_CANCELED: 'scan error canceled',
        CURRENT_STATUS_IDLE: 'current_status idle',
        CURRENT_STATUS_SCANNING: 'current_status scanning',
        CURRENT_STATUS_ENROLLING: 'current_status enrolling',
        SCAN_START: 'scan start',
        SCAN_SUCCESS: 'scan success',
        AUTO_RECOGNIZE_FALSE: 'auto_recognize false',
        AUTO_RECOGNIZE_TRUE: 'auto_recognize true',
    },
};
module.exports = class FingerPrint extends OverlayPlugin {
    static get name() {
        return 'FingerPrint';
    }
    /**
     * Plugin initialization.
     *
     * @param {Object} instance Associated instance.
     * @param {Object} i18n     Translations keys for the UI.
     */
    constructor(instance, i18n) {
        super(instance);

        // Reference instance
        this.instance = instance;
        this.i18n = i18n || {};

        // Register plugin
        this.instance.fingerprint = this;

        // proxy for unidirectionnal modification (state -> widget)
        this.state = new Proxy(
            {
                isScanStart: false,
                isRecognizedFPByDefault: false,
                isEnrolling: false,
                isScanning: false,
            },
            {
                set: (state, prop, value) => {
                    const oldValue = state[prop];
                    state[prop] = value;

                    // post update process
                    if ((state.isEnrolling || state.isScanning) && !state.isRecognizedFPByDefault) {
                        this.enableBody();
                    } else {
                        this.disableBody();
                    }

                    const authRequiredDiv = document.querySelector('.gm-fingerprint-dialog-auth-required-status');

                    switch (prop) {
                        case 'isScanStart':
                        case 'isEnrolling':
                        case 'isScanning':
                            if (state.isScanStart && (state.isEnrolling || state.isScanning)) {
                                authRequiredDiv.classList.add('active');
                                authRequiredDiv.setAttribute('data-text', this.i18n.yes || 'Yes');
                                this.toolbarBtn.setIndicator('notification');
                            } else {
                                authRequiredDiv.classList.remove('active');
                                authRequiredDiv.setAttribute('data-text', this.i18n.no || 'No');
                                if (state.isRecognizedFPByDefault) {
                                    this.toolbarBtn.setIndicator('actif');
                                } else {
                                    this.toolbarBtn.setIndicator('');
                                }
                            }
                            break;
                        case 'isRecognizedFPByDefault':
                            /*
                             * At start we fetch the value from the HAL with this.sendDataToInstance(FINGERPRINT_MESSAGES.toSend.NOTIFY_ALL)
                             * so the instance send an AUTO_RECOGNIZE_FALSE event, which change the isRecognizedFPByDefault state (this.state.isRecognizedFPByDefault)
                             * which trigger a this.sendDataToInstance(FINGERPRINT_MESSAGES.toSend.SET_AUTO_RECOGNIZE_TRUE);
                             * so the instance send an AUTO_RECOGNIZE_FALSE event ... and we get an infinite loop
                             * to avoid this we check if the value is different from the old one but we update UI anyway (to get the right ui state at start)
                             */
                            if (value !== oldValue) {
                                if (value) {
                                    this.sendDataToInstance(FINGERPRINT_MESSAGES.toSend.SET_AUTO_RECOGNIZE_TRUE);
                                } else {
                                    this.sendDataToInstance(FINGERPRINT_MESSAGES.toSend.SET_AUTO_RECOGNIZE_FALSE);
                                }
                            }
                            if (value) {
                                this.toolbarBtn.setIndicator('actif');
                            } else {
                                this.toolbarBtn.setIndicator('');
                            }

                            // update switch
                            this.recognizedFPByDefaultStatus.setState(value);
                            break;
                        default:
                            break;
                    }
                    return true;
                },
            },
        );

        // Display widget
        this.registerToolbarButton();
        this.renderWidget();

        // register callback
        this.instance.registerEventCallback('fingerprint', (message) => this.handleFingerprintEvent(message));
        if (this.instance.store.state.isWebRTCConnectionReady) {
            this.sendDataToInstance(FINGERPRINT_MESSAGES.toSend.NOTIFY_ALL);
        } else {
            const unSubscribe = this.instance.store.subscribe(({isWebRTCConnectionReady}) => {
                if (isWebRTCConnectionReady) {
                    this.sendDataToInstance(FINGERPRINT_MESSAGES.toSend.NOTIFY_ALL);
                    unSubscribe();
                }
            });
        }
    }

    /**
     * Add the button to the player toolbar.
     */
    registerToolbarButton() {
        this.toolbarBtn = this.instance.toolbarManager.registerButton({
            id: this.constructor.name,
            iconClass: 'gm-fingerprint-button',
            title: this.i18n.FINGERPRINT_TITLE || 'Biometrics',
            onClick: this.toggleWidget.bind(this),
        });
    }

    /**
     * Render the widget.
     */
    renderWidget() {
        // Create elements
        const {container} = this.createTemplateModal({
            title: this.i18n.FINGERPRINT_TITLE || 'Biometrics',
            classes: 'gm-fingerprint-plugin',
            width: 378,
            height: 494,
        });
        container.classList.add('gm-fingerprint-container');

        // header
        const headerDiv = document.createElement('div');
        headerDiv.classList.add('gm-fingerprint-dialog-header');

        const authRequiredDiv = document.createElement('div');
        authRequiredDiv.classList.add('gm-fingerprint-dialog-auth-required');
        const authActiveText = document.createElement('span');
        authActiveText.innerHTML = this.i18n.BIOMETRIC_AUTH_REQUIRED || 'Biometric authentication required';
        const autRequiredStatus = document.createElement('div');
        autRequiredStatus.classList.add('gm-fingerprint-dialog-auth-required-status');
        autRequiredStatus.classList.add(this.state.isScanStart ? 'active' : 'inactive');
        autRequiredStatus.classList.remove(this.state.isScanStart ? 'active' : 'inactive');
        autRequiredStatus.setAttribute(
            'data-text',
            this.state.isScanStart ? this.i18n.yes || 'Yes' : this.i18n.no || 'No',
        );

        authRequiredDiv.appendChild(authActiveText);
        authRequiredDiv.appendChild(autRequiredStatus);

        const recognizedFPByDefaultDiv = document.createElement('div');
        recognizedFPByDefaultDiv.classList.add('gm-fingerprint-dialog-recognized-fp-by-default');
        const recognizedFPByDefaultText = document.createElement('span');
        recognizedFPByDefaultText.innerHTML =
            this.i18n.FINGERPRINT_AUTOMATIC_BIOMETRIC_AUTHENTICATION || 'Automatic biometric authentication';

        this.recognizedFPByDefaultStatus = switchButton.createSwitch({
            classes: 'autoValidationSwitch',
            onChange: (value) => {
                this.state.isRecognizedFPByDefault = value;
            },
        });

        recognizedFPByDefaultDiv.appendChild(recognizedFPByDefaultText);
        recognizedFPByDefaultDiv.appendChild(this.recognizedFPByDefaultStatus.element);

        headerDiv.appendChild(authRequiredDiv);
        headerDiv.appendChild(recognizedFPByDefaultDiv);
        container.appendChild(headerDiv);

        const separator = document.createElement('div');
        separator.className = 'gm-separator';
        container.appendChild(separator);

        // body
        const bodyDiv = document.createElement('div');
        bodyDiv.classList.add('gm-fingerprint-dialog-body');

        const buttonsDiv = document.createElement('div');
        buttonsDiv.classList.add('gm-fingerprint-dialog-buttons');

        // buttons fingerprint
        const fingerprintButtons = [
            {
                cmd: 'Recognized',
                message: FINGERPRINT_MESSAGES.toSend.SCAN_RECOGNIZED,
                onclick: (btn) => {
                    btn.classList.add('gm-loader');
                },
            },
            {
                cmd: 'Unrecognized',
                message: FINGERPRINT_MESSAGES.toSend.SCAN_UNRECOGNIZED,
            },
            {
                cmd: 'Dirty sensor',
                message: FINGERPRINT_MESSAGES.toSend.SCAN_DIRTY,
            },
            {
                cmd: 'Too-fast',
                message: FINGERPRINT_MESSAGES.toSend.SCAN_TOO_FAST,
            },
            {
                cmd: 'Partial',
                message: FINGERPRINT_MESSAGES.toSend.SCAN_PARTIAL,
            },
            {
                cmd: 'Insufficient',
                message: FINGERPRINT_MESSAGES.toSend.SCAN_INSUFFICIENT,
            },
        ];

        fingerprintButtons.forEach((button) => {
            this.createFingerprintButton(button, buttonsDiv);
        });

        bodyDiv.appendChild(buttonsDiv);
        container.appendChild(bodyDiv);

        // post setup
        this.disableBody();
    }

    /**
     * Create a fingerprint button and attached it to buttonDivs pass in parameter.
     * @param {String} button Button name.
     * @param {HTMLElement} buttonsDiv Buttons container.
     */
    createFingerprintButton({cmd, message, onclick}, buttonsDiv) {
        const buttonDiv = document.createElement('div');
        buttonDiv.classList.add('gm-fingerprint-dialog-button');

        const buttonImage = document.createElement('div');
        buttonImage.className = `gm-${cmd.toLowerCase().replace(' ', '-')}-fingerprint-image`;

        const buttonText = document.createElement('span');
        buttonText.innerHTML = this.i18n[`FINGERPRINT_${cmd.toUpperCase()}`] || cmd;

        buttonDiv.onclick = () => {
            this.sendDataToInstance(message);
            if (onclick) {
                onclick(buttonDiv);
            }
        };

        buttonDiv.appendChild(buttonImage);
        buttonDiv.appendChild(buttonText);
        buttonsDiv.appendChild(buttonDiv);
    }

    disableBody() {
        const buttons = document.querySelectorAll('.gm-fingerprint-dialog-body .gm-fingerprint-dialog-button');
        buttons.forEach((button) => {
            button.classList.add('disabled');
        });
    }
    enableBody() {
        const buttons = document.querySelectorAll('.gm-fingerprint-dialog-body .gm-fingerprint-dialog-button');
        buttons.forEach((button) => {
            button.classList.remove('disabled');
        });
    }

    handleFingerprintEvent(message) {
        // State synchronization
        switch (message) {
            case FINGERPRINT_MESSAGES.toReceive.SCAN_START:
                this.state.isScanStart = true;
                break;
            case FINGERPRINT_MESSAGES.toReceive.SCAN_SUCCESS:
            case FINGERPRINT_MESSAGES.toReceive.SCAN_ERROR_TIMEOUT:
            case FINGERPRINT_MESSAGES.toReceive.SCAN_ERROR_CANCELED:
            case FINGERPRINT_MESSAGES.toReceive.SCAN_ERROR:
                this.state.isEnrolling = false;
                this.state.isScanning = false;
                this.state.isScanStart = false;
                Array.from(document.querySelectorAll('.gm-fingerprint-dialog-button')).forEach((btn) => {
                    btn.classList.remove('gm-loader');
                });
                this.closeWidget();
                break;
            case FINGERPRINT_MESSAGES.toReceive.CURRENT_STATUS_SCANNING:
                this.state.isScanning = true;
                break;
            case FINGERPRINT_MESSAGES.toReceive.CURRENT_STATUS_ENROLLING:
                this.state.isEnrolling = true;
                this.state.isScanning = false;
                break;
            case FINGERPRINT_MESSAGES.toReceive.AUTO_RECOGNIZE_FALSE:
                this.state.isRecognizedFPByDefault = false;
                break;
            case FINGERPRINT_MESSAGES.toReceive.AUTO_RECOGNIZE_TRUE:
                this.state.isRecognizedFPByDefault = true;
                break;
            default:
                break;
        }
    }

    /**
     * Send information to instance.
     *
     * @param {string} message - The message to send.
     */
    sendDataToInstance(message) {
        const json = {
            channel: 'fingerprint',
            messages: [message],
        };
        this.instance.sendEvent(json);
    }
};
