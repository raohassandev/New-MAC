# MacSys - Modbus Device Management System

MacSys is a comprehensive web application for managing and monitoring Modbus devices. It provides a modern, responsive interface for device configuration, monitoring, and control.

## Project Structure

The project is organized as a monorepo with two main components:
- **Backend**: Express.js server with MongoDB for data storage
- **Client**: React application using TypeScript, Vite, and Tailwind CSS

## Features

- Device discovery and management
- Real-time monitoring of device parameters
- Cooling profiles and scheduling
- User management with role-based access control
- Dashboard with visualizations
- Modbus communications

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- MongoDB (local or remote)
- Yarn or npm

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/macsys.git
cd macsys
```

2. Install dependencies
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

3. Environment Setup
   - Create a `.env` file in the root directory (see `.env.example`)
   - Configure MongoDB connection URI

4. Start development servers
```bash
# Start both backend and frontend
npm run start

# Or start individually
npm run server     # Backend only
npm run client     # Frontend only
```

5. The application will be available at:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3333/api

## Deployment

To build for production:

```bash
# Build frontend
cd client
npm run build

# Start production server
cd ..
npm run start
```

## License

MIT