'use strict';

const OverlayPlugin = require('./util/OverlayPlugin');
const log = require('loglevel');
const fileUploader = require('./util/fileUploader');

module.exports = class FileUpload extends OverlayPlugin {
    static get name() {
        return 'FileUpload';
    }

    constructor(instance, i18n) {
        super(instance);
        this.instance = instance;
        this.i18n = i18n || {};
        this.fileUploadWorker = null;

        this.removeListenerDragAndDropOver = null;
        this.removeListenerDragAndDropLeave = null;
        this.removeListenerDragAndDropDrop = null;

        try {
            this.fileUploadWorker = this.instance.createFileUploadWorker();
            this.fileUploadWorker.onmessage = (event) => {
                const msg = event.data;
                switch (msg.code) {
                    case 'SUCCESS':
                        this.fileUploader.showUploadSuccess();
                        // Show the indicator in the toolbar if the widget is closed.
                        if (!this.instance.store.getters.isWidgetOpened(this.overlayID)){
                            this.toolbarBtn.setIndicator('success');
                        }
                        break;
                    case 'FAIL':
                        this.fileUploader.uploadingStop();
                        this.fileUploader.showUploadError(
                            this.i18n.FILE_SEND_FAILED ||
                                `Something went wrong while processing the file. 
                                Please make sure the file is valid and try again.`,
                        );
                        // Show the indicator in the toolbar if the widget is closed.
                        if (!this.instance.store.getters.isWidgetOpened(this.overlayID)){
                            this.toolbarBtn.setIndicator('failed');
                        }
                        break;
                    case 'PROGRESS':
                        this.fileUploader.updateProgress(msg.value * 100, msg.uploadedSize, msg.fileSize);
                        break;
                    default:
                        break;
                }
            };
        } catch (error) {
            log.error(error);
            // TODO desactiver le plugin
        }

        // Render components
        this.registerToolbarButton();
        this.renderWidget();
    }

    /**
     * Add the button to the renderer toolbar.
     */
    registerToolbarButton() {
        this.toolbarBtn = this.instance.toolbarManager.registerButton({
            id: this.constructor.name,
            iconClass: 'gm-uploader-button',
            title: this.i18n.UPLOADER_TITLE || 'File upload',
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
        // Create elements
        const {container} = this.createTemplateModal({
            title: this.i18n.UPLOADER_TITLE || 'File upload',
            classes: 'gm-uploader-plugin',
            width: 498,
            height: 624,
        });
        const containerDiv = document.createElement('div');
        containerDiv.className = 'file-upload-view-container';

        // Intro Section
        const introSection = document.createElement('div');
        introSection.className = 'gm-section';
        const text = document.createElement('div');
        text.className = 'gm-text';
        text.innerHTML = this.i18n.FILE_UPLOAD_TEXT ||
            `You can upload files to the device from here.
             Application APK files and flashable ZIP archives will be installed, 
             other file types will be copied to <b>/sdcard/download</b> folder on the device.`;
        introSection.appendChild(text);

        // File Upload Section
        const fileUploadSection = document.createElement('div');
        fileUploadSection.className = 'gm-section';

        // Create file uploader component
        this.fileUploader = fileUploader.createFileUploader({
            onFileSelect: (file) => {
                this.toolbarBtn.setIndicator('notification');
                this.instance.store.dispatch({type: 'DRAG_AND_DROP_UPLOAD_FILE_ENABLED', payload: false});
                this.instance.root.classList.add('gm-uploading-in-progess');

                const msg = {type: 'upload', file};
                this.fileUploadWorker.postMessage(msg);
            },
            onUploadCancelled:() => {
                this.fileUploadWorker.postMessage({type: 'cancel'});
            },
            onUploadComplete: () => {
                this.instance.store.dispatch({type: 'DRAG_AND_DROP_UPLOAD_FILE_ENABLED', payload: true});
                this.toolbarBtn.setIndicator('');
                this.instance.root.classList.remove('gm-uploading-in-progess');
            },
            dragDropText: this.i18n.DRAG_DROP_TEXT || 'DRAG & DROP YOUR FILE',
            browseButtonText: this.i18n.BROWSE_BUTTON_TEXT || 'BROWSE',
            maxFileSize: 900,
            i18n: this.i18n,
        });

        fileUploadSection.appendChild(this.fileUploader.element);

        containerDiv.appendChild(introSection);
        containerDiv.appendChild(fileUploadSection);

        container.appendChild(containerDiv);

        if (this.instance.store.state.isDragAndDropForUploadFileEnabled) {
            this.fileUploader.setEnabled(true);
            this.addListenerOnRoot();
        } else {
            this.fileUploader.setEnabled(false);
            this.removeListenerOnRoot();
        }

        this.instance.store.subscribe(
            ({isDragAndDropForUploadFileEnabled}) => {
                if (isDragAndDropForUploadFileEnabled) {
                    this.fileUploader.setEnabled(true);
                    this.addListenerOnRoot();
                } else {
                    this.fileUploader.setEnabled(false);
                    this.removeListenerOnRoot();
                }
            },
            ['isDragAndDropForUploadFileEnabled'],
        );

        return container;
    }

    addListenerOnRoot() {
        this.removeListenerDragAndDropOver = this.instance.addListener(this.instance.root, 'dragover', (event) => {
            event.preventDefault();
            event.stopPropagation();
        });

        this.removeListenerDragAndDropLeave =
            this.instance.addListener(this.instance.root, 'dragleave', (event) => {
                event.preventDefault();
                event.stopPropagation();
            });

        this.removeListenerDragAndDropDrop =
            this.instance.addListener(this.instance.root, 'drop', (event) => {
                event.preventDefault();
                event.stopPropagation();

                this.fileUploader.startUpload(event.dataTransfer.files[0]);
            });
    }

    removeListenerOnRoot() {
        this.removeListenerDragAndDropOver?.();
        this.removeListenerDragAndDropDrop?.();
        this.removeListenerDragAndDropLeave?.();
    }
};
