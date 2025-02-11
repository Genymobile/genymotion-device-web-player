'use strict';

// ref to player for accessing API (like disconnect)
let playerInstance = null;
// uuid of the launched instance
let instanceUuid = null;
let apiToken = null;
// JWT token to authenticate to the ws
let jwtToken = null;

// Advanced settings
// Endpoint used to fetch recipes list, generate JWT token, start/stop instances, ...
const defaultBaseUrlToFetch = 'https://api.geny.io/cloud';
let baseUrlToFetch = localStorage.getItem('baseUrlToFetch') ?? defaultBaseUrlToFetch;
const requestInit = {
    headers: {
        'Content-Type': 'application/json',
        'x-api-token': apiToken,
    },
};

//Theme
let themeSelected = localStorage.getItem('themeSelected') ?? 'dark';

// get apiToken from HTML input and fetch recipes
const getApiToken = async () => {
    apiToken = document.querySelector('#apiToken').value;
    requestInit.headers['x-api-token'] = apiToken;
    if (apiToken) {
        fetchRecipes();
    }
};

// get jwt token
const getJWTToken = async (instanceUuid) => {
    try {
        const response = await fetch(baseUrlToFetch + `/v1/instances/access-token`, {
            ...requestInit,
            method: 'POST',
            body: JSON.stringify({
                instance_uuid: instanceUuid,
            }),
        });

        if (response.status !== 200) {
            throw new Error('api token not found');
        }
        const {access_token} = await response.json();

        jwtToken = access_token;
    } catch (error) {
        jwtToken = document.querySelector('#apiToken').value;
    }
};

// start an instance when #start button is clicked
const start = async (recipeUuid) => {
    try {
        // start an isntance and get the instance information
        const recipe = await startInstance(recipeUuid);

        // if advanced settings are set to save instance history, save the instance uuid in the local storage
        if (localStorage.getItem('hasSaveInstanceHistory') === 'true') {
            const instanceHistory = JSON.parse(localStorage.getItem('instanceHistory')) ?? [];
            instanceHistory.push(recipe.webrtc_url);
            localStorage.setItem('instanceHistory', JSON.stringify(instanceHistory));
            generateInstanceHistoryList();
        }

        // init player
        const webrtcAddress = recipe.webrtc_url;
        initPlayer(webrtcAddress);
    } catch (error) {
        snackbar(error);
    }
};

// start an instance for a recipe uuid
const startInstance = async (recipeUuid) => {
    const data = {
        instance_name: recipeUuid + 'instance',
        rename_on_conflict: true,
        stop_when_inactive: true,
    };

    const response = await fetch(baseUrlToFetch + `/v1/recipes/${recipeUuid}/start-disposable`, {
        ...requestInit,
        method: 'POST',
        body: JSON.stringify(data),
    });

    const recipe = await response.json();

    if (response.status !== 201) {
        throw recipe;
    }

    // setup width and height of player
    document.querySelector('#player').style.width = `${recipe.hardware_profile.width}px`;
    document.querySelector('#player').style.height = `${recipe.hardware_profile.height}px`;

    instanceUuid = recipe.uuid;

    await getJWTToken(instanceUuid);

    return recipe;
};

// initPlayer
const initPlayer = (webrtcAddress) => {
    // clean up previous player if it exist, in order to avoid memories leaks
    if (playerInstance) {
        playerInstance.VM_communication.disconnect();
        playerInstance = null;
    }

    const options = {
        token: jwtToken || apiToken,
        showPhoneBorder: true,
        streamBitrate: true,
        keyboardMapping: false,
        toolbarOrder: [
            'ButtonsEvents_VOLUME_UP',
            'ButtonsEvents_VOLUME_DOWN',
            'ButtonsEvents_ROTATE',
            'separator',
            'StreamResolution',
            'Battery',
            'FingerPrint',
            'GPS',
            'Camera',
            'Phone',
            'Network',
            'IOThrottling',
            'separator',
            'ButtonsEvents_RECENT_APP',
            'ButtonsEvents_HOMEPAGE',
            'ButtonsEvents_BACK',
            'ButtonsEvents_POWER',
            'separator',
            'unordered',
        ],
    };

    const {DeviceRendererFactory} = window.genyDeviceWebPlayer;
    const DRF = new DeviceRendererFactory();
    playerInstance = DRF.setupRenderer(document.querySelector('#fe-player'), webrtcAddress, options);

    // Attach return of player's instantiation to window to use it in the console
    window.instance = playerInstance;
};

// stop the launched instance
const stopInstance = async () => {
    try {
        const response = await fetch(baseUrlToFetch + `/v1/instances/${instanceUuid}/stop-disposable`, {
            ...requestInit,
            method: 'POST',
        });
        await response.json();
    } catch (error) {
        alert(error);
    } finally {
        instanceUuid = null;
        // remove player
        playerInstance.VM_communication.disconnect();
        document.querySelector('#fe-player').removeChild(document.querySelector('#fe-player').firstChild);
        playerInstance = null;
    }
};

// Fetch recipe and add them to the select
const fetchRecipes = async () => {
    try {
        const response = await fetch(baseUrlToFetch + `/v3/recipes/?arch=x86_64&arch=x86&arch=arm64&limit=1000`, {
            ...requestInit,
            method: 'GET',
        });
        const recipesResult = await response.json();

        if (response.status !== 200) {
            alert(recipesResult.message);
            return;
        }

        const selectElement = document.querySelector('#listRecipes');
        // Empty the select before adding new options.
        selectElement.innerHTML = '';
        const placeholderOption = document.createElement('option');
        placeholderOption.textContent = 'Select a recipe';
        placeholderOption.value = '';
        placeholderOption.disabled = true;
        placeholderOption.selected = true;
        selectElement.add(placeholderOption, selectElement.firstChild);
        const recipes = recipesResult.results;

        for (let i = 0; i < recipes.length; i++) {
            const recipe = recipes[i];
            const optionElement = document.createElement('option');
            optionElement.value = recipe.uuid;
            optionElement.textContent = recipe.name;
            selectElement.appendChild(optionElement);
        }
    } catch (error) {
        alert(error);
    }
};

// connect to an existing instance through an instance Uuid or an instance ws address
const connectInstance = async (wsAddress) => {
    if (wsAddress.includes('wss://')) {
        initPlayer(wsAddress);
        return;
    }

    // in this case wsAdress is an instance uuid
    const response = await fetch(baseUrlToFetch + `/v1/instances/${wsAddress}`, {
        ...requestInit,
        method: 'GET',
    });
    const instance = await response.json();
    instanceUuid = instance.uuid;
    await getJWTToken(instanceUuid);
    initPlayer(instance.publicWebrtcUrl);
};

const snackbar = (error) => {
    const snack = document.querySelector('#snackbar');
    snack.textContent = error.code ?? error.message ?? error;
    snack.classList.add('show');

    setTimeout(() => {
        snack.classList.remove('show');
    }, 3000);
};

const generateInstanceHistoryList = () => {
    const instanceHistory = JSON.parse(localStorage.getItem('instanceHistory')) ?? [];
    const datalist = document.querySelector('#instances-history');
    datalist.innerHTML = '';
    instanceHistory.forEach((instance) => {
        const option = document.createElement('option');
        option.value = instance;
        datalist.appendChild(option);
    });
};

document.addEventListener(
    'DOMContentLoaded',
    () => {
        // Theme
        document.querySelector('#themeCtrl').textContent = themeSelected === 'light' ? '🌑' : '🌞';
        if (themeSelected === 'light') {
            document.body.classList.add('light');
        }

        document.querySelector('#themeCtrl').addEventListener('click', () => {
            if (themeSelected === 'light') {
                themeSelected = 'dark';
                document.body.classList.remove('light');
                document.querySelector('#themeCtrl').textContent = '🌞';
                localStorage.setItem('themeSelected', 'dark');
            } else {
                themeSelected = 'light';
                document.body.classList.add('light');
                document.querySelector('#themeCtrl').textContent = '🌑';
                localStorage.setItem('themeSelected', 'light');
            }
        });

        // get apiToken and JWT token + fetch the recipes list on load if input is filled
        if (localStorage.getItem('hasSaveToken') === 'true') {
            document.querySelector('#apiToken').value = localStorage.getItem('apiToken');
        }
        getApiToken();
        // get apiToken when user leave the input field
        document.querySelector('#apiToken').addEventListener('focusout', () => {
            if (localStorage.getItem('hasSaveToken') === 'true') {
                localStorage.setItem('apiToken', document.querySelector('#apiToken').value);
            }
            getApiToken();
        });

        // change recipeUuid when the user select a recipe
        document.querySelector('#listRecipes').addEventListener('change', function () {
            const selectedValue = document.querySelector('#listRecipes').value;
            document.querySelector('#recipeUuid').value = selectedValue;
        });

        // binding start button event
        document.querySelector('#start').addEventListener('click', () => {
            const recipeUuid = document.querySelector('#recipeUuid').value;
            start(recipeUuid);
        });

        // binding stop button event
        document.querySelector('#stop').addEventListener('click', () => {
            stopInstance();
        });

        // binding connect button event
        document.querySelector('#connectExistingInstance').addEventListener('click', async () => {
            const wsAddress = document.querySelector('#wsAddress').value;
            if (!wsAddress) {
                alert('please enter an instance UUID or an instance ws address');
                return;
            }
            await connectInstance(wsAddress);
        });

        // binding advanced settings
        // fill ui with localstorage values if they exist
        document.querySelector('#saveToken').checked = localStorage.getItem('hasSaveToken') === 'true';
        document.querySelector('#apiToken').value = localStorage.getItem('apiToken');
        document.querySelector('#saveInstanceHistory').checked =
            localStorage.getItem('hasSaveInstanceHistory') === 'true';
        generateInstanceHistoryList();
        document.querySelector('#apiBaseUrl').value = baseUrlToFetch;

        // save values on change
        document.querySelector('#saveToken').addEventListener('click', (event) => {
            localStorage.setItem('hasSaveToken', event.target.checked);
            if (event.target.checked) {
                localStorage.setItem('apiToken', document.querySelector('#apiToken').value);
            } else {
                localStorage.removeItem('apiToken');
            }
        });
        document.querySelector('#saveInstanceHistory').addEventListener('click', (event) => {
            localStorage.setItem('hasSaveInstanceHistory', event.target.checked);
            if (event.target.checked) {
                localStorage.setItem('instanceHistory', JSON.stringify([]));
            } else {
                localStorage.removeItem('instanceHistory');
            }
        });
        document.querySelector('#saveAPIBaseUrl').addEventListener('click', () => {
            if (document.querySelector('#apiBaseUrl').value.trim().length) {
                localStorage.setItem('baseUrlToFetch', document.querySelector('#apiBaseUrl').value);
                baseUrlToFetch = document.querySelector('#apiBaseUrl').value;
            } else {
                localStorage.setItem('baseUrlToFetch', defaultBaseUrlToFetch);
                baseUrlToFetch = defaultBaseUrlToFetch;
            }
        });
    },
    {once: true},
);
