# PR Automation Deployment Guide

## 🚨 CRITICAL: Pre-Deployment Checklist

**DO NOT DEPLOY** until ALL items are completed:

- [ ] All security fixes implemented from `SECURITY_FIXES.md`
- [ ] Security audit completed by third party
- [ ] Legal review completed for strategic operations
- [ ] Ethics committee approval obtained
- [ ] All environment variables configured
- [ ] SSL certificates installed
- [ ] Backup systems tested
- [ ] Incident response plan approved
- [ ] Security team trained
- [ ] Monitoring systems active

## Environment Setup

### 1. Generate Security Keys

```bash
# Generate RSA key pair for JWT
openssl genrsa -out jwt-private.pem 4096
openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem

# Generate master encryption key
openssl rand -base64 32 > master-key.txt

# Generate audit signing key
openssl genrsa -out audit-private.pem 4096

# Generate session secret
openssl rand -base64 32 > session-secret.txt
```

### 2. Environment Variables

Create `.env.production`:

```bash
# Node Environment
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@host:5432/indigenious?ssl=true
REDIS_URL=rediss://user:pass@host:6379

# Security Keys (base64 encoded)
JWT_PRIVATE_KEY="$(cat jwt-private.pem | base64)"
JWT_PUBLIC_KEY="$(cat jwt-public.pem | base64)"
MASTER_ENCRYPTION_KEY="$(cat master-key.txt)"
SESSION_SECRET="$(cat session-secret.txt)"
AUDIT_SIGNING_KEY="$(cat audit-private.pem | base64)"

# API Keys (encrypted at rest)
OPENAI_API_KEY=encrypted:...
TWITTER_API_KEY=encrypted:...
LINKEDIN_API_KEY=encrypted:...
ABUSEIPDB_API_KEY=encrypted:...

# Security Configuration
BCRYPT_ROUNDS=14
MFA_REQUIRED=true
SESSION_TIMEOUT=1800000
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=3600000

# CORS & Domain
FRONTEND_URL=https://indigenious.ca
CORS_ORIGINS=https://indigenious.ca,https://www.indigenious.ca,https://app.indigenious.ca
COOKIE_DOMAIN=.indigenious.ca

# SSL Database Certificates
DB_CA_CERT="$(cat ca-cert.pem | base64)"
DB_CLIENT_CERT="$(cat client-cert.pem | base64)"
DB_CLIENT_KEY="$(cat client-key.pem | base64)"

# Monitoring
SIEM_ENDPOINT=https://siem.indigenious.ca/api/events
SECURITY_ALERT_EMAIL=security@indigenious.ca
PAGERDUTY_TOKEN=...

# IP Security
IP_WHITELIST=
ENABLE_GEO_BLOCKING=true
BLOCKED_COUNTRIES=
```

### 3. Infrastructure Requirements

#### Minimum Production Requirements
- **CPU**: 8 cores (16 recommended)
- **RAM**: 32GB (64GB recommended)
- **Storage**: 500GB SSD (1TB recommended)
- **Network**: 1Gbps connection
- **CDN**: CloudFlare or similar
- **Load Balancer**: With SSL termination
- **WAF**: Web Application Firewall

#### Database Setup
```sql
-- Enable encryption at rest
ALTER DATABASE indigenious SET encryption = 'on';

-- Create audit schema
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS security;

-- Set up row-level security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_operations ENABLE ROW LEVEL SECURITY;

-- Create security policies
CREATE POLICY user_isolation ON users
  FOR ALL TO application_role
  USING (id = current_setting('app.current_user_id')::uuid);
```

#### Redis Configuration
```conf
# redis.conf
requirepass your-strong-password
maxmemory 4gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec

# Enable TLS
tls-port 6379
tls-cert-file /path/to/redis.crt
tls-key-file /path/to/redis.key
tls-ca-cert-file /path/to/ca.crt
tls-dh-params-file /path/to/dhparam.pem
```

## Deployment Steps

### 1. Pre-deployment

```bash
# Run security tests
npm run test:security

# Run compliance check
npm run compliance:check

# Build production bundle
npm run build:production

# Verify build integrity
npm run verify:build
```

### 2. Database Migration

```bash
# Backup existing database
pg_dump indigenious > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations
npm run db:migrate:production

# Verify migrations
npm run db:verify
```

### 3. Deploy Application

```bash
# Using PM2 for process management
pm2 start ecosystem.config.js --env production

# Or using systemd
sudo systemctl start indigenious-pr
sudo systemctl enable indigenious-pr
```

#### PM2 Configuration (ecosystem.config.js)
```javascript
module.exports = {
  apps: [{
    name: 'indigenious-pr',
    script: './dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/indigenious/pr-error.log',
    out_file: '/var/log/indigenious/pr-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '2G',
    autorestart: true,
    watch: false
  }]
};
```

### 4. Post-deployment Verification

```bash
# Health check
curl https://api.indigenious.ca/api/pr/health

# Security headers check
curl -I https://api.indigenious.ca/api/pr/health

# Run integration tests
npm run test:integration:production

# Monitor logs
tail -f /var/log/indigenious/pr-*.log
```

## Security Hardening

### 1. Firewall Rules

```bash
# Allow only necessary ports
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp  # SSH (restrict to specific IPs)
ufw allow 443/tcp # HTTPS
ufw allow from 10.0.0.0/8 to any port 5432 # PostgreSQL (internal only)
ufw allow from 10.0.0.0/8 to any port 6379 # Redis (internal only)
ufw enable
```

### 2. Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name api.indigenious.ca;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/indigenious.crt;
    ssl_certificate_key /etc/ssl/private/indigenious.key;
    ssl_protocols TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # Proxy to application
    location /api/pr {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Security
        proxy_hide_header X-Powered-By;
        proxy_hide_header Server;
    }
}
```

### 3. System Hardening

```bash
# Disable unnecessary services
systemctl disable bluetooth
systemctl disable cups

# Kernel hardening
echo "net.ipv4.tcp_syncookies = 1" >> /etc/sysctl.conf
echo "net.ipv4.conf.all.rp_filter = 1" >> /etc/sysctl.conf
echo "net.ipv4.conf.default.rp_filter = 1" >> /etc/sysctl.conf
echo "net.ipv4.icmp_echo_ignore_broadcasts = 1" >> /etc/sysctl.conf
echo "net.ipv4.conf.all.accept_source_route = 0" >> /etc/sysctl.conf
echo "net.ipv6.conf.all.accept_source_route = 0" >> /etc/sysctl.conf
sysctl -p

# File permissions
chmod 700 /var/log/indigenious
chmod 600 /var/log/indigenious/*
chown -R indigenious:indigenious /var/log/indigenious
```

## Monitoring Setup

### 1. Application Monitoring

```javascript
// monitoring.js
const prometheus = require('prom-client');
const register = new prometheus.Registry();

// Metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const prOperationsCounter = new prometheus.Counter({
  name: 'pr_operations_total',
  help: 'Total number of PR operations',
  labelNames: ['type', 'status']
});

const securityEventsCounter = new prometheus.Counter({
  name: 'security_events_total',
  help: 'Total number of security events',
  labelNames: ['type', 'severity']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(prOperationsCounter);
register.registerMetric(securityEventsCounter);
```

### 2. Security Monitoring

```bash
# Install OSSEC for host intrusion detection
wget -q -O - https://updates.atomicorp.com/installers/atomic | sh
yum install ossec-hids ossec-hids-server
/var/ossec/bin/ossec-control start

# Configure fail2ban
apt-get install fail2ban
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
# Edit jail.local to add custom rules for PR automation
```

### 3. Log Aggregation

```yaml
# filebeat.yml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/indigenious/audit/*.log
    - /var/log/indigenious/security/*.log
  fields:
    service: pr-automation
    environment: production

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  protocol: "https"
  username: "elastic"
  password: "${ELASTIC_PASSWORD}"
  
processors:
  - add_host_metadata:
      when.not.contains.tags: forwarded
```

## Backup and Recovery

### 1. Automated Backups

```bash
#!/bin/bash
# backup.sh - Run daily via cron

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/indigenious"

# Database backup
pg_dump indigenious | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Audit logs backup
tar -czf $BACKUP_DIR/audit_logs_$DATE.tar.gz /var/log/indigenious/audit/

# Encrypt backups
gpg --encrypt --recipient backup@indigenious.ca $BACKUP_DIR/db_$DATE.sql.gz
gpg --encrypt --recipient backup@indigenious.ca $BACKUP_DIR/audit_logs_$DATE.tar.gz

# Upload to secure storage
aws s3 cp $BACKUP_DIR/db_$DATE.sql.gz.gpg s3://indigenious-backups/pr/
aws s3 cp $BACKUP_DIR/audit_logs_$DATE.tar.gz.gpg s3://indigenious-backups/pr/

# Clean up old backups (keep 30 days)
find $BACKUP_DIR -type f -mtime +30 -delete
```

### 2. Disaster Recovery Plan

1. **RTO**: 4 hours
2. **RPO**: 1 hour
3. **Backup Locations**: 
   - Primary: AWS S3 (us-east-1)
   - Secondary: Azure Blob (canada-central)
   - Tertiary: On-premise cold storage

## Incident Response

### Security Incident Procedure

1. **Detection**: Automated monitoring alerts
2. **Containment**: Auto-block suspicious IPs/users
3. **Investigation**: Review audit logs
4. **Remediation**: Apply fixes
5. **Recovery**: Restore service
6. **Post-mortem**: Document and improve

### Emergency Contacts

- Security Team: security@indigenious.ca
- On-call Engineer: +1-xxx-xxx-xxxx
- Legal Team: legal@indigenious.ca
- PR Team Lead: pr-lead@indigenious.ca

## Maintenance

### Weekly Tasks
- Review security alerts
- Update threat intelligence feeds
- Rotate logs
- Test backups
- Review access logs

### Monthly Tasks
- Security patches
- Dependency updates
- Performance review
- Capacity planning
- Compliance audit

### Quarterly Tasks
- Penetration testing
- Disaster recovery drill
- Security training
- Policy review
- Key rotation

## Rollback Procedure

If issues arise:

```bash
# 1. Stop current deployment
pm2 stop indigenious-pr

# 2. Restore previous version
git checkout tags/v1.0.0
npm install --production
npm run build:production

# 3. Restore database if needed
psql indigenious < backup_20240127_120000.sql

# 4. Restart services
pm2 start ecosystem.config.js --env production

# 5. Verify
npm run test:smoke:production
```

## Final Checklist

Before going live:

- [ ] All tests passing (unit, integration, security)
- [ ] Load testing completed (10,000+ concurrent users)
- [ ] Security scan clean (OWASP ZAP, Burp Suite)
- [ ] SSL Labs A+ rating
- [ ] Monitoring dashboards active
- [ ] Backup restore tested
- [ ] Incident response team ready
- [ ] Legal sign-off obtained
- [ ] Insurance coverage verified
- [ ] Communication plan ready

---

⚠️ **REMINDER**: The PR automation system contains sensitive capabilities. Ensure all security measures are in place before deployment. Consider starting with a limited beta rollout to trusted users only.