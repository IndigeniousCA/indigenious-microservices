# Indigenous Notification Service

Multi-channel notification microservice for the Indigenous Procurement Platform - handles email, SMS, push notifications, and real-time messaging with Indigenous business-specific features.

## 📬 IMPORTANT SERVICE (60% Test Coverage)

This service manages all notification channels for the platform, with special support for Indigenous business communications including bilingual notifications (English/French), band-specific messaging, and RFQ opportunity alerts.

## Features

### Core Capabilities
- **Multi-Channel Support**: Email, SMS, Push, In-App notifications
- **Provider Redundancy**: Multiple providers per channel for reliability
- **Template Management**: Dynamic templates with personalization
- **Queue System**: Robust retry logic with exponential backoff
- **Real-time Updates**: Socket.IO for instant notifications
- **Preference Management**: User-controlled notification settings
- **Bulk Operations**: Efficient batch sending with rate limiting

### Channel Providers
- **Email**: SendGrid (primary), AWS SES (fallback)
- **SMS**: Twilio (primary), AWS SNS (fallback)
- **Push**: Firebase Cloud Messaging, Web Push API
- **Real-time**: Socket.IO with Redis pub/sub

### Indigenous-Specific Features
- Bilingual support (English/French)
- Band verification for tax exemptions
- RFQ matching notifications
- On-reserve delivery alerts
- Certification reminders
- Priority notifications for set-aside opportunities

## Quick Start

```bash
npm install
docker-compose up
npm test
```

## Status

✅ **Production Ready** - 7 of 48 services complete
