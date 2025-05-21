#\!/bin/bash
# Copy the TypeScript file to a JavaScript file for direct testing
cp src/client/utils/test-modbus-parser.ts dist/client/utils/test-modbus-parser.js
# Replace import statements with require
sed -i "s/import {/const {/g" dist/client/utils/test-modbus-parser.js
sed -i "s/} from ..\/services\/device.service;/} = require(\..\/services\/device.service);/g" dist/client/utils/test-modbus-parser.js
# Run the test
node dist/client/utils/test-modbus-parser.js

