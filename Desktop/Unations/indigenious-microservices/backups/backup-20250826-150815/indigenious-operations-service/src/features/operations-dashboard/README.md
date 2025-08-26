# Operations Dashboard

Real-time monitoring and system health visualization for the Indigenous Procurement Platform.

## Overview

The Operations Dashboard provides comprehensive monitoring of:
- System health (CPU, memory, disk)
- API performance and usage
- Security events and threats
- Business metrics and activity
- Real-time alerts and notifications

## Features

### Real-time Monitoring
- **WebSocket Connection**: Live updates every 5 seconds
- **Auto-refresh**: Configurable automatic data refresh
- **Time Range Selection**: View data for last hour, day, or week
- **Multi-tab Interface**: Organized views for different metrics

### System Metrics
- CPU usage and load average
- Memory utilization
- Disk space usage
- Process information
- Network traffic

### API Monitoring
- Requests per minute
- Average response time
- Error rates
- Top endpoints
- Status code distribution

### Security Monitoring
- Security score (0-100)
- Threat detection
- Rate limit violations
- Authentication failures
- Active sessions

### Business Intelligence
- Active RFQs
- Daily bid submissions
- Contract awards
- Platform revenue
- User registrations

### Alert System
- Real-time alert notifications
- Severity levels (critical, high, medium, low)
- Alert history
- Clear all functionality

## Architecture

### Components

1. **MetricsCollector** (`/lib/monitoring/metrics-collector.ts`)
   - Collects system, API, security, and business metrics
   - Stores data in Redis for time-series queries
   - Emits events for real-time updates
   - Provides historical data aggregation

2. **WebSocketServer** (`/lib/monitoring/websocket-server.ts`)
   - Handles real-time connections
   - Authentication and authorization
   - Channel subscriptions
   - Command execution (admin only)

3. **OperationsDashboard** (`/features/operations-dashboard/components/OperationsDashboard.tsx`)
   - React component with real-time updates
   - Responsive glassmorphism UI
   - Interactive charts and visualizations
   - Alert management

4. **Metrics API** (`/app/api/v1/metrics/route.ts`)
   - REST endpoint for metrics data
   - Prometheus format support
   - Custom metric recording

## Usage

### Accessing the Dashboard

```typescript
// Only admin and operator roles can access
const canAccess = ['admin', 'operator'].includes(user.role)
```

### WebSocket Connection

```typescript
const socket = io(WS_URL, {
  auth: { token: user.token },
  transports: ['websocket', 'polling']
})

// Subscribe to channels
socket.emit('subscribe', 'system')
socket.emit('subscribe', 'api')
socket.emit('subscribe', 'security')

// Listen for updates
socket.on('metrics:system', (data) => {
  // Handle system metrics
})

socket.on('alert', (alert) => {
  // Handle new alert
})
```

### Recording Custom Metrics

```typescript
// API metrics
await metricsCollector.recordAPIMetric({
  endpoint: '/api/v1/rfqs',
  method: 'GET',
  statusCode: 200,
  responseTime: 125,
  timestamp: new Date()
})

// Security metrics
await metricsCollector.recordSecurityMetric({
  type: 'threat_detected',
  severity: 'high',
  source: '192.168.1.100',
  details: { type: 'sql_injection' },
  timestamp: new Date()
})

// Business metrics
await metricsCollector.recordBusinessMetric({
  type: 'contract_awarded',
  entityId: 'contract-123',
  value: 50000,
  metadata: { rfqId: 'rfq-456' },
  timestamp: new Date()
})
```

### Admin Commands

```typescript
// Clear all alerts
socket.emit('command', { action: 'clear_alerts' })

// Reset metrics
socket.emit('command', { 
  action: 'reset_metrics',
  params: { type: 'api' } // optional
})

// Force refresh
socket.emit('command', { action: 'force_refresh' })
```

## Integration

### Middleware Integration

The metrics system integrates with the middleware to automatically track API performance:

```typescript
// In middleware.ts
const startTime = Date.now()

// Process request...

const responseTime = Date.now() - startTime
await metricsCollector.recordAPIMetric({
  endpoint: request.nextUrl.pathname,
  method: request.method,
  statusCode: response.status,
  responseTime,
  userId: session?.user?.id,
  timestamp: new Date()
})
```

### Prometheus Integration

Export metrics in Prometheus format for external monitoring:

```bash
GET /api/v1/metrics?format=prometheus

# Output:
# HELP cpu_usage_percent CPU usage percentage
# TYPE cpu_usage_percent gauge
cpu_usage_percent 45.2
```

### Grafana Integration

1. Add Prometheus data source pointing to `/api/v1/metrics?format=prometheus`
2. Import dashboard templates from `/monitoring/grafana/`
3. Configure alerts and notifications

## Security

- **Authentication Required**: JWT token validation
- **Role-based Access**: Only admin and operator roles
- **Channel Permissions**: Security channel restricted to admins
- **Rate Limiting**: WebSocket connections are rate-limited
- **Audit Logging**: All dashboard access is logged

## Performance

- **Efficient Data Storage**: Redis sorted sets for time-series data
- **Data Retention**: 30 days for historical data
- **Aggregation**: Pre-computed aggregates for common queries
- **WebSocket Optimization**: Binary frames for large data
- **Client-side Caching**: Local state management

## Troubleshooting

### Connection Issues
- Check WebSocket URL configuration
- Verify authentication token
- Check firewall/proxy settings

### Missing Data
- Ensure metrics collector is running
- Check Redis connection
- Verify data retention settings

### Performance Issues
- Reduce update frequency
- Enable data aggregation
- Limit historical data range

## Future Enhancements

1. **Machine Learning**
   - Anomaly detection
   - Predictive analytics
   - Capacity planning

2. **Advanced Visualizations**
   - Heat maps
   - Network topology
   - Geographic distribution

3. **Mobile App**
   - Native dashboard app
   - Push notifications
   - Offline support

4. **Integrations**
   - PagerDuty alerts
   - Slack notifications
   - Email reports