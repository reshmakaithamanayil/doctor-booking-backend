'use strict';

// Writes the OpenAPI spec to docs/openapi.json so the API docs can be viewed
// without running the server (e.g. paste into https://editor.swagger.io).
const fs = require('fs');
const path = require('path');
const spec = require('../src/docs/swagger');

const out = path.join(__dirname, '..', 'docs', 'openapi.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(spec, null, 2)}\n`);
// eslint-disable-next-line no-console
console.log(`OpenAPI spec written to ${path.relative(process.cwd(), out)}`);
