'use strict';

const OverlayPlugin = require('./util/OverlayPlugin');

const LEFT = 0;
const RIGHT = 1;

const CIRC = Math.PI * 2;
const QUART = Math.PI / 2;

/**
 * Instance file upload plugin.
 * Provides file upload support and Open GApps installation control.
 */
module.exports = class FileUpload extends OverlayPlugin {
    static get name() {
        return 'FileUpload';
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
        this.instance.fileUpload = this;

        this.root = this.instance.videoWrapper;
        this.stepper = {};
        this.currentStep = 'homeScreen';
        this.isUploading = false;
        this.hasError = false;
        this.flashing = false;
        this.canvasContext = null;
        this.loaderWorker = null;
        this.opengappsInstalled = false;
        this.capabilityAvailable = false;

        if (window.Worker) {
            this.loaderWorker = this.instance.createFileUploadWorker();

            this.loaderWorker.onmessage = (event) => {
                const msg = event.data;
                switch (msg.code) {
                    case 'SUCCESS':
                        this.onUploadSuccess();
                        break;
                    case 'FAIL':
                        this.onUploadFailure();
                        break;
                    case 'PROGRESS':
                        this.setUploadProgress(msg.value);
                        break;
                    default:
                        break;
                }
            };
        }

        this.root.ondragenter = (event) => {
            event.stopPropagation();
            event.preventDefault();
        };

        this.root.ondragover = (event) => {
            event.stopPropagation();
            event.preventDefault();
        };

        this.root.ondragleave = (event) => {
            event.stopPropagation();
            event.preventDefault();
        };

        this.root.ondrop = (event) => {
            event.stopPropagation();
            event.preventDefault();
            if (!this.isUploading) {
                this.upload(event.dataTransfer.files);
            }
        };

        // create stepper
        this.createStepper();

        // Render components
        this.registerToolbarButton();
        this.renderWidget();

        /*
         * Listen for systempatcher messages: "status <ready/downloading/installing> <opengapps>"
         * or "last_result <success/cancelled/unavailable/network_error/corrupted_archive/install>_error <error message>"
         */
        this.instance.registerEventCallback('systempatcher', (message) => {
            const split = message.split(/ (.+)/);
            if (split[0] === 'status') {
                this.onSystemPatcherStatusEvent(split[1]);
            } else if (split[0] === 'last_result') {
                this.onSystemPatcherLastResultEvent(split[1]);
            }
        });
    }

    /**
     * Add the button to the renderer toolbar.
     */
    registerToolbarButton() {
        this.instance.toolbarManager.registerButton({
            id: this.constructor.name,
            iconClass: 'gm-uploader-button',
            title: this.i18n.UPLOADER_TITLE || 'File upload',
            onClick: this.toggleWidget.bind(this),
        });
    }

    /**
     * Render the widget.
     */
    renderWidget() {
        // Create elements
        const {modal, container} = this.createTemplateModal({
            title: this.i18n.UPLOADER_TITLE || 'File upload',
            classes: 'gm-uploader-plugin',
        });

        // TODO delete this line in the PR which will refacto this plugin, keep for css compatibility
        modal.classList.add('gm-overlay');

        // Generate input rows
        this.inputs = document.createElement('div');
        this.inputs.className = 'gm-uploader-content';

        // Setup
        container.appendChild(this.inputs);
    }

    /**
     * Display or hide the widget.
     */
    toggleWidget() {
        super.toggleWidget();

        if (this.instance.store.getters.isWidgetOpened(this.overlayID)) {
            this.displayStep(this.currentStep);
            // Force refresh upload screen content. Otherwise, installing status may not appear.
            if (this.currentStep === 'uploadScreen') {
                const json = {
                    channel: 'systempatcher',
                    messages: ['notify status'],
                };
                this.instance.sendEvent(json);
            }
        } else {
            // Only reset step to homeScreen if we are in success or error step
            if (this.currentStep === 'successScreen' || this.currentStep === 'errorScreen') {
                this.currentStep = 'homeScreen';
            }
        }
    }

    /**
     * Start uploading file(s) to the instance.
     *
     * @param {DataTransferItemList} files Files to upload.
     */
    upload(files) {
        if (files.length <= 0) {
            return;
        }

        this.createUploadProgressCanvas();
        this.setUploadProgress(0);
        const msg = {type: 'upload', file: files[0]};
        this.loaderWorker.postMessage(msg);
        this.isUploading = true;
        this.hasError = false;
    }

    /**
     * Display a message and fade it out.
     */
    onUploadSuccess() {
        this.isUploading = false;
        this.canvasContext.putImageData(this.canvasImageData, 0, 0);
        this.canvasContext.fillText('✓', 30, 80);
        this.canvasContext.stroke();
        setTimeout(() => {
            this.canvasContext.putImageData(this.canvasImageData, 0, 0);
        }, 750);
    }

    /**
     * Handle upload errors
     */
    onUploadFailure() {
        this.isUploading = false;
        this.hasError = true;
    }

    /**
     * Updade upload progress in the UI.
     *
     * @param {number} percentage Upload progress percentage.
     * @param {string}  color      Color to use.
     */
    setUploadProgress(percentage, color) {
        if (!this.hasError) {
            this.drawProgress(percentage, color);
        }
    }

    /**
     * SystemPatcher status event handler.
     * Event payload can be:
     *  - "downloading <progress> <total>"
     *  - "installing"
     *  - "ready opengapps"
     *
     * @param {string} message Event payload.
     */
    onSystemPatcherStatusEvent(message) {
        const textProgressPercent = document.getElementsByClassName('gm-upload-in-progress-txt-percent')[0];
        const textProgress = document.getElementsByClassName('gm-upload-in-progress-txt-progress')[0];
        const progressPercent = document.getElementsByClassName('gm-upload-in-progress-percent')[0];
        const data = message.split(' ');

        if (data[0] === 'downloading' && data.length >= 3 && textProgressPercent && textProgress && progressPercent) {
            const bytesDone = parseInt(data[1]);
            const totalBytes = parseInt(data[2]);
            if (totalBytes === 0 || Number.isNaN(totalBytes)) {
                return;
            }

            const percent = Math.round((100 * bytesDone) / totalBytes);
            textProgressPercent.innerHTML = percent + '%';
            progressPercent.style.width = percent + '%';

            // Convert in Mb
            const Mb = 1024 * 1024;
            const mbDone = Math.round((10 * bytesDone) / Mb) / 10;
            const totalMb = Math.round((10 * totalBytes) / Mb) / 10;
            const msg = 'Downloading ' + mbDone + ' Mb/' + totalMb + ' Mb';
            textProgress.innerHTML = msg;
        } else if (data[0] === 'installing' && textProgress) {
            textProgress.innerHTML = this.i18n.UPLOADER_INSTALLING || 'Installing...';
        } else if (data[0] === 'ready' && data.length >= 2) {
            if (data[1].indexOf('opengapps') !== -1) {
                this.updateOpenGAppsStatus(true);
            }

            if (!this.flashing) {
                return;
            }

            const json = {
                channel: 'systempatcher',
                messages: ['notify last_result'],
            };
            this.instance.sendEvent(json);
        }
    }

    /**
     * SystemPatcher lastresult event handler.
     *
     * @param {string} message Event payload.
     */
    onSystemPatcherLastResultEvent(message) {
        switch (message) {
            case 'success':
                this.displayStep('successScreen');
                // On flashing success, force display success screen
                if (this.flashing && !this.instance.store.getters.isWidgetOpened(this.overlayID)) {
                    this.toggleWidget();
                }
                this.flashing = false;
                this.instance.store.dispatch({
                    type: 'ADD_TRACKED_EVENT',
                    payload: {
                        category: 'opengapps',
                        action: 'installed',
                    },
                });
                break;
            case 'unavailable':
            case 'network_error':
            case 'corrupted_archive':
            case 'install_error':
                this.displayStep('errorScreen');
                // On flashing error, force display errorscreen
                if (this.flashing && !this.instance.store.getters.isWidgetOpened(this.overlayID)) {
                    this.toggleWidget();
                }
                this.flashing = false;
                break;
            default:
                break;
        }
    }

    /**
     * Create a canvas to provide an area to display upload progress.
     */
    createUploadProgressCanvas() {
        if (this.canvasContext) {
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.classList.add('gm-upload-progress');
        canvas.width = 120;
        canvas.height = 120;
        this.instance.wrapper.insertBefore(canvas, this.instance.wrapper.firstChild);
        this.canvasContext = canvas.getContext('2d');
        this.canvasImageData = null;

        this.canvasContext.beginPath();
        this.canvasContext.strokeStyle = '#E6195E';
        this.canvasContext.fillStyle = '#E6195E';
        this.canvasContext.lineCap = 'square';
        this.canvasContext.font = 'bold 60px Arial';
        this.canvasContext.lineWidth = 10.0;
        this.canvasContext.closePath();
        this.canvasContext.fill();

        this.canvasImageData = this.canvasContext.getImageData(0, 0, 120, 120);
    }

    /**
     * Draw upload progress (0 = nothing displayed; 1 = full circle).
     *
     * @param {number} percentage Upload progress percentage.
     * @param {string}  color      Color to use.
     */
    drawProgress(percentage, color) {
        color = typeof color !== 'undefined' ? color : '#E6195E';
        this.canvasContext.strokeStyle = color;
        this.canvasContext.fillStyle = color;
        this.canvasContext.putImageData(this.canvasImageData, 0, 0);
        this.canvasContext.beginPath();
        this.canvasContext.arc(60, 60, 55, -QUART, CIRC * percentage - QUART, false);
        percentage = Math.round(percentage * 100);
        const text = percentage !== 100 ? percentage : '99'; // do not display 100 (3 digit)
        this.canvasContext.fillText(text, 25, 80);
        this.canvasContext.stroke();
    }

    /**
     * Create the all file upload screens.
     */
    createStepper() {
        this.stepper.homeScreen = this.createHomeScreen.bind(this);
        this.stepper.disclaimerScreen = this.createDisclaimerScreen.bind(this);
        this.stepper.uploadScreen = this.createUploadScreen.bind(this);
        this.stepper.successScreen = this.createSuccessStep.bind(this);
        this.stepper.errorScreen = this.createErrorStep.bind(this);
    }

    /**
     * Display a specific file upload screen.
     *
     * @param {string} step Screen name.
     */
    displayStep(step) {
        this.currentStep = step;
        // Reset main content
        this.inputs.innerHTML = '';

        // Set current step
        const template = this.stepper[step]();
        this.setTitle(template.title);
        this.inputs.appendChild(template.body);
    }

    /**
     * Enable or disable the file upload capability.
     *
     * @param {boolean} available Upload availability.
     */
    setAvailability(available) {
        this.capabilityAvailable = available;
    }

    /**
     * Create and return the "home" file upload screen.
     *
     * @return {Object} HTMLElement & title for this screen.
     */
    createHomeScreen() {
        // Main div on the home page of the Open GApps widget
        const homeContent = document.createElement('div');
        const headerHomeContent = document.createElement('div');
        headerHomeContent.className = 'gm-upload-main';

        // Define image on home view of Open GApps popup
        headerHomeContent.appendChild(this.createIconDiv('gm-upload-main-img'));

        // Define small text zone on home view
        headerHomeContent.appendChild(
            this.createTextDiv(
                'gm-upload-main-txt',
                '<p>You can install Open GApps, or upload a file: APK files will be installed, ' +
                    'flashable archives will be flashed, and other files types will be pushed ' +
                    'to the /sdcard/download folder on the device.</p>',
            ),
        );

        // Slit in header and bottom part
        homeContent.appendChild(headerHomeContent);

        this.uploader = document.createElement('input');
        this.uploader.className = 'gm-uploader-file';
        this.uploader.type = 'file';
        this.uploader.setAttribute('gm-hidden', '');
        homeContent.appendChild(this.uploader);

        this.uploader.onchange = () => {
            if (!this.isUploading) {
                this.toggleWidget();
                this.upload(this.uploader.files);
            }
        };

        // Define 2 buttons at widget bottom
        const bottomButtonsContainer = document.createElement('div');
        bottomButtonsContainer.className = 'gm-upload-main-bottom-buttons';

        const buttons = this.createButtonsGroup(
            'Install Open GApps',
            (event) => {
                event.preventDefault();

                if (this.opengappsInstalled === false && this.capabilityAvailable) {
                    this.displayStep('disclaimerScreen');
                }
            },
            'Browse',
            (event) => {
                event.preventDefault();
                this.uploader.click();
            },
        );

        this.installButton = buttons[LEFT];
        this.updateOpenGAppsStatus(this.opengappsInstalled);

        bottomButtonsContainer.appendChild(buttons[LEFT]);
        bottomButtonsContainer.appendChild(buttons[RIGHT]);

        // Add buttons and all home content view for this widget in the DOM
        homeContent.appendChild(bottomButtonsContainer);

        return {
            body: homeContent,
            title: this.i18n.UPLOADER_HOME_TITLE || 'Upload file to the virtual device',
        };
    }

    /**
     * Update the "home" file upload screen.
     *
     * @param {boolean} installed Whether or not OpenGApps are installed on the instance.
     */
    updateOpenGAppsStatus(installed) {
        this.opengappsInstalled = installed;

        if (!this.installButton) {
            return;
        }

        if (!this.capabilityAvailable) {
            this.installButton.className =
                'gm-upload-main-bottom-buttons-left gm-dont-close gm-uploader-install-opengapps ' +
                'gm-upload-main-bottom-buttons-disabled';
            this.installButton.innerHTML = 'Install Open GApps';
            this.installButton.title = 'Open GApps are not available for this virtual device';
            return;
        }

        if (installed) {
            this.installButton.className =
                'gm-upload-main-bottom-buttons-left gm-dont-close gm-uploader-install-opengapps ' +
                'gm-upload-main-bottom-buttons-disabled';
            this.installButton.innerHTML = 'Open GApps installed';
            this.installButton.title = 'Open GApps are already installed';
        } else {
            this.installButton.className =
                'gm-upload-main-bottom-buttons-left gm-dont-close gm-uploader-install-opengapps';

            this.installButton.innerHTML = 'Install Open GApps';
            this.installButton.title = 'Install Open GApps';
        }
    }

    /**
     * Create and return the "disclaimer" file upload screen.
     *
     * @return {Object} HTMLElement & title for this screen.
     */
    createDisclaimerScreen() {
        // Main div on the home page of the Opengapps widget
        const homeContent = document.createElement('div');
        const headerHomeContent = document.createElement('div');
        headerHomeContent.className = 'gm-upload-disclaimer';

        // Define small text zone on home view
        headerHomeContent.appendChild(
            this.createTextDiv(
                'gm-upload-disclaimer-txt',
                '<p>PLEASE NOTE<br/>\
        GENYMOBILE INC., ASSUMES NO LIABILITY WHATSOEVER RESULTING FROM THE DOWNLOAD,\
        INSTALL AND USE OF GOOGLE PLAY SERVICES WITHIN YOUR VIRTUAL DEVICES. YOU ARE\
        SOLELY RESPONSIBLE FOR THE USE AND ASSUME ALL LIABILITY RELATED THERETO.\
        MOREOVER\
        <br/><br/>\
        GENYMOBILE INC. DISCLAIMS ANY WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,\
        INCLUDING, WITHOUT LIMITATION, IMPLIED WARRANTIES OF MERCHANTABILITY, OR FITNESS\
        FOR A PARTICULAR PURPOSE REGARDING THE COMPATIBILITY OF THE OPENGAPPS PACKAGES\
        WITH ANY VERSION OF GENYMOTION. IN NO EVENT SHALL GENYMOBILE INC. OR ITS AFFILIATES,\
        OR THEIR RESPECTIVE OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE WITH RESPECT\
        TO YOUR DOWNLOAD OR USE OF THE GOOGLE PLAY SERVICES AND YOU RELEASE GENYMOBILE INC.\
        FROM ANY LIABILITY RELATED THERETO. YOU AGREE TO DEFEND, INDEMNIFY AND HOLD HARMLESS\
        GENYMOBILE INC. FOR ANY CLAIMS OR COSTS RELATED TO YOUR USE OR DOWNLOAD OF THE GOOGLE\
        PLAY SERVICES.\
            </p>',
            ),
        );

        // Slit in header and bottom part
        homeContent.appendChild(headerHomeContent);

        // Define 2 buttons at widget bottom
        const bottomButtonsContainer = document.createElement('div');
        bottomButtonsContainer.className = 'gm-upload-main-bottom-buttons';

        const buttons = this.createButtonsGroup(
            'Back',
            (event) => {
                event.preventDefault();
                this.flashing = false;
                this.displayStep('homeScreen');
            },
            'Install',
            (event) => {
                event.preventDefault();
                this.flashing = true;
                const json = {
                    channel: 'systempatcher',
                    messages: ['install opengapps'],
                };
                this.instance.sendEvent(json);
                this.displayStep('uploadScreen');
            },
        );

        bottomButtonsContainer.appendChild(buttons[LEFT]);
        bottomButtonsContainer.appendChild(buttons[RIGHT]);

        // Add buttons and all home content view for this widget in the DOM
        homeContent.appendChild(bottomButtonsContainer);

        return {
            body: homeContent,
            title: this.i18n.UPLOADER_DISCLAIMER || 'You are about to install Open GApps on your virtual device',
        };
    }

    /**
     * Create and return the "progress" file upload screen.
     *
     * @return {Object} HTMLElement & title for this screen.
     */
    createUploadScreen() {
        // Main div on the upload page of the Opengapps widget
        const uploadContent = document.createElement('div');
        const headerUploadContent = document.createElement('div');
        headerUploadContent.className = 'gm-upload-in-progress';

        // Define small text zone on upload view
        const txtProgress = this.createTextDiv('gm-upload-in-progress-txt-progress', '');
        const txtPercent = this.createTextDiv('gm-upload-in-progress-txt-percent', '');
        const bgPercentBar = this.createTextDiv('gm-upload-in-progress-bg-percent', '');
        const percentbar = this.createTextDiv('gm-upload-in-progress-percent', '');

        percentbar.style.width = '0%';
        bgPercentBar.appendChild(percentbar);

        headerUploadContent.appendChild(txtProgress);
        headerUploadContent.appendChild(txtPercent);
        headerUploadContent.appendChild(bgPercentBar);

        // Slit in header and bottom part
        uploadContent.appendChild(headerUploadContent);

        // Define 2 buttons at widget bottom
        const bottomButtonsContainer = document.createElement('div');
        bottomButtonsContainer.className = 'gm-upload-main-bottom-buttons';

        const buttons = this.createButtonsGroup(null, null, 'Cancel', (event) => {
            event.preventDefault();
            const json = {
                channel: 'systempatcher',
                messages: ['cancel'],
            };
            this.instance.sendEvent(json);
            this.displayStep('disclaimerScreen');
        });

        bottomButtonsContainer.appendChild(buttons[RIGHT]);

        // Add buttons and all upload content view for this widget in the DOM
        uploadContent.appendChild(bottomButtonsContainer);

        return {
            body: uploadContent,
            title: this.i18n.UPLOADER_INPROGRESS || 'Downloading',
        };
    }

    /**
     * Create and return the "success" file upload screen.
     *
     * @return {Object} HTMLElement & title for this screen.
     */
    createSuccessStep() {
        // Main div on the home page of the Open GApps widget
        const homeContent = document.createElement('div');
        const headerHomeContent = document.createElement('div');
        headerHomeContent.className = 'gm-upload-success';

        // Define image on home view of Open GApps popup
        headerHomeContent.appendChild(this.createIconDiv('gm-upload-success-img'));

        // Small text below the image
        headerHomeContent.appendChild(this.createTextDiv('gm-upload-success-caption', 'Congratulation!'));

        // Define small text zone on home view
        headerHomeContent.appendChild(
            this.createTextDiv(
                'gm-upload-success-txt',
                '<p>Open GApps have been successfully \
            installed on the virtual device.<br/>Please restart the virtual device to complete the installation.<br/>\
            You will be redirected to the Open GApps website.</p>',
            ),
        );

        // Reboot button
        headerHomeContent.appendChild(
            this.createButton('gm-upload-success-button', 'Reboot device', (event) => {
                event.preventDefault();
                const json = {
                    channel: 'systempatcher',
                    messages: ['reboot'],
                };
                this.instance.sendEvent(json);
                this.toggleWidget();
            }),
        );

        // Slit in header and bottom part
        homeContent.appendChild(headerHomeContent);

        return {
            body: homeContent,
            title: this.i18n.UPLOADER_SUCCESS || 'Open GApps successfully installed',
        };
    }

    /**
     * Create and return the "error" file upload screen.
     *
     * @return {Object} HTMLElement & title for this screen.
     */
    createErrorStep() {
        // Main div on the home page of the Open GApps widget
        const homeContent = document.createElement('div');
        const headerHomeContent = document.createElement('div');
        headerHomeContent.className = 'gm-upload-error';

        // Define image on home view of Open GApps popup
        headerHomeContent.appendChild(this.createIconDiv('gm-upload-error-img'));

        // Small text below the image
        headerHomeContent.appendChild(this.createTextDiv('gm-upload-error-caption', 'Failed to install Open GApps'));

        // Slit in header and bottom part
        homeContent.appendChild(headerHomeContent);

        return {
            body: homeContent,
            title: this.i18n.UPLOADER_FAILURE || "We've got a problem…",
        };
    }

    /**
     * Create and return a buttons group.
     *
     * @param  {string}      leftText      Left button text.
     * @param  {Function}    leftCallback  Left button click callback.
     * @param  {string}      rightText     Right button text.
     * @param  {Function}    rightCallback Right button click callback.
     * @return {HTMLElement}               The buttons group.
     */
    createButtonsGroup(leftText, leftCallback, rightText, rightCallback) {
        const buttons = [null, null];

        if (leftText) {
            buttons[LEFT] = this.createButton(
                'gm-upload-main-bottom-buttons-left gm-dont-close',
                leftText,
                leftCallback,
            );
        }

        if (rightText) {
            buttons[RIGHT] = this.createButton(
                'gm-upload-main-bottom-buttons-right gm-dont-close',
                rightText,
                rightCallback,
            );
        }

        return buttons;
    }

    /**
     * Create and return a button.
     *
     * @param  {string}      className CSS class to apply to the element.
     * @param  {string}      text      Button text content.
     * @param  {Function}    onClick   Click callback function.
     * @return {HTMLElement}           The created button.
     */
    createButton(className, text, onClick) {
        const button = document.createElement('div');
        button.className = className;
        button.innerHTML = text;
        button.onclick = onClick;
        return button;
    }

    /**
     * Create and return an icon element.
     *
     * @param  {string}      className CSS class to apply to the element.
     * @return {HTMLElement}           The created icon.
     */
    createIconDiv(className) {
        const icon = document.createElement('span');
        icon.className = 'gm-upload-icon ' + className;
        return icon;
    }

    /**
     * Create and return a text element.
     *
     * @param  {string}      className CSS class to apply to the element.
     * @param  {string}      text      Block text content.
     * @return {HTMLElement}           The created text.
     */
    createTextDiv(className, text) {
        const textCloud = document.createElement('div');
        textCloud.className = className;
        textCloud.innerHTML = text;
        return textCloud;
    }
};
