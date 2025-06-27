'use strict';

module.exports = function () {
    const self = this;
    this.socket = null;
    this.token = null;
    this.hasError = false;
    this.isUploading = false;
    this.uploadedSize = 0;
    this.file = null;
    this.address = null;
    this.MEGABYTE = 1000 * 1000;

    self.getChunkSize = function (fileSize) {
        /*
         * The minimum upload size of chunk is 5MB.
         * If we are uploading a "big" file, we are uploading 10% by 10%.
         * The maximum chunk size is 75MB to avoid "out of memory" errors on PaaS.
         */
        const minimum = 5 * self.MEGABYTE;
        const maximum = 75 * self.MEGABYTE;
        return Math.max(minimum, Math.min(0.1 * fileSize, maximum));
    };

    self.onOpen = function () {
        const tokenRequest = {
            type: 'token',
            token: self.token,
        };
        self.socket.send(JSON.stringify(tokenRequest));

        const msg = {
            type: 'FILE_UPLOAD',
            code: 'SOCKET_SUCCESS',
        };
        postMessage(msg);
    };

    self.onClose = function () {
        setTimeout(function () {
            self.connect(self.address);
        }, 1000);
    };

    self.connect = function (address) {
        self.socket = new WebSocket(address);
        self.socket.binaryType = 'arraybuffer';
        self.socket.onopen = self.onOpen;
        self.socket.onerror = self.onSocketFailure;
        self.socket.onmessage = self.onSocketMsg;
        self.socket.onclose = self.onClose;
    };

    self.onSocketFailure = function () {
        const msg = {
            type: 'FILE_UPLOAD',
            code: 'SOCKET_FAIL',
        };
        self.isUploading = false;
        postMessage(msg);
    };

    self.onFailure = function () {
        const msg = {
            type: 'FILE_UPLOAD',
            code: 'FAIL',
        };
        self.isUploading = false;
        postMessage(msg);
    };

    self.uploadData = function (event) {
        if (self.hasError === false) {
            self.socket.send(event.target.result, {binary: true});
        }
    };

    self.onSocketMsg = function (evt) {
        const msg = JSON.parse(evt.data);

        if (msg.type === 'FILE_UPLOAD') {
            switch (msg.code) {
                case 'NEXT': {
                    if (self.uploadedSize < self.file.size) {
                        const chunkLength = self.getChunkSize(self.file.size);
                        let blob;
                        const reader = new FileReader();
                        reader.onload = self.uploadData;
                        reader.onabort = self.onFailure;
                        reader.onerror = self.onFailure;

                        if (self.file.size - self.uploadedSize > chunkLength) {
                            blob = self.file.slice(self.uploadedSize, self.uploadedSize + chunkLength);
                            self.uploadedSize += chunkLength;
                        } else {
                            blob = self.file.slice(self.uploadedSize);
                            self.uploadedSize = self.file.size;
                        }
                        reader.readAsArrayBuffer(blob);
                    } else {
                        const status = {
                            type: 'FILE_UPLOAD',
                            done: true,
                        };
                        self.socket.send(JSON.stringify(status));
                        self.isUploading = false;
                    }
                    break;
                }
                case 'PROGRESS':
                    msg.fileSize = (self.file.size / 1024 / 1000).toFixed(2);
                    msg.uploadedSize = (self.uploadedSize / 1024 / 1000).toFixed(2);
                    postMessage(msg);
                    break;
                case 'SUCCESS':
                    postMessage(msg);
                    break;
                case 'FAIL':
                    self.hasError = true;
                    postMessage(msg);
                    break;
                default:
                    break;
            }
        }
    };

    self.cancelUpload = function () {
        if (self.isUploading) {
            self.isUploading = false;
            self.hasError = false;
            const msg = {
                type: 'FILE_UPLOAD',
                code: 'CANCELED',
            };
            postMessage(msg);
            if (self.socket) {
                self.socket.close();
            }
        }
    };

    self.onmessage = function (event) {
        const msg = event.data;

        switch (msg.type) {
            case 'address':
                self.token = msg.token;
                self.address = msg.fileUploadAddress;
                self.connect(self.address);
                break;
            case 'close':
                self.isUploading = false;
                if (self.socket) {
                    self.socket.onclose = null;
                    self.socket.close();
                }
                break;
            case 'cancel':
                self.cancelUpload();
                break;
            case 'upload':
                if (!self.isUploading) {
                    self.file = msg.file;
                    self.isUploading = true;
                    self.hasError = false;
                    self.uploadedSize = 0;

                    const data = {
                        type: 'FILE_UPLOAD',
                        name: self.file.name,
                        size: self.file.size,
                    };
                    self.socket.send(JSON.stringify(data));
                }
                break;
            default:
                break;
        }
    };
};
