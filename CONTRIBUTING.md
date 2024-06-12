# How to contribute to Genymotion device web player

Welcome and thank you for considering contributing to Genymotion device web player!

Following these guidelines helps to communicate that you respect the time of the developers managing and developing this
open source project. In return, they should reciprocate that respect in addressing your issue, assessing changes, and
helping you finalize your pull requests.

## Ground Rules

-   Be welcoming to newcomers and encourage diverse new contributors from all backgrounds. See our [Code of Conduct](https://github.com/Genymobile/genymotion-device-web-player/blob/main/CODE_OF_CONDUCT.md).
-   Each pull request should implement **ONE** feature or bugfix. If you want to add or fix more than one thing, submit more than one pull request.
-   Do not commit changes to files that are irrelevant to your feature or bugfix.
-   Do not add unnecessary dependencies.

## Getting started

### Discuss about ideas

If you want to add a feature, it's often best to talk about it before starting to work on it and submitting a pull
request. It's not mandatory at all, but feel free to open an issue to present your idea.

### Developement

To start working on the Genymotion device web player, all you need if an HTML page to instanciate a player from your
local copy of this repository.
Build the player in dev mode:

```sh
yarn build:dev
```

And import your local file directly

```html
<link rel="stylesheet" href="file:///[...]/genymotion-device-web-player/dist/css/gm-player.min.css" />
<script src="file:///[...]/genymotion-device-web-player/dist/js/gm-player.min.js"></script>
```

Don't forget to re-run the build command each time you make a modification to the code.

#### Running tests

```sh
# run tests
yarn test

# validate coding style
yarn lint
yarn checkstyle
```

### How to submit a contribution

The general process to submit a contribution is as follow:

1. Create your own fork of the code
2. Do the changes in your fork
3. Open a pull request. Make sure to fill the [pull request description](https://github.com/Genymobile/genymotion-device-web-player/blob/main/.github/PULL_REQUEST_TEMPLATE.md) properly.
