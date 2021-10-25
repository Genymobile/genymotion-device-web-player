# Genymotion device web player

![npm](https://img.shields.io/npm/v/@genymotion/device-web-player)
![GitHub](https://img.shields.io/github/license/Genymobile/genymotion-device-web-player)

<img align="right" src="./doc/assets/screenshot.png" height="500"></img>

This repository contains the Genymotion device web player JavaScript SDK.
It provides an easy way to integrate **Genymotion devices** running in the cloud into any web application. You will be able to display an emulator screen and interact with the device.

It focuses on:

- **compatibility** (vanilla JavaScript, no external framework used)
- **performance** (30fps or more)
- **quality** (Up to 1920×1080)
- **low latency**

For more information about Genymotion devices, please visit [genymotion website](https://www.genymotion.com).

## Table of contents

1. [Requirements](#Requirements)
2. [Getting started](#getting-started)
    1. [With NPM/Yarn](#with-npmyarn)
    2. [With CDN](#with-cdn)
3. [Usage](#usage)
4. [Features & options](#features--options)

## Requirements
A Modern, WebRTC compatible, Web browser:

- Google Chrome 85+
- Mozilla Firefox 78+
- Opera 70+
- Microsoft Edge 20.10240+
- Safari 11+

## Getting started
### With NPM/Yarn

Using yarn:

```bash
yarn add @genymotion/device-web-player
```

Using npm:

```bash
npm install @genymotion/device-web-player
```

Package import (commonJS):

```js
const GenymotionManager = require('genymotion/device-web-player');
```

```html
<style lang="scss">
    @import "genymotion-device-web-player/dist/css/Genymotion";
</style>
```

### With CDN

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@genymotion/device-web-player@1.4.1/dist/css/gm-player.css">
<script src="https://cdn.jsdelivr.net/npm/@genymotion/device-web-player@1.4.1/dist/js/gm-player.min.js"></script>
```

## Usage

Use `GenymotionManager` to instanciate one or more Genymotion device player.
All you need is an HTML element to use as a container. See example below. 

```html
<div id="genymotion"></div>

<script>
    // See "Features & options" section for more details about options
    const options = {
        template: "player",    // template defines how player is displayed
        token: 'i-XXXXXXXXXX'  // token is the shared secret to connect to your VM
    };
    
    // The URL addresses of your instances
    const webrtcAddress = 'wss://x.x.x.x';

    // Devive player instanciation
    const genymotion = new GenymotionManager();
    genymotion.setupInstance(document.getElementById('genymotion'), // the container element or element ID to use
                             webrtcAddress,                         // the websocket address of your instance connector
                             options                                // options object to enable or disable features
    );
</script>
```

## Features & options

A device player instance can be configured using the `options` argument (object). Possible configuration key / value are described below.

### `template`

- **Type:** `String`
- **Default:** `player`
- **Compatibility:** `PaaS`, `SaaS`
- **Details:**
Defines the layout of the player. Can be one of the following: `bootstrap`, `fullscreen`, `fullwindow`, `player`, `player_minimal`, `player_no_toolbar`, `player_partial`.

### `token`

- **Type:** `String`
- **Default:** `undefined`
- **Compatibility:** `PaaS`, `SaaS`
- **Details:**
Instance access token, the shared secret used to connect to the device.

### `i18n`

- **Type:** `Object`
- **Default:** `{}`
- **Compatibility:** `PaaS`, `SaaS`
- **Details:**
Alternative translation for the player UI.

### `stun`

- **Type:** `Object`
- **Default:** `{}`
- **Compatibility:** `PaaS`, `SaaS`
- **Details:**
WebRTC STUN servers configuration. Format: 

```js
{
    urls: [
        'stun:stun-server1.org:80',
        'stun:stun-server2.org:443',
        ...
    ],
}
```

### `turn`

- **Type:** `Object`
- **Default:** `{}`
- **Compatibility:** `PaaS`, `SaaS`
- **Details:**
WebRTC TURN servers configuration. Format:

```js
{
    urls: [],
    username: "myUsername",
    credential: "myPassword",
    default: false  // Whether or not we should use the TURN servers by default. Default: false.
}
```

### `streamResolution`

<img align="right" src="./doc/assets/ic-resolution_active_black.svg" alt="..."></img>

- **Type:** `Boolean`
- **Default:** `true`
- **Compatibility:** `SaaS`
- **Details:**
Enables or disables the video stream quality widget.

### `streamBitrate`

- **Type:** `Boolean`
- **Default:** `false`
- **Compatibility:** `SaaS`
- **Details:**
Enables or disables the stream bitrate widget.

### `touch`

- **Type:** `Boolean`
- **Default:** `true`
- **Compatibility:** `PaaS`, `SaaS`
- **Details:**
Enables or disables the touch events (fingers on screen). If you want to disable all VM interaction, please also disable `mouse` and `keyboard`.

### `mouse`

- **Type:** `Boolean`
- **Default:** `true`
- **Compatibility:** `PaaS`, `SaaS`
- **Details:**
Enables or disables the mouse events. If you want to disable all VM interaction, please also disable `touch` and `keyboard`.

### `keyboard`

- **Type:** `Boolean`
- **Default:** `true`
- **Compatibility:** `PaaS`, `SaaS`
- **Details:**
Enables or disables the keyboard widget. This widget can be used to transmit keyboard key strokes to the Android virtual device.

### `volume`

<img align="right" src="./doc/assets/ic_sound_active_black.svg" alt="..."></img>

- **Type:** `Boolean`
- **Default:** `true`
- **Compatibility:** `PaaS`, `SaaS`
- **Details:**
Enables or disables the volume widget. This widget can be used to increase or decrease the volume of the Android virtual device.

### `rotation`

<img align="right" src="./doc/assets/ic_rotation_active_black.svg" alt="..."></img>

- **Type:** `Boolean`
- **Default:** `true`
- **Compatibility:** `PaaS`, `SaaS`
- **Details:**
Enables or disables the rotation widget. This widget can be used to rotate the Android virtual device.

### `navbar`

<img align="right" src="./doc/assets/ic-nav_android_back_active_black.svg" alt="..."></img>
<img align="right" src="./doc/assets/ic-nav_android_home_active_black.svg" alt="..."></img>
<img align="right" src="./doc/assets/ic-nav_android_multiapp_active_black.svg" alt="..."></img>

- **Type:** `Boolean`
- **Default:** `true`
- **Compatibility:** `PaaS`, `SaaS`
- **Details:**
Enables or disables the navbar widgets. This widget can be used to navigate in the Android virtual device like when using hardware buttons.

### `power`

<img align="right" src="./doc/assets/ic_icon_power_inactive_black.svg" alt="..."></img>

- **Type:** `Boolean`
- **Default:** `true`
- **Compatibility:** `PaaS`, `SaaS`
- **Details:**
Enables or disables the power widget. This widget can be used to poweroff or reboot the Android virtual device.

### `fullscreen`

<img align="right" src="./doc/assets/ic_fullscreen_active_black.svg" alt="..."></img>
<img align="right" src="./doc/assets/ic_fullscreen_exit_active_black.svg" alt="..."></img>

- **Type:** `Boolean`
- **Default:** `true`
- **Compatibility:** `PaaS`, `SaaS`
- **Details:**
Enables or disables the fullscreen widget. This widget can be used to make the player go fullscreen.

### `camera`

<img align="right" src="./doc/assets/ic_camera_active_black.svg" alt="..."></img>

- **Type:** `Boolean`
- **Default:** `true`
- **Compatibility:** `PaaS`, `SaaS`
- **Details:**
Enables or disables the camera widget. This widget can be used to forward local webcam to the Android virtual device.

### `fileUpload`

<img align="right" src="./doc/assets/ic_cloud_upload_active_black.svg" alt="..."></img>

- **Type:** `Boolean`
- **Default:** `true`
- **Compatibility:** `PaaS`, `SaaS`
- **Details:**
Enables or disables the fileUpload widget and drag & drop. This widget can be used to forward local file to the Android virtual device. When drag & dropping APK or ZIP files, it will install them.

### `fileUploadUrl`

- **Type:** `String`
- **Default:** `undefined`
- **Compatibility:** `PaaS`, `SaaS`
- **Details:**
Set the file upload url, required if `fileUpload` is set to `true`.

### `clipboard`

<img align="right" src="./doc/assets/ic_clipboard_active_black.svg" alt="..."></img>

- **Type:** `Boolean`
- **Default:** `true`
- **Compatibility:** `PaaS`, `SaaS`
- **Details:**
Enables or disables the clipboard widget. This widget can be used to forward local clipboard to the Android virtual device.

### `battery`

<img align="right" src="./doc/assets/ic-battery_active_black.svg" alt="..."></img>

- **Type:** `Boolean`
- **Default:** `true`
- **Compatibility:** `PaaS`, `SaaS`
- **Details:**
Enables or disables the battery widget. This widget can be used to set the battery level and state of the Android virtual device.

### `gps`

<img align="right" src="./doc/assets/ic_location_active_black.svg" alt="..."></img>

- **Type:** `Boolean`
- **Default:** `true`
- **Compatibility:** `PaaS`, `SaaS`
- **Details:**
Enables or disables the gps widget. This widget can be used to set the gps location of the Android virtual device.

### `gpsSpeedSupport`

- **Type:** `Boolean`
- **Default:** `false`
- **Compatibility:** `PaaS`, `SaaS`
- **Details:**
Enables or disables gps speed support. 

### `capture`

<img align="right" src="./doc/assets/ic-screenshot_active_black.svg" alt="..."></img>

- **Type:** `Boolean`
- **Default:** `true`
- **Compatibility:** `PaaS`, `SaaS`
- **Details:**
Enables or disables the capture widget. This widget can be used to capture the screen of the Android virtual device (screenshot or screencast).

### `identifiers`

<img align="right" src="./doc/assets/ic_id_active_black.svg" alt="..."></img>

- **Type:** `Boolean`
- **Default:** `true`
- **Compatibility:** `PaaS`, `SaaS`
- **Details:**

Enables or disables the identifiers widget. This widget can be used to set the identifiers (Android ID / IMEI) of the Android virtual device.

### `network`

<img align="right" src="./doc/assets/ic_network_active_black.svg" alt="..."></img>

- **Type:** `Boolean`
- **Default:** `true`
- **Compatibility:** `PaaS`, `SaaS`
- **Details:**
Enables or disables the network widget. This widget can be used to set the network (throttling and baseband) of the Android virtual device.

### `phone`

<img align="right" src="./doc/assets/ic_textandcall_active_black.svg" alt="..."></img>

- **Type:** `Boolean`
- **Default:** `true`
- **Compatibility:** `PaaS`, `SaaS`
- **Details:**

Enables or disables the phone widget. This widget can be used to send SMS or phone call the Android virtual device.

### `diskIO`

<img align="right" src="./doc/assets/ic_diskIO_active_black.svg" alt="..."></img>

- **Type:** `Boolean`
- **Default:** `true`
- **Compatibility:** `PaaS`, `SaaS`
- **Details:**
Enables or disables the diskIO widget. This widget can be used to modify Disk IO (throttling) of the Android virtual device.


### `translateHomeKey`

- **Type:** `Boolean`
- **Default:** `false`
- **Compatibility:** `PaaS`
- **Details:**
Translate home key to `META` + `ENTER`


### `baseband`

<img align="right" src="./doc/assets/ic_baseband_active_black.svg" alt="..."></img>

- **Type:** `Boolean`
- **Default:** `false`
- **Compatibility:** `PaaS`
- **Details:**
Enable or disable baseband (MMC/MNC) widget

### `connectionFailedURL`

- **Type:** `String`
- **Default:** `undefined`
- **Compatibility:** `SaaS`, `PaaS`
- **Details:**
Redirection page in case of connection error.

## Contributing

Read through our [contributing guidelines](https://github.com/Genymobile/genymotion-device-web-player/blob/main/CONTRIBUTING.md) to learn about our submission process, coding rules and more.
