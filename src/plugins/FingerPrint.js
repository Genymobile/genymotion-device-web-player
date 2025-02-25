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
                                this.toolbarBtn.addClass('fingerprint-require');
                            } else {
                                authRequiredDiv.classList.remove('active');
                                authRequiredDiv.setAttribute('data-text', this.i18n.no || 'No');
                                this.toolbarBtn.removeClass('fingerprint-require');
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
                                this.toolbarBtn.addClass('fingerprint-autoValidation');
                            } else {
                                this.toolbarBtn.removeClass('fingerprint-autoValidation');
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
        });
        container.classList.add('gm-fingerprint-container');

        // header
        const headerDiv = document.createElement('div');
        headerDiv.classList.add('gm-fingerprint-dialog-header');

        const authRequiredDiv = document.createElement('div');
        authRequiredDiv.classList.add('gm-fingerprint-dialog-auth-required');
        const authActiveLabel = document.createElement('label');
        authActiveLabel.innerHTML = this.i18n.FINGERPRINT_AUTH_REQUIRED_LABEL || 'Authentification required';
        const autRequiredStatus = document.createElement('div');
        autRequiredStatus.classList.add('gm-fingerprint-dialog-auth-required-status');
        autRequiredStatus.classList.add(this.state.isScanStart ? 'active' : 'inactive');
        autRequiredStatus.classList.remove(this.state.isScanStart ? 'active' : 'inactive');
        autRequiredStatus.setAttribute(
            'data-text',
            this.state.isScanStart ? this.i18n.yes || 'Yes' : this.i18n.no || 'No',
        );

        authRequiredDiv.appendChild(authActiveLabel);
        authRequiredDiv.appendChild(autRequiredStatus);

        const recognizedFPByDefaultDiv = document.createElement('div');
        recognizedFPByDefaultDiv.classList.add('gm-fingerprint-dialog-recognized-fp-by-default');
        const recognizedFPByDefaultLabel = document.createElement('label');
        recognizedFPByDefaultLabel.innerHTML =
            this.i18n.FINGERPRINT_RECOGNIZED_FP_BY_DEFAULT_LABEL || 'Recognized by default';

        this.recognizedFPByDefaultStatus = switchButton.createSwitch({
            onChange: (value) => {
                this.state.isRecognizedFPByDefault = value;
            },
        });

        this.recognizedFPByDefaultStatus.element.classList.add('gm-fingerprint-dialog-recognized-fp-by-default-status');

        recognizedFPByDefaultDiv.appendChild(recognizedFPByDefaultLabel);
        recognizedFPByDefaultDiv.appendChild(this.recognizedFPByDefaultStatus.element);

        headerDiv.appendChild(authRequiredDiv);
        headerDiv.appendChild(recognizedFPByDefaultDiv);
        container.appendChild(headerDiv);
        container.appendChild(document.createElement('hr'));

        // body
        const bodyDiv = document.createElement('div');
        bodyDiv.classList.add('gm-fingerprint-dialog-body');

        const buttonsDiv = document.createElement('div');
        buttonsDiv.classList.add('gm-fingerprint-dialog-buttons');

        // buttons fingerprint
        const fingerprintButtons = [
            {
                cmd: 'recognized',
                message: FINGERPRINT_MESSAGES.toSend.SCAN_RECOGNIZED,
                onclick: (btn) => {
                    btn.classList.add('gm-loader');
                },
            },
            {
                cmd: 'unrecognized',
                message: FINGERPRINT_MESSAGES.toSend.SCAN_UNRECOGNIZED,
            },
            {
                cmd: 'dirty',
                message: FINGERPRINT_MESSAGES.toSend.SCAN_DIRTY,
            },
            {
                cmd: 'too-fast',
                message: FINGERPRINT_MESSAGES.toSend.SCAN_TOO_FAST,
            },
            {
                cmd: 'partial',
                message: FINGERPRINT_MESSAGES.toSend.SCAN_PARTIAL,
            },
            {
                cmd: 'insufficient',
                message: FINGERPRINT_MESSAGES.toSend.SCAN_INSUFFICIENT,
            },
        ];

        fingerprintButtons.forEach((button) => {
            this.createFingerprintButton(button, buttonsDiv);
        });

        bodyDiv.appendChild(buttonsDiv);
        container.appendChild(bodyDiv);

        // Footer
        container.appendChild(document.createElement('hr'));
        const footerDiv = document.createElement('div');
        footerDiv.classList.add('gm-fingerprint-dialog-footer');

        const giveFeedbackDiv = document.createElement('div');
        giveFeedbackDiv.classList.add('gm-fingerprint-dialog-give-feedback');
        const giveFeedbackLink = document.createElement('a');
        giveFeedbackLink.href = this.instance.options.giveFeedbackLink;
        giveFeedbackLink.innerHTML = this.i18n.FINGERPRINT_GIVE_FEEDBACK_LABEL || 'Give feedback';
        giveFeedbackLink.target = '_blank';
        giveFeedbackLink.rel = 'noopener noreferrer';

        giveFeedbackDiv.appendChild(giveFeedbackLink);

        footerDiv.appendChild(giveFeedbackDiv);
        container.appendChild(footerDiv);

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
        buttonImage.className = `gm-${cmd}-fingerprint-image`;

        const buttonLabel = document.createElement('label');
        buttonLabel.innerHTML = this.i18n[`FINGERPRINT_${cmd.toUpperCase()}_LABEL`] || cmd;

        buttonDiv.onclick = () => {
            this.sendDataToInstance(message);
            if (onclick) {
                onclick(buttonDiv);
            }
        };

        buttonDiv.appendChild(buttonImage);
        buttonDiv.appendChild(buttonLabel);
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
                this.toggleWidget();
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
