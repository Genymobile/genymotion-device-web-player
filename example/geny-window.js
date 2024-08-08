'use strict';

// ref to player for accessing API (like disconnect)
let playerInstance = null;
// uuid of the launched instance
let instanceUuid = null;
let apiToken = null;
// JWT token to authenticate to the ws
let jwtToken = null;

// Endpoint used to fetch recipes list, generate JWT token, start/stop instances, ...
const baseUrlToFetch = 'https://api.geny.io/cloud';
const requestInit = {
    headers: {
        'Content-Type': 'application/json',
        'x-api-token': apiToken,
    },
};

// get apiToken from HTML input and fetch recipes
const getApiToken = async () => {
    apiToken = document.querySelector('#apiToken').value;
    requestInit.headers['x-api-token'] = apiToken;
    if (apiToken) {
        fetchRecipes();
    }
};

// get jwt token
const getJWTToken = async () => {
    try {
        const response = await fetch(baseUrlToFetch + `/v1/instances/access-token`, {
            ...requestInit,
            method: 'POST',
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

    await getJWTToken();

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
        template: 'renderer_partial',
        token: jwtToken || apiToken,
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
        const response = await fetch(baseUrlToFetch + `/v1/recipes?limit=1000`, {
            ...requestInit,
            method: 'GET',
        });
        const recipes = await response.json();

        if (response.status !== 200) {
            alert(recipes.message);
            return;
        }

        const selectElement = document.querySelector('#listRecipes');
        const placeholderOption = document.createElement('option');
        placeholderOption.textContent = 'Select a recipe';
        placeholderOption.value = '';
        placeholderOption.disabled = true;
        placeholderOption.selected = true;
        selectElement.add(placeholderOption, selectElement.firstChild);

        for (const recipeType in recipes) {
            addOptionsToGroup(recipeType, recipes[recipeType]);
        }
    } catch (error) {
        alert(error);
    }
};

const addOptionsToGroup = (recipeType, recipes) => {
    const selectElement = document.querySelector('#listRecipes');

    const optgroup = document.createElement('optgroup');
    optgroup.label = recipeType;

    recipes.forEach((recipe) => {
        const optionElement = document.createElement('option');
        optionElement.value = recipe.uuid;
        optionElement.textContent = recipe.name;
        optgroup.appendChild(optionElement);
    });

    selectElement.appendChild(optgroup);
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
    await getJWTToken();
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

document.addEventListener(
    'DOMContentLoaded',
    () => {
        // get apiToken and JWT token + fetch the recipes list on load if input is filled
        getApiToken();
        // get apiToken when user leave the input field
        document.querySelector('#apiToken').addEventListener('focusout', () => {
            getApiToken();
        });

        // change recipeUuid when the user select a recipe
        document.querySelector('#listRecipes').addEventListener('change', function (event) {
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
    },
    {once: true},
);
