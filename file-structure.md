# MAC Project Directory Structure

```
/MAC
├── .git/                        # Git repository
├── .gitignore                   # Git ignore patterns
├── CONSTANTS/                   # Shared constants
│   ├── backend/                 # Backend-specific constants
│   ├── common/                  # Shared constants between frontend and backend
│   └── frontend/                # Frontend-specific constants
├── client/                      # Frontend application
│   ├── dist/                    # Built/minified frontend code
│   ├── node_modules/            # Frontend dependencies
│   ├── public/                  # Static assets
│   ├── src/                     # Frontend source code
│   │   ├── api/                 # API client, endpoints
│   │   ├── components/          # UI components
│   │   ├── context/             # React context providers
│   │   ├── hooks/               # Custom React hooks
│   │   ├── layouts/             # Page layouts
│   │   ├── pages/               # Page components
│   │   ├── redux/               # Redux state management
│   │   │   ├── features/        # Feature slices (auth, devices, users)
│   │   │   ├── reducers/        # Global reducers
│   │   │   ├── rootReducer.ts   # Combined root reducer
│   │   │   ├── store.ts         # Redux store configuration
│   │   │   └── types.ts         # Redux types
│   │   ├── services/            # Service layer for data operations
│   │   ├── types/               # TypeScript type definitions
│   │   └── utils/               # Utility functions
│   ├── package.json             # Frontend dependencies and scripts
│   ├── tsconfig.json            # TypeScript configuration for frontend
│   └── vite.config.ts           # Vite build configuration
├── docs/                        # Documentation files
├── documentation.md             # Main documentation
├── node_modules/                # Root dependencies
├── package.json                 # Root package configuration
├── push-script.sh               # Script for git pushing
├── README.md                    # Project readme
├── scripts/                     # Utility scripts
│   ├── macsys.sh                # System utility script
│   ├── setup.js                 # Setup script
│   └── test.sh                  # Test runner script
├── server/                      # Backend application
│   ├── dist/                    # Built/transpiled backend code
│   ├── node_modules/            # Backend dependencies
│   ├── scripts/                 # Backend-specific scripts
│   ├── src/                     # Backend source code
│   │   ├── amx/                 # AMX database models and controllers 
│   │   │   ├── controllers/     # AMX controllers
│   │   │   ├── models/          # AMX data models
│   │   │   └── routes/          # AMX API routes
│   │   ├── client/              # Client database models and controllers
│   │   │   ├── controllers/     # Client controllers
│   │   │   ├── models/          # Client data models
│   │   │   ├── routes/          # Client API routes
│   │   │   └── services/        # Client services
│   │   ├── communication/       # Device communication protocols
│   │   │   ├── config/          # Protocol configuration
│   │   │   ├── core/            # Core interfaces and types
│   │   │   ├── protocols/       # Protocol implementations (Modbus)
│   │   │   ├── services/        # Communication services
│   │   │   └── utils/           # Communication utilities
│   │   ├── middleware/          # Express middleware
│   │   ├── index.ts             # Backend entry point
│   │   └── server.ts            # Express server configuration
│   ├── package.json             # Backend dependencies and scripts
│   └── tsconfig.json            # TypeScript configuration for backend
├── tsconfig.json                # Root TypeScript configuration
└── yarn.lock                    # Yarn lock file for dependencies
```

## Key Components

### Frontend (client/)

- **React application** built with Vite and TypeScript
- Uses Redux for global state management
- React hooks and context for component-level state
- UI components with extensive modularization
- API client for backend communication

### Backend (server/)

- **Express server** built with TypeScript
- Communication protocols including Modbus TCP/RTU
- Dual database connections:
  - **AMX database**: Stores device drivers and templates
  - **Client database**: Stores devices, users, and application data
- RESTful API endpoints for frontend communication

### Shared Resources (CONSTANTS/)

- Constants shared between frontend and backend
- Ensures consistency in data structures and configuration

## Database Structure

### AMX Database

Contains device driver templates and configuration:
- DeviceDrivers
- DeviceTypes
- Templates

### Client Database

Contains application data:
- Devices
- Users
- Profiles
- Alerts
- HistoricalData

## Communication Protocols

The system supports multiple device communication protocols:
- Modbus TCP
- Modbus RTU

## Running the Application

1. Install dependencies:
   ```
   yarn install
   ```

2. Start the backend:
   ```
   cd server
   yarn dev
   ```

3. Start the frontend:
   ```
   cd client
   yarn dev
   ```

## Development Workflow

1. Run the dev environment for both frontend and backend
2. Make changes to code
3. Use the provided scripts for testing and deployment