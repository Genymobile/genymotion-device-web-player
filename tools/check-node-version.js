const requiredVersion = 20;
const currentVersion = process.version;
const currentMajor = parseInt(currentVersion.replace(/^v/, '').split('.')[0], 10);

if (currentMajor < requiredVersion) {
    console.error(`
\x1b[31m[ERROR] Node.js version mismatch!\x1b[0m
You are using Node.js \x1b[33m${currentVersion}\x1b
[0m, but this project requires \x1b[32mNode.js ${requiredVersion} or higher\x1b[0m for development and compilation.

Please update your Node.js version or use \x1b[36mnvm\x1b[0m to switch to the correct version:
    \x1b[36mnvm use\x1b[0m
`);
    process.exit(1);
}
