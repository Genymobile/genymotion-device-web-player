# Genymotion device web renderer

![npm](https://img.shields.io/npm/v/@genymotion/device-web-player)
![GitHub](https://img.shields.io/github/license/Genymobile/genymotion-device-web-player)

<img align="right" src="./doc/assets/screenshot.png" height="500"></img>

This repository contains the Genymotion device web renderer JavaScript SDK.
It provides an easy way to integrate **Genymotion devices** running in the cloud into any web application. You will be able to display an emulator screen and interact with the device.

It focuses on:

-   **compatibility** (vanilla JavaScript, no external framework used)
-   **performance** (30fps or more)
-   **quality** (Up to 1920×1080)
-   **low latency**

For more information about Genymotion devices, please visit [genymotion website](https://www.genymotion.com).

## Table of contents

1. [Requirements](#Requirements)
2. [Getting started](#getting-started)
    1. [With NPM/Yarn](#with-npmyarn)
    2. [With CDN](#with-cdn)
3. [Usage](#usage)
4. [Player API](#player-api)
5. [Features & options](#features--options)
6. [Features notes](#features-notes)
    1. [Key mapping](#keymapping-notes)

## Requirements

A Modern, WebRTC compatible, Web browser:

-   Google Chrome 85+
-   Mozilla Firefox 78+
-   Opera 70+
-   Microsoft Edge 20.10240+
-   Safari 11+

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
const {DeviceRendererFactory} = require('genymotion/device-web-player');
```

```html
<style lang="scss">
    @import 'genymotion-device-web-renderer/dist/css/device-renderer.min.css';
</style>
```

### With CDN

```html
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@genymotion/device-web-player@4.1.4/dist/css/device-renderer.min.css"
/>
<script src="https://cdn.jsdelivr.net/npm/@genymotion/device-web-player@4.1.4/dist/js/device-renderer.min.js"></script>
```

## Usage

Use `DeviceRendererFactory` to instanciate one or more device renderer.
All you need is an HTML element to use as a container. See example below.
To find your instance WebRTC address, use the [SaaS API](https://developer.genymotion.com/saas/#operation/getInstance)
or check the [PaaS documentation](https://docs.genymotion.com/paas/01_Requirements/), based on your device provider.

```html
<!-- OPTIONAL: Import google maps library with your API key to enable map positioning feature
<script src="https://maps.googleapis.com/maps/api/js?key=xxxxxxxxxxxxxxxxxxxxxxxx-yyyyyyyyyyyyyy"></script>
-->

<div id="genymotion"></div>

<script>
    // Instance address
    const webrtcAddress = 'wss://x.x.x.x';
    const container = document.getElementById('genymotion');

    // See "Features & options" section for more details about options
    const options = {
        template: 'renderer', // template defines how renderer is displayed
        token: 'i-XXXXXXXXXX', // token is the shared secret to connect to your VM
        fileUpload: false, // requires fileUploadUrl
    };

    // Device renderer instanciation
    const {DeviceRendererFactory} = window.genyDeviceWebPlayer;
    const deviceRendererFactory = new DeviceRendererFactory();
    const rendererAPI = deviceRendererFactory.setupRenderer(
        container, // the container element or element ID to use
        webrtcAddress, // the websocket address of your instance connector
        options, // options object to enable or disable features
    );

    // Disconnect the device renderer, closing any open data channels.
    window.addEventListener('beforeunload', function () {
        playerAPI.disconnect();
    });
</script>
```

## Player API

The Player API provides functionality for managing plugin options and websocket communication. These operations are handled through the API (categorized) object returned by the `setupRenderer` function.

### `VM_communication`

-   #### `disconnect`

    Disconnects the player from the virtual machine (VM) and cleans up the memory listener.

-   #### `addEventListener`

    Registers a listener for messages emitted from the VM.

    -   Parameters:

        -   event (string): The name of the event to listen for. Example events include 'fingerprint', 'gps'...
        -   callback (function): The function to call when the event is emitted. The message from the VM will be passed as an argument to the callback function.

    -   Example Usage

    ```js
    addEventListener('fingerprint', (msg) => {
        console.log(msg);
    });
    ```

-   #### `sendData`
    Sends messages to the VM.
    -   Parameters:
        -   `data` (object): An object containing the channel and the messages to be sent.
            -   `channel` (string): The channel to send the messages to.
            -   `messages` (array): An array of messages to be sent.
    -   Example Usage

```js
sendData({
    channel: 'battery',
    messages: ['set state level 10', 'set state status true'],
});
```

### `utils`

-   #### `getRegisteredFunctions`
    Returns a list of available functions with optional descriptions.

### `keymapping`

-   #### `setConfig`

    supply a config for keymapping

    ```js
    {
        dPad:[{
            keys:[
                {
                    key: 'w',
                    effect: {
                        initialX: 20,
                        initialY: 80,
                        distanceX: 0,
                        distanceY: -10,
                    },
                    name: 'up',
                    description: 'move up',
                },
                {
                    key: 's',
                    effect: {
                        initialX: 20,
                        initialY: 80,
                        distanceX: 0,
                        distanceY: 10,
                    },
                    name: 'down',
                    description: 'move down',
                },
                {
                    key: 'a',
                    effect: {
                        initialX: 20,
                        initialY: 80,
                        distanceX: -10,
                        distanceY: 0,
                    },
                    name: 'left',
                    description: 'move left',
                },
                {
                    key: 'd',
                    effect: {
                        initialX: 20,
                        initialY: 80,
                        distanceX: 10,
                        distanceY: 0,
                    },
                    name: 'up',
                    description: 'move right',
                },

            ],
            name: 'character movement',
            description: 'left joystick used to move the character',
        }],
        tap:[{
            key: 'p',
            effect: {
                initialX: 50,
                initialY: 50,
            },
            name:'Fire'
        }],
        swipe: [{
            key: 'u',
            effect: {
                initialX: 50,
                initialY: 50,
                distanceX: -10,
                distanceY: 0,
                description: 'swipe left',
            },
            name:'Left dodge',
            description: 'Dodge on the left'
        }]
    }
    ```

-   #### `activeKeyMappingDebug`

    helper to create the config mapping

    -   Parameters:
        -   `isTraceActivate` (boolean) : when true all click on video stream will print x and y coord over the video
        -   `isGridActivate` (boolean): when true display a grid over the video stream. Row and column have both a size of 10%.

-   #### `enable`
    -   Parameters:
        -   `isActive` (boolean) : **Optionnal** parameter to activate or desactivate keymapping, **default false**

### `media`

-   #### `mute`
-   #### `unmute`

### `video`

-   #### `fullscreen`
    Need to be call from an user action, in accordance with browser security rules

## Features & options

A device renderer instance can be configured using the `options` argument (object). Possible configuration key / value are described below.

### `template`

-   **Type:** `String`
-   **Default:** `renderer`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**
    Defines the layout of the renderer. Can be one of the following: `bootstrap`, `fullscreen`, `fullwindow`, `renderer`, `renderer_minimal`, `renderer_no_toolbar`, `renderer_partial`.

### `token`

-   **Type:** `String`
-   **Default:** `undefined`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**
    Instance access token, the shared secret used to connect to the device. For Genymotion PaaS devices, the token is the instance id (more information can be find [here](https://docs.genymotion.com/paas/02_Getting_Started/)). For SaaS devices, you must generate the access token using the [login api](https://developer.genymotion.com/saas/#operation/login).

### `i18n`

-   **Type:** `Object`
-   **Default:** `{}`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**
    Alternative translation for the renderer UI.

### `stun`

-   **Type:** `Object`
-   **Default:** `{}`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**
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

-   **Type:** `Object`
-   **Default:** `{}`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**
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

-   **Type:** `Boolean`
-   **Default:** `true`
-   **Compatibility:** `SaaS`
-   **Details:**
    Enables or disables the video stream quality widget.

### `streamBitrate`

-   **Type:** `Boolean`
-   **Default:** `false`
-   **Compatibility:** `SaaS`
-   **Details:**
    Enables or disables the stream bitrate widget.

### `touch`

-   **Type:** `Boolean`
-   **Default:** `true`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**
    Enables or disables the touch events (fingers on screen). If you want to disable all VM interaction, please also disable `mouse` and `keyboard`.

### `mouse`

-   **Type:** `Boolean`
-   **Default:** `true`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**
    Enables or disables the mouse events. If you want to disable all VM interaction, please also disable `touch` and `keyboard`.

### `keyboard`

-   **Type:** `Boolean`
-   **Default:** `true`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**
    Enables or disables the keyboard widget. This widget can be used to transmit keyboard key strokes to the Android virtual device.

### `keyboardMapping`

-   **Type:** `Boolean`
-   **Default:** `true`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**
    Enables or disables the keyboardMapping. This widget can be used to map key with command (i.e. tap, swipe-left, tilt, ...).

### `volume`

<img align="right" src="./doc/assets/ic_sound_active_black.svg" alt="..."></img>

-   **Type:** `Boolean`
-   **Default:** `true`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**
    Enables or disables the volume widget. This widget can be used to increase or decrease the volume of the Android virtual device.

### `rotation`

<img align="right" src="./doc/assets/ic_rotation_active_black.svg" alt="..."></img>

-   **Type:** `Boolean`
-   **Default:** `true`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**
    Enables or disables the rotation widget. This widget can be used to rotate the Android virtual device.

### `navbar`

<img align="right" src="./doc/assets/ic-nav_android_back_active_black.svg" alt="..."></img>
<img align="right" src="./doc/assets/ic-nav_android_home_active_black.svg" alt="..."></img>
<img align="right" src="./doc/assets/ic-nav_android_multiapp_active_black.svg" alt="..."></img>

-   **Type:** `Boolean`
-   **Default:** `true`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**
    Enables or disables the navbar widgets. This widget can be used to navigate in the Android virtual device like when using hardware buttons.

### `power`

<img align="right" src="./doc/assets/ic_icon_power_inactive_black.svg" alt="..."></img>

-   **Type:** `Boolean`
-   **Default:** `true`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**
    Enables or disables the power widget. This widget can be used to poweroff or reboot the Android virtual device.

### `fullscreen`

<img align="right" src="./doc/assets/ic_fullscreen_active_black.svg" alt="..."></img>
<img align="right" src="./doc/assets/ic_fullscreen_exit_active_black.svg" alt="..."></img>

-   **Type:** `Boolean`
-   **Default:** `true`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**
    Enables or disables the fullscreen widget. This widget can be used to make the renderer go fullscreen.

### `camera`

<img align="right" src="./doc/assets/ic_camera_active_black.svg" alt="..."></img>

-   **Type:** `Boolean`
-   **Default:** `true`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**
    Enables or disables the camera widget. This widget can be used to forward local webcam video to the Android virtual device.
    By default, if the `microphone` property is also true, then the default audio input will be used as well.

### `microphone`

<img align="right" src="./doc/assets/ic_camera_mic_active_black.svg" alt="..."></img>

-   **Type:** `Boolean`
-   **Default:** `false`
-   **Compatibility:** `PaaS`
-   **Details:**
    Enables or disables microphone injection. This can be used to forward local microphone (or webcam audio) to the Android virtual device.

### `fileUpload`

<img align="right" src="./doc/assets/ic_cloud_upload_active_black.svg" alt="..."></img>

-   **Type:** `Boolean`
-   **Default:** `true`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**
    Enables or disables the fileUpload widget and drag & drop. This widget can be used to forward local file to the Android virtual device. When drag & dropping APK or ZIP files, it will install them.

### `fileUploadUrl`

-   **Type:** `String`
-   **Default:** `undefined`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**
    Set the file upload url, required if `fileUpload` is set to `true`.

### `clipboard`

<img align="right" src="./doc/assets/ic_clipboard_active_black.svg" alt="..."></img>

-   **Type:** `Boolean`
-   **Default:** `true`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**
    Enables or disables the clipboard widget. This widget can be used to forward local clipboard to the Android virtual device.

### `battery`

<img align="right" src="./doc/assets/ic-battery_active_black.svg" alt="..."></img>

-   **Type:** `Boolean`
-   **Default:** `true`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**
    Enables or disables the battery widget. This widget can be used to set the battery level and state of the Android virtual device.

### `gps`

<img align="right" src="./doc/assets/ic_location_active_black.svg" alt="..."></img>

-   **Type:** `Boolean`
-   **Default:** `true`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**
    Enables or disables the gps widget. This widget can be used to set the gps location of the Android virtual device.
    If you want to use a visual map instead of GPS coordinates number to set the location, you must import google maps
    library with your API key.

```html
<!-- OPTIONAL: Import google maps library with your API key to enable map positioning feature -->
<script src="https://maps.googleapis.com/maps/api/js?key=xxxxxxxxxxxxxxxxxxxxxxxx-yyyyyyyyyyyyyy"></script>
```

### `gpsSpeedSupport`

-   **Type:** `Boolean`
-   **Default:** `false`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**
    Enables or disables gps speed support.

### `capture`

<img align="right" src="./doc/assets/ic-screenshot_active_black.svg" alt="..."></img>

-   **Type:** `Boolean`
-   **Default:** `true`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**
    Enables or disables the capture widget. This widget can be used to capture the screen of the Android virtual device (screenshot or screencast).

### `identifiers`

<img align="right" src="./doc/assets/ic_id_active_black.svg" alt="..."></img>

-   **Type:** `Boolean`
-   **Default:** `true`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**

Enables or disables the identifiers widget. This widget can be used to set the identifiers (Android ID / IMEI) of the Android virtual device.

### `network`

<img align="right" src="./doc/assets/ic_network_active_black.svg" alt="..."></img>

-   **Type:** `Boolean`
-   **Default:** `true`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**
    Enables or disables the network widget. This widget can be used to enable or disable the wifi or mobile network, and to set the network throttling (mobile network type and signal strength) of the Android virtual device.

### `phone`

<img align="right" src="./doc/assets/ic_textandcall_active_black.svg" alt="..."></img>

-   **Type:** `Boolean`
-   **Default:** `true`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**

Enables or disables the phone widget. This widget can be used to send SMS or phone call the Android virtual device.

### `baseband`

<img align="right" src="./doc/assets/ic_baseband_active_black.svg" alt="..."></img>

-   **Type:** `Boolean`
-   **Default:** `false`
-   **Compatibility:** `PaaS`
-   **Details:**
    Enable or disable baseband (MMC/MNC) widget.

### `diskIO`

<img align="right" src="./doc/assets/ic_diskIO_active_black.svg" alt="..."></img>

-   **Type:** `Boolean`
-   **Default:** `true`
-   **Compatibility:** `PaaS`, `SaaS`
-   **Details:**
    Enables or disables the diskIO widget. This widget can be used to modify Disk IO (throttling) of the Android virtual device.

### `gamepad`

-   **Type:** `Boolean`
-   **Default:** `true`
-   **Compatibility:** `SaaS`, `PaaS`
-   **Details:**
    Enable or disable gamepad support & widget

### `biometrics`

-   **Type:** `Boolean`
-   **Default:** `true`
-   **Compatibility:** `SaaS`, `PaaS`
-   **Details:**
    Enable or disable fingerprints widget. This widget can be used to manage fingerprint reading requests. Available for Android 9 and above

### `translateHomeKey`

-   **Type:** `Boolean`
-   **Default:** `false`
-   **Compatibility:** `PaaS`
-   **Details:**
    Translate home key to `META` + `ENTER`

### `connectionFailedURL`

-   **Type:** `String`
-   **Default:** `undefined`
-   **Compatibility:** `SaaS`, `PaaS`
-   **Details:**
    Redirection page in case of connection error.

### `giveFeedbackLink`

-   **Type:** `String`
-   **Default:** `giveFeedbackLink`
-   **Compatibility:** `SaaS`, `PaaS`
-   **Details:**
    Set url for feedback page.

## Contributing

Read through our [contributing guidelines](https://github.com/Genymobile/genymotion-device-web-player/blob/main/CONTRIBUTING.md) to learn about our submission process, coding rules and more.
