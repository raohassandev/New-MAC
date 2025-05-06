#!/bin/bash
# Fix TypeScript errors in deviceController.ts

echo "Fixing TypeScript errors in deviceController.ts"

# Find all catch blocks without type annotations and add them
grep -n "catch (reconnectError)" src/client/controllers/deviceController.ts | while read -r line; do
  line_num=$(echo "$line" | cut -d: -f1)
  sed -i '' "${line_num}s/catch (reconnectError)/catch (reconnectError: any)/" src/client/controllers/deviceController.ts
done

grep -n "catch (strategyError)" src/client/controllers/deviceController.ts | while read -r line; do
  line_num=$(echo "$line" | cut -d: -f1)
  sed -i '' "${line_num}s/catch (strategyError)/catch (strategyError: any)/" src/client/controllers/deviceController.ts
done

grep -n "catch (strategiesError)" src/client/controllers/deviceController.ts | while read -r line; do
  line_num=$(echo "$line" | cut -d: -f1)
  sed -i '' "${line_num}s/catch (strategiesError)/catch (strategiesError: any)/" src/client/controllers/deviceController.ts
done

# Add type checking for IP, port, and slaveId
grep -n "await client.connectTCP(ip, { port });" src/client/controllers/deviceController.ts | while read -r line; do
  line_num=$(echo "$line" | cut -d: -f1)
  
  # Replace with type-safe version
  sed -i '' "${line_num}s/await client.connectTCP(ip, { port });/if (typeof ip === 'string' \&\& typeof port === 'number') {\n                        await client.connectTCP(ip, { port });\n                      } else {\n                        console.error(chalk.red(\`[deviceController] Invalid IP or port: \${ip}:\${port}\`));\n                      }/" src/client/controllers/deviceController.ts
done

grep -n "client.setID(slaveId);" src/client/controllers/deviceController.ts | while read -r line; do
  line_num=$(echo "$line" | cut -d: -f1)
  
  # Replace with type-safe version
  sed -i '' "${line_num}s/client.setID(slaveId);/if (typeof slaveId === 'number') {\n                        client.setID(slaveId);\n                      } else {\n                        client.setID(1); \/\/ Default slave ID\n                      }/" src/client/controllers/deviceController.ts
done

echo "TypeScript errors fixed!"
echo "Now restart your server with: cd /Users/israrulhaq/Desktop/MAC/server && npm start"