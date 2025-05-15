# MACSYS - Modbus Device Management System

MACSYS is a comprehensive solution for managing and monitoring industrial devices that communicate via the Modbus protocol.

## Recent Improvements

### Modbus Communication Enhancements

- Improved consecutive register reading for better efficiency and reliability
- Enhanced support for multi-register data types (FLOAT32, INT32, UINT32)
- Added robust retry logic with configurable parameters per device
- Fixed byte ordering issues for different device manufacturers
- Added detailed logging for easier troubleshooting
- Improved type safety and error handling throughout the codebase
- Added coil register control capabilities

## Documentation

See the following files for detailed documentation:

- `server/src/client/utils/modbus-parsing-guide.md` - Guide to Modbus value parsing
- `server/src/client/utils/test-modbus-parser.ts` - Test script for Modbus parsing functions

## API Endpoints

The system provides several API endpoints for device management and control:

### Main API Categories
- **Authentication** - User registration, login, and management
- **Device Management** - CRUD operations for devices
- **Device Control** - Register write operations and parameter control
- **Coil Control** - Read and write operations for coil registers (new)
- **Data Services**
  - Polling - Start/stop device data collection
  - Realtime Data - Current device values
  - Historical Data
    - `/api/devices/:id/data/historical` - Get device historical data
    - `/api/devices/:id/data/historical/parameters` - Get available parameters
    - `/api/devices/:id/data/historical/timerange` - Get data time ranges
    - `/api/devices/:id/data/historical` (DELETE) - Remove historical data
- **System-wide Auto-polling** - Manage automatic polling across all devices
- **System Monitoring** - Performance metrics and logs

For detailed API documentation, see the server README or run the API with the `/api-docs` endpoint enabled.

## Project Structure

The project is organized as a monorepo with separate client and server packages:

```
/
├── client/           # React frontend application
├── server/           # Node.js backend API
├── docs/             # Project documentation
├── scripts/          # Utility scripts
└── Project Images/   # Screenshots and diagrams
```

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- MongoDB (v4.4 or later)
- Yarn or npm

### Installation

1. Clone the repository
2. Install all dependencies:

```bash
npm run install:all
```

This will install dependencies for the root project, client, and server.

### Development

To run both client and server in development mode:

```bash
npm run dev
```

To run only the server:

```bash
npm run dev:server
```

To run only the client:

```bash
npm run dev:client
```

### Testing Modbus Communication

To test the Modbus parser functionality:

```bash
cd server
npx ts-node src/client/utils/test-modbus-parser.ts
```

### Building for Production

To build both client and server:

```bash
npm run build
```

### Running in Production

To start the server in production mode:

```bash
npm start
```

## Environment Variables

Copy the `.env.example` file to `.env` in both the root and server directories, and adjust the values as needed:

- `PORT`: The port for the server (default: 3333)
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret for signing JWT tokens
- `CLIENT_URL`: URL for the client application (for CORS)

## License

This project is licensed under the MIT License - see the LICENSE file for details.
