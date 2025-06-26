'use strict';

const {progressBar} = require('./components');

/**
 * Module for creating custom file uploader components with drag & drop functionality.
 * @module fileUploader
 */
const fileUploader = (() => {
    /**
     * Creates a custom file uploader component with drag & drop functionality.
     * @param {Object} options - Configuration options for the file uploader
     * @param {Function} [options.onFileSelect] - Callback function triggered when a file is selected
     * @param {Function} [options.onUploadProgress] - Callback function triggered when upload progress changes
     * @param {Function} [options.onUploadComplete] - Callback function triggered when upload is complete
     * @param {Function} [options.onUploadError] - Callback function triggered when an error occurs
     * @param {Function} [options.onUploadCanceled] - Callback function triggered when upload is canceled
     * @param {string} [options.dragDropText='DRAG AND DROP FILES'] - Text to display in the drag & drop area
     * @param {string} [options.browseButtonText='BROWSE'] - Text to display on the browse button
     * @param {string} [options.accept=''] - File types to accept (e.g. '.apk' or not set for accept all files)
     * @param {string} [options.classes=''] - Additional CSS classes to apply
     * @param {Object} i18n - i18n object translation
     * @returns {Object} Object containing the file uploader element and control methods
     * @property {HTMLElement} element - The file uploader DOM element
     * @property {Function} setEnabled - Method to enable/disable the file uploader
     * @property {Function} reset - Method to reset the file uploader state
     */
    const createFileUploader = ({
        onFileSelect = null,
        onUploadProgress = null,
        onUploadComplete = null,
        onUploadError = null,
        onUploadCanceled = null,
        dragDropText = 'DRAG & DROP FILES',
        browseButtonText = 'BROWSE',
        accept = null,
        classes = '',
        i18n= {}
    }) => {
        let handleDragOver = null;
        let handleDragLeave = null;
        let handleDrop = null;

        const container = document.createElement('div');
        container.className = classes + ' gm-file-uploader';

        // Create drag & drop area
        const dragDropArea = document.createElement('div');
        dragDropArea.className = 'gm-drag-drop-area';

        // Create hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        if (accept) {
            fileInput.accept = accept;
        }
        fileInput.style.display = 'none';

        fileInput.onchange = (event) => {
            // eslint-disable-next-line no-use-before-define
            checkFileBeforeUpload(event.target.files[0]);
        };

        const addFileIcon = document.createElement('i');
        addFileIcon.className = 'gm-addFile-icon';

        const dragDropTextDiv = document.createElement('div');
        dragDropTextDiv.className = 'drop-text';
        dragDropTextDiv.innerHTML = `<div class='drop-text-1'>
            <b>${dragDropText}</b>`;

        const browseButton = document.createElement('button');
        browseButton.innerHTML = browseButtonText;
        browseButton.className = 'gm-btn gm-gradient-button';
        browseButton.onclick = () => {
            fileInput.click();
        };

        const dragOverContainer = document.createElement('div');
        dragOverContainer.className = 'gm-drag-over-container';

        const dragOverIcon = document.createElement('i');
        dragOverIcon.className = 'gm-drag-placeholder-icon';

        dragOverContainer.appendChild(dragOverIcon);
        dragDropArea.appendChild(dragOverContainer);

        dragDropArea.appendChild(fileInput);
        dragDropArea.appendChild(addFileIcon);
        dragDropArea.appendChild(dragDropTextDiv);
        dragDropArea.appendChild(browseButton);

        // Create upload progress section (initially hidden)
        const uploadProgressSection = document.createElement('div');
        uploadProgressSection.className = 'gm-section gm-upload-progress hidden';

        const uploadProgressTitle = document.createElement('div');
        uploadProgressTitle.className = 'gm-uploading-file-title';
        uploadProgressTitle.innerHTML = 'Uploading files';

        const uploadProgressInfoDiv = document.createElement('div');
        uploadProgressInfoDiv.className = 'gm-info-flex';

        const uploadProgressIcon = document.createElement('i');
        uploadProgressIcon.className = 'gm-downloadFile-icon';

        const wrapperUploadingTextAndProgress = document.createElement('div');
        wrapperUploadingTextAndProgress.className = 'gm-wrapper-uploading-text-and-progress';
        const uploadProgressTextContainer = document.createElement('div');
        uploadProgressTextContainer.className = 'gm-progress-text-container';

        const uploadStatusText = document.createElement('div');
        uploadStatusText.className = 'gm-progress-text gm-dots-jump-loader';
        uploadStatusText.innerHTML = 'Uploading';

        const uploadFileName = document.createElement('div');
        uploadFileName.className = 'gm-file-name';

        const uploadCancelButton = document.createElement('i');

        uploadCancelButton.className = 'gm-cancel-update-icon';
        uploadCancelButton.onclick = () => {
            fileInput.value= '';
            if (onUploadCanceled) {
                onUploadCanceled();
            }
            // eslint-disable-next-line no-use-before-define
            uploadingStop();
        };

        uploadProgressTextContainer.appendChild(uploadStatusText);
        uploadProgressTextContainer.appendChild(uploadFileName);
        uploadProgressTextContainer.appendChild(uploadCancelButton);

        const progressBarUpload = progressBar.createProgressBar({
            value: 0,
            max: 100,
        });

        const uploadSizeText = document.createElement('div');
        uploadSizeText.className = 'gm-size-text';

        wrapperUploadingTextAndProgress.appendChild(uploadProgressTextContainer);
        wrapperUploadingTextAndProgress.appendChild(progressBarUpload.element);
        wrapperUploadingTextAndProgress.appendChild(uploadSizeText);

        uploadProgressInfoDiv.appendChild(uploadProgressIcon);
        uploadProgressInfoDiv.appendChild(wrapperUploadingTextAndProgress);

        uploadProgressSection.appendChild(uploadProgressTitle);
        uploadProgressSection.appendChild(uploadProgressInfoDiv);

        // Create error section (initially hidden)
        const uploadErrorSection = document.createElement('div');
        uploadErrorSection.className = 'gm-section gm-upload-error hidden';

        const uploadErrorInfoDiv = document.createElement('div');
        uploadErrorInfoDiv.className = 'gm-info-flex';

        const uploadErrorTitle = document.createElement('div');
        uploadErrorTitle.className = 'gm-error-title';
        uploadErrorTitle.innerHTML = 'Error';

        const uploadErrorIcon = document.createElement('i');
        uploadErrorIcon.className = 'gm-error-icon';

        const uploadErrorText = document.createElement('div');
        uploadErrorText.className = 'gm-error-text';

        uploadErrorInfoDiv.appendChild(uploadErrorIcon);
        uploadErrorInfoDiv.appendChild(uploadErrorText);

        uploadErrorSection.appendChild(uploadErrorTitle);
        uploadErrorSection.appendChild(uploadErrorInfoDiv);

        // Create success section (initially hidden)
        const uploadSuccessSection = document.createElement('div');
        uploadSuccessSection.className = 'gm-section gm-upload-success hidden';

        const uploadSuccessInfoDiv = document.createElement('div');
        uploadSuccessInfoDiv.className = 'gm-info-flex';

        const uploadSuccessTitle = document.createElement('div');
        uploadSuccessTitle.className = 'gm-uploading-file-title';
        uploadSuccessTitle.innerHTML = 'Uploading files';

        const uploadSuccessIcon = document.createElement('i');
        uploadSuccessIcon.className = 'gm-downloadFile-icon';

        const uploadSuccessText = document.createElement('div');
        uploadSuccessText.className = 'gm-success-text';

        const completedInfoDiv = document.createElement('div');
        completedInfoDiv.className = 'gm-info-flex gm-completed-text';

        const completedIcon = document.createElement('i');
        completedIcon.className = 'gm-check-icon';

        const completedText = document.createElement('div');
        completedText.innerHTML = i18n.COMPLETED || 'Completed';

        completedInfoDiv.appendChild(completedText);
        completedInfoDiv.appendChild(completedIcon);

        uploadSuccessInfoDiv.appendChild(uploadSuccessIcon);
        uploadSuccessInfoDiv.appendChild(uploadSuccessText);
        uploadSuccessInfoDiv.appendChild(completedInfoDiv);

        uploadSuccessSection.appendChild(uploadSuccessTitle);
        uploadSuccessSection.appendChild(uploadSuccessInfoDiv);

        // Add all sections to container
        container.appendChild(dragDropArea);
        container.appendChild(uploadProgressSection);
        container.appendChild(uploadErrorSection);
        container.appendChild(uploadSuccessSection);

        const getFileNameToDisplay = (name) => {
            const truncateThreshold = 30;

            let fileName = name;
            if (fileName.length > truncateThreshold) {
                const [nameWithoutExt, extension = ''] = fileName.split(/(?=\.[^.]+$)/);
                fileName = `${nameWithoutExt.slice(0, truncateThreshold)}...` + extension;
            }
            return fileName;
        };

        const hideUploadError = () => {
            uploadErrorSection.classList.add('hidden');
        };

        const hideUploadSuccess = () => {
            uploadSuccessSection.classList.add('hidden');
        };

        const hideUploadProgress = () => {
            uploadProgressSection.classList.add('hidden');
        };

        const showUploadError = (message) => {
            hideUploadProgress();
            hideUploadSuccess();
            uploadErrorSection.classList.remove('hidden');
            uploadErrorText.innerHTML = message;
            if (onUploadError) {
                onUploadError(message);
            }
        };

        const showUploadSuccess = () => {
            hideUploadProgress();
            hideUploadError();
            uploadSuccessSection.classList.remove('hidden');
            uploadSuccessText.innerHTML = uploadFileName.innerHTML;
            if (onUploadComplete) {
                onUploadComplete();
            }
        };

        const showUploadProgress = (file) => {
            hideUploadError();
            hideUploadSuccess();
            uploadProgressSection.classList.remove('hidden');
            const fileName = getFileNameToDisplay(file.name);
            uploadFileName.innerHTML = fileName;
        };

        const resetProgressBar = () => {
            progressBarUpload.setValue(0);
            uploadSizeText.innerHTML = '';
        };

        const uploadingStop = () => {
            hideUploadProgress();
            hideUploadSuccess();
            resetProgressBar();
            if (onUploadComplete) {
                onUploadComplete();
            }
        };

        const checkFileBeforeUpload = (file) => {
            if (file) {
                if (!accept || (accept && file.name.toLowerCase().endsWith(accept.toLowerCase()))) {
                    // If file is valid, hide error and show upload progress
                    hideUploadError();
                    hideUploadSuccess();
                    showUploadProgress(file);
                    if (onFileSelect) {
                        onFileSelect(file);
                    }
                } else {
                    showUploadError(i18n.FILE_TYPE_NOT_APK ||
                        `Invalid file type. Only ${accept} files are supported.
                        Please select a file with the correct extension.`,
                    );
                }
            } else {
                showUploadError('Invalid drop content. Please drag and drop a file, not text or other data.');
            }
        };

        const enableDragOver = () => {
            handleDragOver = (event) => {
                event.preventDefault();
                event.stopPropagation();
                dragDropArea.classList.add('dragover');
            };

            handleDragLeave = (event) => {
                event.preventDefault();
                event.stopPropagation();
                dragDropArea.classList.remove('dragover');
            };

            handleDrop = (event) => {
                event.preventDefault();
                event.stopPropagation();
                dragDropArea.classList.remove('dragover');
                checkFileBeforeUpload(event.dataTransfer.files[0]);
            };

            dragDropArea.addEventListener('dragover', handleDragOver);
            dragDropArea.addEventListener('dragleave', handleDragLeave);
            dragDropArea.addEventListener('drop', handleDrop);
        };

        const disableDragOver = () => {
            dragDropArea.removeEventListener('dragover', handleDragOver);
            dragDropArea.removeEventListener('dragleave', handleDragLeave);
            dragDropArea.removeEventListener('drop', handleDrop);
        };

        const setEnabled = (enabled) => {
            if (enabled) {
                browseButton.disabled = false;
                browseButton.classList.remove('disabled');
                dragDropArea.classList.remove('disabled');
                enableDragOver();
            } else {
                browseButton.disabled = true;
                browseButton.classList.add('disabled');
                dragDropArea.classList.add('disabled');
                disableDragOver();
            }
        };

        const updateProgress = (percentage, uploadedSize, fileSize) => {
            progressBarUpload.setValue(percentage);
            uploadSizeText.innerHTML = `(${uploadedSize} ${i18n.OF || 'of'} ${fileSize}Mo)`;
            if (onUploadProgress) {
                onUploadProgress(percentage, uploadedSize, fileSize);
            }
        };

        const reset = () => {
            uploadingStop();
            hideUploadError();
            hideUploadSuccess();
            setEnabled(true);
        };

        // Initialize drag & drop
        enableDragOver();

        return {
            element: container,
            setEnabled,
            reset,
            updateProgress,
            uploadingStop,
            showUploadError,
            showUploadSuccess,
            startUpload: checkFileBeforeUpload
        };
    };

    return {createFileUploader};
})();

module.exports = fileUploader;
