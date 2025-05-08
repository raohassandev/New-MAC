# MACSYS Monitoring System

This document explains the monitoring features implemented in the MACSYS server to help track API usage, errors, and performance metrics.

## Features

The monitoring system includes the following features:

1. **Rate Limiting**: Prevents API abuse by limiting request frequency
2. **Request Logging**: Records all API requests with detailed information
3. **Error Tracking**: Captures and logs all API errors with context
4. **Performance Metrics**: Tracks response times and success rates
5. **Real-time Monitoring**: Provides a dashboard for viewing system status
6. **Log Viewer**: Web interface for reviewing log files

## How to Use

### Starting the Server with Monitoring

Use one of the following methods to start the server with monitoring enabled:

```bash
# Using npm script
npm run dev:monitoring

# Using the debug script
./debug.sh
```

### Accessing the Monitoring Dashboard

Once the server is running, you can access the monitoring dashboard at:

```
http://localhost:3333/monitoring
```

This dashboard shows:
- Total request counts
- Success/failure rates
- Recent requests with their status
- Error logs with details
- Performance metrics

### Viewing Logs

To view server logs in real-time, access the log viewer at:

```
http://localhost:3333/monitoring/logs-viewer
```

This interface allows you to:
- Filter logs by type (Modbus, API, Access)
- Filter by log level (Error, Warning, Info, Debug)
- Search for specific text
- Clear the log display

### API Endpoints

The monitoring system provides the following API endpoints:

- `GET /monitoring` - Main monitoring dashboard
- `GET /monitoring/stats` - Get current statistics as JSON
- `POST /monitoring/stats/reset` - Reset statistics counters
- `GET /monitoring/logs?type=modbus|api|access` - Get logs
- `GET /monitoring/logs-viewer` - Web UI for viewing logs

## Rate Limiting

The server implements two types of rate limiting:

1. **Global rate limiting**: 300 requests per 15 minutes per IP
2. **Device read limiting**: 5 requests per 10 seconds per IP

These limits help prevent:
- Server overload from excessive polling
- API abuse from malicious clients
- Network congestion from too frequent device reads

## Log Files

Log files are stored in the following locations:

- **Modbus logs**: `logs/modbus/modbus.log` and `logs/modbus/error.log`
- **API logs**: `logs/api/api.log` and `logs/api/error.log`
- **Access logs**: `logs/access.log`

These logs are automatically rotated when they reach 5MB in size, keeping the last 5 files.

## Customization

You can customize the monitoring system by modifying:

- **Log levels**: Edit `src/config/logging.ts`
- **Rate limits**: Modify the rate limit settings in `src/server.ts`
- **Dashboard UI**: Edit the HTML in `src/client/routes/monitoringDashboard.html`

## Troubleshooting

If you encounter issues with the monitoring system:

1. **Logs not appearing**: Ensure the log directories exist and are writable
2. **Dashboard not loading**: Check server console for any route-related errors
3. **Missing metrics**: Verify that API requests have the correct paths and formats

For persistent issues, check the server logs for detailed error messages.