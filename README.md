# MACSYS - Modbus Device Management System

MACSYS is a comprehensive solution for managing and monitoring industrial devices that communicate via the Modbus protocol.

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

This project is licensed under the MIT License - see the LICENSE file for details.# New-MAC
# New-MAC
