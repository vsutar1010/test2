'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(path.join(output, 'public'), { recursive: true });
fs.cpSync(path.join(root, 'public'), path.join(output, 'public'), { recursive: true });
fs.copyFileSync(path.join(root, 'server.js'), path.join(output, 'server.js'));
fs.copyFileSync(path.join(root, 'package.json'), path.join(output, 'package.json'));
console.log(`Built deployable application in ${output}`);
