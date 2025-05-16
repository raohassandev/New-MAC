# Aggregate Historical Data API

This new endpoint allows you to aggregate historical data across all devices for specific parameters.

## Endpoint

```
GET /api/devices/data/historical/aggregate
```

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| parameterName | string | Yes | - | The parameter to aggregate (e.g., "Temperature", "Energy", "Power") |
| aggregationType | string | No | "average" | Type of aggregation: "average", "sum", "min", "max", "count" |
| groupBy | string | No | "daily" | Time grouping: "hourly", "daily", "weekly", "monthly", "yearly" |
| startDate | string | No | - | Start date (ISO format: YYYY-MM-DD) |
| endDate | string | No | - | End date (ISO format: YYYY-MM-DD) |

## Examples

### 1. Daily average temperature for last 7 days
```bash
curl -X GET "http://localhost:5001/client/api/devices/data/historical/aggregate?parameterName=Temperature&aggregationType=average&groupBy=daily&startDate=2024-01-15&endDate=2024-01-22" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 2. Monthly total energy consumption
```bash
curl -X GET "http://localhost:5001/client/api/devices/data/historical/aggregate?parameterName=Energy&aggregationType=sum&groupBy=monthly&startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Hourly maximum power usage for today
```bash
curl -X GET "http://localhost:5001/client/api/devices/data/historical/aggregate?parameterName=Power&aggregationType=max&groupBy=hourly&startDate=2024-01-22&endDate=2024-01-22" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Weekly average humidity
```bash
curl -X GET "http://localhost:5001/client/api/devices/data/historical/aggregate?parameterName=Humidity&aggregationType=average&groupBy=weekly&startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 5. Yearly count of status changes
```bash
curl -X GET "http://localhost:5001/client/api/devices/data/historical/aggregate?parameterName=Status&aggregationType=count&groupBy=yearly&startDate=2023-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Response Format

```json
{
  "success": true,
  "message": "Historical data aggregated successfully",
  "parameterName": "Temperature",
  "aggregationType": "average",
  "groupBy": "daily",
  "dateRange": {
    "start": "2024-01-15",
    "end": "2024-01-22"
  },
  "data": [
    {
      "date": "2024-01-15",
      "average": 22.5,
      "deviceCount": 5,
      "totalDataPoints": 120,
      "devices": [
        {
          "deviceId": "6821fe542af1d1a3177c7fe1",
          "deviceName": "Sensor 1",
          "value": 23.1,
          "count": 24
        },
        // ... more devices
      ]
    },
    // ... more date groups
  ],
  "summary": {
    "totalDevices": 5,
    "totalDataPoints": 840,
    "dateGroups": 7
  }
}
```

## Notes

1. The endpoint aggregates data for all enabled devices by default
2. The aggregation is first done per device, then combined across all devices
3. Each date group includes details about individual device contributions
4. The `count` field shows how many data points were used for each aggregation
5. Empty date groups (with no data) are not included in the response

## Common Use Cases

1. **Energy Monitoring**: Calculate total energy consumption per month
2. **Temperature Analysis**: Find average temperature readings per day or hour
3. **Power Management**: Track maximum power usage during peak hours
4. **Equipment Usage**: Count how many times equipment status changed
5. **Environmental Monitoring**: Analyze humidity patterns over time