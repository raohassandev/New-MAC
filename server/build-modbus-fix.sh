#\!/bin/bash
# Build all files except those with known TypeScript errors
tsc --skipLibCheck src/client/utils/modbusHelper.ts src/client/services/device.service.ts src/client/utils/test-modbus-parser.ts src/index.ts src/server.ts --outDir dist/ --esModuleInterop
echo "Build completed for modbus parsing functionality"

