'use strict';

const OverlayPlugin = require('./util/OverlayPlugin');
const {switchButton} = require('./util/components');
const log = require('loglevel');
log.setDefaultLevel('debug');

/**
 * Instance fingerprint plugin.
 * Provides fingerprint authentification capability between client and instance.
 */
module.exports = class FingerPrint extends OverlayPlugin {
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
        this.state = new Proxy({
            isScanStart: false,
            isRecognizedFPByDefault: false,
            isStatusIdle: false,
            isEnrolling: false,
            isScanning: false,
        }, {
            set: (state, prop, value) => {
                state[prop] = value;

                // post update process
                if ((state.isEnrolling || state.isScanning) && !state.isRecognizedFPByDefault) {
                    this.enableBody();
                } else {
                    this.disableBody();
                }

                const authRequiredDiv = document.querySelector('.gm-fingerprint-dialog-auth-required-status');

                switch (prop) {
                case 'isStatusIdle':
                    break;
                case 'isScanStart':
                case 'isEnrolling':
                case 'isScanning':

                    if (state.isScanStart && (state.isEnrolling || state.isScanning)) {
                        if (this.state.isRecognizedFPByDefault) {
                            this.sendDataToInstance('scan recognized');
                            this.closeWidget();
                            return true;
                        }
                        authRequiredDiv.classList.add('active');
                        authRequiredDiv.setAttribute('data-text', 'Yes');
                        this.toolbarBtnImage.classList.add('fingerprint-require');
                    } else {
                        authRequiredDiv.classList.remove('active');
                        authRequiredDiv.setAttribute('data-text', 'No');
                        this.toolbarBtnImage.classList.remove('fingerprint-require');
                    }
                    break;
                case 'isRecognizedFPByDefault':
                    // if a scan is required before isRecognizedFPByDefault is set to true, we send a scan recognized
                    if (state.isScanStart && (state.isEnrolling || state.isScanning)){
                        this.sendDataToInstance('scan recognized');
                    }

                    if (value) {
                        this.toolbarBtnImage.classList.add('fingerprint-autoValidation');
                    } else {
                        this.toolbarBtnImage.classList.remove('fingerprint-autoValidation');
                    }
                    break;
                default:
                    break;
                }
                return true;
            }
        });

        // Display widget
        this.renderToolbarButton();
        this.renderWidget();

        // register callback
        this.instance.registerEventCallback('fingerprint', (message) => {
            // State synchronization
            if (message !== 'current_status_idle') {
                this.state.isStatusIdle = false;
            }
            switch (message) {
            case 'scan start':
                this.state.isScanStart = true;
                break;
            case 'scan success':
            case 'scan error timeout':
            case 'scan error canceled':
            case 'scan error':
                this.state.isEnrolling = false;
                this.state.isScanning = false;
                this.state.isScanStart = false;
                Array.from(document.querySelectorAll('.gm-fingerprint-dialog-button'))
                    .forEach((btn) => {
                        btn.classList.remove('gm-loader');
                    });
                this.closeWidget();
                break;
            case 'current_status idle':
                this.state.isStatusIdle = true;
                break;
            case 'current_status scanning':
                this.state.isScanning = true;
                break;
            case 'current_status enrolling':
                this.state.isEnrolling = true;
                this.state.isScanning = false;
                break;
            default:
                break;
            }
        });
    }

    /**
     * Add the button to the player toolbar.
     */
    renderToolbarButton() {
        const toolbars = this.instance.getChildByClass(this.instance.root, 'gm-toolbar');
        if (!toolbars) {
            return; // if we don't have toolbar, we can't spawn the widget
        }

        const toolbar = toolbars.children[0];
        this.toolbarBtn = document.createElement('li');
        this.toolbarBtnImage = document.createElement('div');
        this.toolbarBtnImage.className = 'gm-icon-button gm-fingerprint-button';
        this.toolbarBtnImage.title = this.i18n.FINGERPRINT_TITLE || 'Biometrics';
        this.toolbarBtn.onclick = () => this.toggleWidget();
        this.toolbarBtn.appendChild(this.toolbarBtnImage);
        toolbar.appendChild(this.toolbarBtn);
    }

    /**
     * Render the widget.
     */
    renderWidget() {
        // Create elements
        this.widget = document.createElement('div');
        this.container = document.createElement('div');
        this.container.className = 'gm-fingerprint-container';

        // Generate title
        const title = document.createElement('div');
        title.className = 'gm-title';
        title.innerHTML = this.i18n.FINGERPRINT_TITLE || 'Biometrics';
        this.container.appendChild(title);

        // header
        const headerDiv = document.createElement('div');
        headerDiv.classList.add('gm-fingerprint-dialog-header');

        const authRequiredDiv = document.createElement('div');
        authRequiredDiv.classList.add('gm-fingerprint-dialog-auth-required');
        const authActiveLabel = document.createElement('label');
        authActiveLabel.innerHTML = this.i18n.FINGERPRINT_AUTH_REQUIRED_LABEL || 'Authentification required';
        const autRequiredStatus = document.createElement('div');
        autRequiredStatus.classList.add('gm-fingerprint-dialog-auth-required-status');
        autRequiredStatus.classList.add(this.isScanStart ? 'active' : 'inactive');
        autRequiredStatus.classList.remove(this.isScanStart ? 'active' : 'inactive');
        autRequiredStatus.setAttribute('data-text', this.isScanStart ? 'Yes' : 'No');

        authRequiredDiv.appendChild(authActiveLabel);
        authRequiredDiv.appendChild(autRequiredStatus);

        const recognizedFPByDefaultDiv = document.createElement('div');
        recognizedFPByDefaultDiv.classList.add('gm-fingerprint-dialog-recognized-fp-by-default');
        const recognizedFPByDefaultLabel = document.createElement('label');
        recognizedFPByDefaultLabel.innerHTML =
            this.i18n.FINGERPRINT_RECOGNIZED_FP_BY_DEFAULT_LABEL || 'Recognized by default';
        const recognizedFPByDefaultStatus = switchButton.createSwitch({
            onChange: (value) => {
                this.state.isRecognizedFPByDefault = value;
            }
        });
        recognizedFPByDefaultStatus.classList.add('gm-fingerprint-dialog-recognized-fp-by-default-status');

        recognizedFPByDefaultDiv.appendChild(recognizedFPByDefaultLabel);
        recognizedFPByDefaultDiv.appendChild(recognizedFPByDefaultStatus);

        headerDiv.appendChild(authRequiredDiv);
        headerDiv.appendChild(recognizedFPByDefaultDiv);
        this.container.appendChild(headerDiv);
        this.container.appendChild(document.createElement('hr'));

        // body
        const bodyDiv = document.createElement('div');
        bodyDiv.classList.add('gm-fingerprint-dialog-body');

        const buttonsDiv = document.createElement('div');
        buttonsDiv.classList.add('gm-fingerprint-dialog-buttons');

        // buttons fingerprint
        const fingerprintButtons = [{
            cmd: 'recognized',
            message: 'scan recognized',
            onclick: (btn) => {
                btn.classList.add('gm-loader');
            }
        }, {
            cmd: 'unrecognized',
            message: 'scan unrecognized'
        }, {
            cmd: 'dirty',
            message: 'scan dirty'
        }, {
            cmd: 'too-fast',
            message: 'scan too_fast'
        }, {
            cmd: 'partial',
            message: 'scan partial'
        }, {
            cmd: 'insufficient',
            message: 'scan insufficient'
        }];

        fingerprintButtons.forEach((button) => {
            this.createFingerprintButton(button, buttonsDiv);
        });

        bodyDiv.appendChild(buttonsDiv);
        this.container.appendChild(bodyDiv);

        // Footer
        this.container.appendChild(document.createElement('hr'));
        const footerDiv = document.createElement('div');
        footerDiv.classList.add('gm-fingerprint-dialog-footer');

        const giveFeedbackDiv = document.createElement('div');
        giveFeedbackDiv.classList.add('gm-fingerprint-dialog-give-feedback');
        const giveFeedbackLink = document.createElement('a');
        giveFeedbackLink.href = 'https://github.com/orgs/Genymobile/discussions';
        giveFeedbackLink.innerHTML = this.i18n.FINGERPRINT_GIVE_FEEDBACK_LABEL || 'Give feedback';
        giveFeedbackLink.target = '_blank';
        giveFeedbackLink.rel = 'noopener noreferrer';

        giveFeedbackDiv.appendChild(giveFeedbackLink);

        footerDiv.appendChild(giveFeedbackDiv);
        this.container.appendChild(footerDiv);

        // Setup
        this.widget.className = 'gm-overlay gm-fingerprint-plugin gm-hidden';

        // Add close button
        const close = document.createElement('div');
        close.className = 'gm-close-btn';
        close.onclick = () => this.closeWidget();

        this.widget.appendChild(close);
        this.widget.appendChild(this.container);

        // Render into document
        this.overlays.push(this.widget);
        this.instance.root.appendChild(this.widget);

        // post setup
        this.disableBody();
    }

    /**
     * Display or hide the widget.
     */
    toggleWidget() {
        // Notify other callers
        if (this.widget.classList.contains('gm-hidden')) {
            this.instance.emit('close-overlays');
            this.instance.emit('keyboard-disable');
        } else {
            this.instance.emit('keyboard-enable');
        }

        // Toggle display
        this.widget.classList.toggle('gm-hidden');
        this.toolbarBtnImage.classList.toggle('gm-active');
    }

    /**
     * Close the widget.
     */
    closeWidget() {
        this.instance.emit('keyboard-enable');
        this.widget.classList.add('gm-hidden');
        this.toolbarBtnImage.classList.remove('gm-active');
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

    /**
     * Send information to instance.
     *
     * @param {string} message - The message to send.
     */
    sendDataToInstance(message) {
        const json = {
            channel: 'fingerprint', messages: [message],
        };
        this.instance.sendEvent(json);
    }
};
