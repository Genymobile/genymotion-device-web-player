'use strict';

const OverlayPlugin = require('./util/OverlayPlugin');
const log = require('loglevel');
const {progressBar} = require('./util/components');
const fileUploader = require('./util/fileUploader');
log.setDefaultLevel('debug');

// Views definitions
class InstallingGAPPSView {
    constructor(plugin) {
        this.plugin = plugin;
        this.i18n = plugin.i18n;
        this.progressBar = null;
        this.progressPercentage = null;
        this.progressText = null;
    }

    render() {
        const container = document.createElement('div');
        container.className = 'installing-gapps-view-container';

        // Intro Section (similar to other views)
        const introSection = document.createElement('div');
        introSection.className = 'gm-section';
        const text = document.createElement('div');
        text.className = 'gm-gapps-text'; // Assuming a similar class for text style
        text.innerHTML =
            this.i18n.GAPPS_INSTALL_INTRO_TEXT || 'You are about to install Open GApps on your virtual device.'; // Use appropriate i18n key or default
        introSection.appendChild(text);

        const separator1 = document.createElement('div');
        separator1.className = 'gm-separator';

        // Installation Progress Section
        const progressSection = document.createElement('div');
        progressSection.className = 'gm-section gm-progress-section'; // Add a class for styling

        const androidIcon = document.createElement('i');
        androidIcon.className = 'gm-droid-icon'; // Assuming an Android icon class

        this.progressText = document.createElement('div');
        this.progressText.className = 'gm-progress-text gm-dots-jump-loader';
        this.progressText.innerHTML = this.i18n.DOWLOADING_TEXT || 'Downloading';

        this.progressPercentage = document.createElement('div');
        this.progressPercentage.className = 'gm-progress-percentage';
        this.progressPercentage.innerHTML = '0%';

        const progressTextContainer = document.createElement('div');
        progressTextContainer.className = 'gm-progress-text-container';
        progressTextContainer.appendChild(this.progressText);
        progressTextContainer.appendChild(this.progressPercentage);

        this.progressBar = progressBar.createProgressBar({
            value: 0,
            max: 100,
        });

        progressSection.appendChild(androidIcon);
        progressSection.appendChild(progressTextContainer);
        progressSection.appendChild(this.progressBar.element);

        const separator2 = document.createElement('div');
        separator2.className = 'gm-separator';

        // Actions Section (Buttons)
        const actionsSection = document.createElement('div');
        actionsSection.className = 'gm-section gm-actions gm-progress-actions'; // Add a class for styling

        const cancelBtn = document.createElement('button');
        cancelBtn.innerText = this.i18n.CANCEL_BUTTON_TEXT || 'CANCEL';
        cancelBtn.className = 'gm-btn gm-dont-close';
        cancelBtn.onclick = () => {
            this.plugin.instance.sendEvent({
                channel: 'systempatcher',
                messages: ['cancel'],
            });
            this.plugin.setView('InitialView');
        };

        actionsSection.appendChild(cancelBtn);

        // Append all sections to the main container
        container.appendChild(introSection);
        container.appendChild(separator1);
        container.appendChild(progressSection);
        container.appendChild(separator2);
        container.appendChild(actionsSection);

        // send command to launch install
        const json = {
            channel: 'systempatcher',
            messages: ['install opengapps'],
        };
        this.plugin.instance.sendEvent(json);

        return container;
    }

    updateProgress(percentage, text) {
        this.progressPercentage.innerHTML = `${percentage}%`;
        this.progressText.innerHTML = text;
        this.progressBar.setValue(percentage);
    }
}

class InstallationSuccessView {
    constructor(plugin) {
        this.plugin = plugin;
        this.i18n = plugin.i18n;

        this.plugin.instance.store.dispatch({
            type: 'ADD_TRACKED_EVENT',
            payload: {
                category: 'opengapps',
                action: 'installed',
            },
        });
    }

    render() {
        const container = document.createElement('div');
        container.className = 'installation-success-view-container';

        const separator1 = document.createElement('div');
        separator1.className = 'gm-separator';

        // Success Message Section
        const successSection = document.createElement('div');
        successSection.className = 'gm-section gm-success-message-section';

        const successIcon = document.createElement('i');
        successIcon.className = 'gm-check-icon';

        const successText = document.createElement('div');
        successText.className = 'gm-success-text';
        successText.innerHTML = this.i18n.INSTALL_SUCCESS_TITLE || 'OPEN GAPPS SUCCESSFULLY INSTALLED';

        const successDescription = document.createElement('div');
        successDescription.className = 'gm-success-description';
        /* eslint-disable max-len */
        successDescription.innerHTML =
            this.i18n.INSTALL_SUCCESS_DESCRIPTION ||
            'Congratulation!<br/>Open GApps have been successfully installed on the virtual device.<br/>Please restart the virtual device to complete the installation.'; // Use appropriate i18n key or default, using <br/> for line breaks
        /* eslint-enable max-len */

        successSection.appendChild(successIcon);
        successSection.appendChild(successText);
        successSection.appendChild(successDescription);

        const separator2 = document.createElement('div');
        separator2.className = 'gm-separator';

        // Actions Section (Buttons)
        const actionsSection = document.createElement('div');
        actionsSection.className = 'gm-section gm-actions gm-success-actions'; // Add a class for styling

        const closeBtn = document.createElement('button');
        closeBtn.innerText = this.i18n.CLOSE_BUTTON_TEXT || 'CLOSE';
        closeBtn.className = 'gm-btn';
        closeBtn.onclick = () => {
            this.plugin.closeWidget();
            this.plugin.setView('InitialView');
        };

        const restartBtn = document.createElement('button');
        restartBtn.innerText = this.i18n.RESTART_BUTTON_TEXT || 'RESTART DEVICE';
        restartBtn.className = 'gm-btn gm-gradient-button';
        restartBtn.onclick = () => {
            const json = {
                channel: 'systempatcher',
                messages: ['reboot'],
            };
            this.plugin.instance.sendEvent(json);
            this.plugin.closeWidget();
            this.plugin.setView('InitialView');
        };

        actionsSection.appendChild(closeBtn);
        actionsSection.appendChild(restartBtn);

        container.appendChild(successSection);
        container.appendChild(separator2);
        container.appendChild(actionsSection);

        return container;
    }
}

class InstallationFailedView {
    constructor(plugin) {
        this.plugin = plugin;
        this.i18n = plugin.i18n;

        this.plugin.instance.store.dispatch({
            type: 'ADD_TRACKED_EVENT',
            payload: {
                category: 'opengapps',
                action: 'install_failed',
            },
        });
    }

    render() {
        const container = document.createElement('div');
        container.className = 'installation-failed-view-container';

        const separator1 = document.createElement('div');
        separator1.className = 'gm-separator';

        // Failed Message Section
        const failedSection = document.createElement('div');
        failedSection.className = 'gm-section gm-failed-message-section';

        const failedIcon = document.createElement('i');
        failedIcon.className = 'gm-failed-icon';

        const failedText = document.createElement('div');
        failedText.className = 'gm-failed-text';
        failedText.innerHTML = this.i18n.INSTALL_FAILED_TITLE || 'FAILED TO INSTALL GAPPS';

        const failedDescription = document.createElement('div');
        failedDescription.className = 'gm-failed-description';
        failedDescription.innerHTML =
            this.i18n.INSTALL_FAILED_DESCRIPTION ||
            `An error occured while installing Open GApps.<br/>Please try again. 
            If the issue persists, contact support.`;

        failedSection.appendChild(failedIcon);
        failedSection.appendChild(failedText);
        failedSection.appendChild(failedDescription);

        const separator2 = document.createElement('div');
        separator2.className = 'gm-separator';

        // Actions Section (Buttons)
        const actionsSection = document.createElement('div');
        actionsSection.className = 'gm-section gm-actions gm-failed-actions';

        const closeBtn = document.createElement('button');
        closeBtn.innerText = this.i18n.CLOSE_BUTTON_TEXT || 'CLOSE';
        closeBtn.className = 'gm-btn';
        closeBtn.onclick = () => {
            this.plugin.closeWidget();
            this.plugin.setView('InitialView');
        };

        actionsSection.appendChild(closeBtn);

        container.appendChild(failedSection);
        container.appendChild(separator2);
        container.appendChild(actionsSection);

        return container;
    }
}

class DisclaimerView {
    constructor(plugin) {
        this.plugin = plugin;
        this.i18n = plugin.i18n;
    }

    render() {
        const container = document.createElement('div');
        container.className = 'disclaimer-view-container'; // Add a class for styling

        // Intro Section (similar to InitialView)
        const introSection = document.createElement('div');
        introSection.className = 'gm-section';
        const text = document.createElement('div');
        text.className = 'gm-gapps-text'; // Assuming a similar class for text style
        text.innerHTML =
            this.i18n.GAPPS_INSTALL_INTRO_TEXT || 'You are about to install Open GApps on your virtual device.'; // Use appropriate i18n key or default
        introSection.appendChild(text);

        const separator1 = document.createElement('div');
        separator1.className = 'gm-separator';

        // Disclaimer Text Section
        const disclaimerSection = document.createElement('div');
        disclaimerSection.className = 'gm-section gm-disclaimer-text'; // Add a class for styling
        const disclaimerHeader = document.createElement('div');
        disclaimerHeader.className = 'gm-disclaimer-header'; // Add a class for header style
        const disclaimerIcon = document.createElement('i');
        disclaimerIcon.className = 'gm-warning-icon'; // Assuming a warning icon class
        const disclaimerHeaderText = document.createElement('div');
        disclaimerHeaderText.innerHTML = this.i18n.DISCLAIMER_HEADER || 'DISCLAIMER'; // Use appropriate i18n key or default
        disclaimerHeader.appendChild(disclaimerIcon);
        disclaimerHeader.appendChild(disclaimerHeaderText);

        const disclaimerContent = document.createElement('div');
        disclaimerContent.className = 'gm-disclaimer-content'; // Add a class for content style
        disclaimerContent.innerHTML =
            this.i18n.DISCLAIMER_TEXT ||
            /* eslint-disable max-len */
            `GENYMOBILE SAS assumes no liability whatsoever resulting from the download, install and use of Google Play Services within your virtual devices. You are solely responsible for the use and assume all liability related thereto.<br/><br/><br/>
Moreover, GENYMOBILE SAS disclaims any warranties of any kind, either express or implied, including, without limitation, implied warranties of merchantability, or fitness for a particular purpose regarding the compatibility of the Open GApps packages with any version of Genymotion.<br/><br/><br/>
In no event shall GENYMOBILE SAS or its affiliates, or their respective officers, directors, employees, or agents be liable with respect to your download or use of the Google Play Services and you release GENYMOBILE SAS from any liability related thereto.
You agree to defend, indemnify and hold harmless GENYMOBILE SAS for any claims or costs related to your use or download of the Google Play Services.`;
        /* eslint-enable max-len */

        disclaimerSection.appendChild(disclaimerHeader);
        disclaimerSection.appendChild(disclaimerContent);

        const separator2 = document.createElement('div');
        separator2.className = 'gm-separator';

        // Actions Section (Buttons)
        const actionsSection = document.createElement('div');
        actionsSection.className = 'gm-section gm-actions gm-disclaimer-actions';

        const backBtn = document.createElement('button');
        backBtn.innerText = this.i18n.BACK_BUTTON_TEXT || 'BACK';
        backBtn.className = 'gm-btn gm-dont-close';
        backBtn.onclick = () => {
            this.plugin.setView('InitialView');
        };

        const installBtn = document.createElement('button');
        installBtn.innerText = this.i18n.INSTALL_GAPPS_BUTTON_TEXT || 'INSTALL GAPPS';
        installBtn.className = 'gm-btn gm-dont-close gm-gradient-button';
        installBtn.onclick = () => {
            this.plugin.setView('InstallingGAPPSView');
        };

        // Add buttons to actions section
        actionsSection.appendChild(backBtn);
        actionsSection.appendChild(installBtn);

        // Append all sections to the main container
        container.appendChild(introSection);
        container.appendChild(separator1);
        container.appendChild(disclaimerSection);
        container.appendChild(separator2);
        container.appendChild(actionsSection);

        return container;
    }
}

class InitialView {
    constructor(plugin) {
        this.plugin = plugin;
        this.instance = plugin.instance;
        this.i18n = plugin.i18n;
        this.fileUploadWorker = null;

        try {
            this.fileUploadWorker = this.plugin.instance.createFileUploadWorker();
            this.fileUploadWorker.onmessage = (event) => {
                const msg = event.data;
                switch (msg.code) {
                    case 'SUCCESS':
                        this.fileUploaderComponent.showUploadSuccess();
                        // setIndicator in toolbar id widget is closed
                        if (!this.plugin.instance.store.getters.isWidgetOpened(this.plugin.overlayID)){
                            this.plugin.toolbarBtn.setIndicator('success');
                        }
                        break;
                    case 'FAIL':
                        this.fileUploaderComponent.uploadingStop();
                        this.fileUploaderComponent.showUploadError(
                            this.i18n.FILE_SEND_APK_FAILED ||
                            `Something went wrong while processing the APK file. 
                                Please make sure the file is valid and try again.`,
                        );
                        // setIndicator in toolbar id widget is closed
                        if (!this.plugin.instance.store.getters.isWidgetOpened(this.plugin.overlayID)){
                            this.plugin.toolbarBtn.setIndicator('failed');
                        }
                        break;
                    case 'PROGRESS':
                        this.fileUploaderComponent.updateProgress(msg.value * 100, msg.uploadedSize, msg.fileSize);
                        break;
                    default:
                        break;
                }
            };
        } catch (error) {
            log.error(error);
            this.plugin.instance.store.dispatch({type: 'DRAG_AND_DROP_UPLOAD_FILE_ENABLED', payload: false});
        }
    }

    render() {
        const container = document.createElement('div');
        container.className = 'initial-view-container';

        // Intro Section
        const introSection = document.createElement('div');
        introSection.className = 'gm-section';
        const text = document.createElement('div');
        text.className = 'gm-gapps-text';
        text.innerHTML =
            this.i18n.GAPPS_TEXT ||
            'You can install <b>Open GApps</b> to access <b>Google Play Store</b> ' +
            'services, or <b>APK files</b> on your virtual device.';
        introSection.appendChild(text);

        const separator1 = document.createElement('div');
        separator1.className = 'gm-separator';

        // Open GApps Section
        const gappsSection = document.createElement('div');
        gappsSection.className = 'gm-section gm-actions gm-gapps-status';

        const gappsInfoDiv = document.createElement('div');
        gappsInfoDiv.className = 'gm-info-flex';

        const gappsIcon = document.createElement('i');
        gappsIcon.className = 'gm-gapps-icon';

        const gappsText = document.createElement('div');
        gappsText.innerHTML = this.i18n.OPEN_GAPPS_TEXT || 'Open GApps';

        gappsInfoDiv.appendChild(gappsIcon);
        gappsInfoDiv.appendChild(gappsText);

        this.installBtn = document.createElement('button');
        this.installBtn.innerHTML = this.i18n.GAPPS_INSTALL || 'INSTALL GAPPS';
        this.installBtn.className = 'gm-btn gm-gradient-button gm-dont-close';
        this.installBtn.onclick = () => {
            this.plugin.setView('DisclaimerView');
        };

        this.installedDiv = document.createElement('div');
        this.installedDiv.className = 'gm-gapps-installed-status hidden';

        const installedText = document.createElement('span');
        installedText.textContent = this.i18n.GAPPS_INSTALLED || 'Installed';

        const checkIcon = document.createElement('i');
        checkIcon.className = 'gm-check-icon';

        this.installedDiv.appendChild(installedText);
        this.installedDiv.appendChild(checkIcon);

        if (this.plugin.GAPPSInstalled) {
            this.setGAPPSInstalled();
        }

        gappsSection.appendChild(gappsInfoDiv);
        gappsSection.appendChild(this.installBtn);
        gappsSection.appendChild(this.installedDiv);

        const separator2 = document.createElement('div');
        separator2.className = 'gm-separator';

        // Install APK Files Section
        const apkSection = document.createElement('div');
        apkSection.className = 'gm-section';

        const apkHeader = document.createElement('div');
        apkHeader.className = 'gm-apk-title';

        const apkHeaderIcon = document.createElement('i');
        apkHeaderIcon.className = 'gm-downloadFile-icon';

        const apkHeaderText = document.createElement('div');
        apkHeaderText.innerHTML = this.i18n.APK_HEADER_TEXT || 'Install APK files';

        apkHeader.appendChild(apkHeaderIcon);
        apkHeader.appendChild(apkHeaderText);

        apkSection.appendChild(apkHeader);

        // Create file uploader component
        this.fileUploaderComponent = fileUploader.createFileUploader({
            onFileSelect: (file) => {
                this.handleFileUpload(file);
                this.instance.root.classList.add('gm-uploading-in-progess');
            },
            onUploadCancelled:() => {
                this.fileUploadWorker.postMessage({type: 'cancel'});
            },
            onUploadComplete: () => {
                this.plugin.instance.store.dispatch({type: 'DRAG_AND_DROP_UPLOAD_FILE_ENABLED', payload: true});
                this.plugin.toolbarBtn.setIndicator('');
                this.instance.root.classList.remove('gm-uploading-in-progess');
            },
            dragDropText: this.i18n.DRAG_DROP_TEXT || 'DRAG & DROP APK FILE TO INSTALL',
            browseButtonText: this.i18n.BROWSE_BUTTON_TEXT || 'BROWSE',
            accept: '.apk',
            maxFileSize: 900,
            classes: 'gm-apk-uploader',
            i18n: this.plugin.i18n,
        });

        apkSection.appendChild(this.fileUploaderComponent.element);

        container.appendChild(introSection);
        container.appendChild(separator1);
        container.appendChild(gappsSection);
        container.appendChild(separator2);
        container.appendChild(apkSection);

        return container;
    }

    setGAPPSInstalled() {
        this.installBtn.classList.add('hidden');
        this.installedDiv.classList.remove('hidden');
    }

    handleFileUpload(file) {
        this.plugin.toolbarBtn.setIndicator('notification');
        this.plugin.instance.store.dispatch({type: 'DRAG_AND_DROP_UPLOAD_FILE_ENABLED', payload: false});

        const msg = {type: 'upload', file};
        this.fileUploadWorker.postMessage(msg);
    }
}

// Plugin main class
module.exports = class GAPPSInstall extends OverlayPlugin {
    static get name() {
        return 'GAPPSInstall';
    }

    constructor(instance, i18n) {
        super(instance);
        this.instance = instance;
        this.i18n = i18n || {};
        this.instance.gappsInstall = this;
        this.instanciatedViews = new Map(); // Store rendered elements by view type
        this.currentViewType = null;
        this.GAPPSInstalled = false;

        this.registerToolbarButton();
        this.renderWidget();

        /*
         * Listen for systempatcher messages: "status <ready/downloading bytesDone totalBytes/installing> <opengapps>"
         * or "last_result <success/cancelled/unavailable/network_error/corrupted_archive/install>_error <error message>"
         */
        this.instance.registerEventCallback('systempatcher', (message) => {
            this.toolbarBtn.setIndicator('');
            const installingGAPPSView = this.instanciatedViews.get('InstallingGAPPSView');
            const split = message.split(/ (.+)/);
            if (split[0] === 'status') {
                const msg = split[1].split(' ');
                if (msg[0] === 'downloading' && msg.length >= 3) {
                    this.toolbarBtn.setIndicator('notification');
                    const bytesDone = parseInt(msg[1]);
                    const totalBytes = parseInt(msg[2]);
                    if (totalBytes === 0 || Number.isNaN(totalBytes)) {
                        return;
                    }

                    const percent = Math.round((100 * bytesDone) / totalBytes);

                    if (installingGAPPSView) {
                        installingGAPPSView.updateProgress(percent, this.i18n.UPLOADER_DOWNLOADING || 'Downloading');
                    }
                } else if (msg[0] === 'installing') {
                    this.toolbarBtn.setIndicator('notification');
                    if (installingGAPPSView) {
                        installingGAPPSView.updateProgress(100, this.i18n.UPLOADER_INSTALLING || 'Installing');
                    }
                } else if (msg[0] === 'ready' && msg.length >= 2) {
                    if (msg[1].includes('opengapps')) {
                        this.toolbarBtn.setIndicator('');
                        this.GAPPSInstalled = true;
                        this.instanciatedViews.get('InitialView').setGAPPSInstalled();
                    }

                    if (installingGAPPSView) {
                        installingGAPPSView.updateProgress(100, this.i18n.UPLOADER_INSTALLED || 'Installed');
                    }
                    const json = {
                        channel: 'systempatcher',
                        messages: ['notify last_result'],
                    };
                    this.instance.sendEvent(json);
                }
            } else if (split[0] === 'last_result') {
                this.toolbarBtn.setIndicator('');
                if (this.currentViewType === 'InstallingGAPPSView') {
                    switch (split[1]) {
                        case 'success':
                            this.setView('InstallationSuccessView');
                            break;
                        case 'unavailable':
                        case 'network_error':
                        case 'corrupted_archive':
                        case 'install_error':
                            this.setView('InstallationFailedView');
                            break;
                        default:
                            break;
                    }
                }
            }
        });

        const initialViewObject = this.instanciatedViews.get('InitialView');
        if (this.instance.store.state.isDragAndDropForUploadFileEnabled) {
            initialViewObject.fileUploaderComponent.setEnabled(true);
        } else {
            initialViewObject.fileUploaderComponent.setEnabled(false);
        }

        this.instance.store.subscribe(
            ({isDragAndDropForUploadFileEnabled}) => {
                if (isDragAndDropForUploadFileEnabled) {
                    initialViewObject.fileUploaderComponent.setEnabled(true);
                } else {
                    initialViewObject.fileUploaderComponent.setEnabled(false);
                }
            },
            ['isDragAndDropForUploadFileEnabled'],
        );
    }

    registerToolbarButton() {
        this.toolbarBtn = this.instance.toolbarManager.registerButton({
            id: this.constructor.name,
            iconClass: 'gm-gapps-button',
            title: this.i18n.GAPPS_TITLE || 'Install APPS',
            onClick: () => {
                if (!this.instance.store.getters.isWidgetOpened(this.overlayID) &&
                ['success', 'failed'].includes(this.toolbarBtn.getIndicator())){
                    this.toolbarBtn.setIndicator('');
                };
                this.toggleWidget();
            }
        });
    }

    renderWidget() {
        const {container} = this.createTemplateModal({
            title: this.i18n.GAPPS_TITLE || 'Install APPS',
            classes: 'gm-gapps-plugin',
            width: 486,
            height: 726,
        });

        this.container = container;
        this.viewsContainer = document.createElement('div');
        this.viewsContainer.className = 'gm-gapps-views-container';
        this.container.appendChild(this.viewsContainer);

        // Start with the initial view
        this.setView('InitialView');
    }

    setView(viewType) {
        let viewInstance = this.instanciatedViews.get(viewType);

        // Store the rendered view if it doesn't exist
        if (!viewInstance) {
            // Determine which view to instantiate based on the type string
            switch (viewType) {
                case 'InitialView':
                    viewInstance = new InitialView(this);
                    break;
                case 'DisclaimerView':
                    viewInstance = new DisclaimerView(this);
                    break;
                case 'InstallingGAPPSView':
                    viewInstance = new InstallingGAPPSView(this);
                    break;
                case 'InstallationSuccessView':
                    viewInstance = new InstallationSuccessView(this);
                    break;
                case 'InstallationFailedView':
                    viewInstance = new InstallationFailedView(this);
                    break;
                default:
                    log.error(`Unknown view type: ${viewType}`);
                    return;
            }
            this.instanciatedViews.set(viewType, viewInstance);
        }

        // Clear the container
        this.viewsContainer.innerHTML = '';

        // Append the stored rendered element
        this.currentViewType = viewType;
        this.viewsContainer.appendChild(viewInstance.render());
    }

    toggleWidget() {
        super.toggleWidget();
    }
};
