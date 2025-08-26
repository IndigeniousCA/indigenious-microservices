# 💻 Local Laptop Deployment Guide

## Prerequisites
✅ Docker Desktop (installing now)
✅ 8GB RAM minimum (16GB recommended)
✅ 10GB free disk space

## Once Docker is Installed

### 1. Start Docker Desktop
```bash
# Open Docker Desktop (it will appear in your Applications folder)
open /Applications/Docker.app

# Wait for Docker to start (the whale icon in menu bar will stop animating)
```

### 2. Deploy the Platform

#### Option A: Minimal Demo (Best for laptops with 8GB RAM)
```bash
cd /Users/Jon/Desktop/Unations/indigenious-microservices
./deploy-showcase.sh design
```
This runs ONLY the Design System - perfect for seeing the UI without heavy resources.

#### Option B: Core Services (Recommended - needs 12GB RAM)
```bash
cd /Users/Jon/Desktop/Unations/indigenious-microservices
./deploy-showcase.sh core
```
This runs 6 essential services:
- Gateway (API routing)
- User Service (authentication)
- Business Service (directory)
- RFQ Service (marketplace)
- Payment Service (transactions)
- Design System (UI)

#### Option C: Full Platform (Needs 16GB+ RAM)
```bash
./deploy-showcase.sh full
```
This runs all 49 microservices - only if you have a powerful laptop!

## What You'll See

### Design System Only (Lightest Option)
Open: http://localhost:3049

You'll see:
- 16 Elemental Components (hover to interact)
- 8 Animated Background Layers
- Performance mode switcher
- Real-time WebSocket updates
- Seasonal theme adjustments

### Core Services (Recommended)
Open these URLs:
- http://localhost:3000 - API Gateway
- http://localhost:3049 - Design System
- http://localhost:3001/health - User Service
- http://localhost:3002/health - Business Service

## Resource Usage

| Deployment | RAM Usage | CPU Usage | Services |
|------------|-----------|-----------|----------|
| Design Only | ~2GB | Low | 1 service + DB |
| Core | ~4-6GB | Medium | 6 services + DB |
| Full | ~8-12GB | High | 49 services |

## Troubleshooting

### If Docker won't start:
```bash
# Check Docker status
docker version

# If command not found, Docker isn't installed yet
# Wait for brew install to complete
```

### If services won't start:
```bash
# Check available memory
docker system df

# Clean up if needed
docker system prune -a

# Try minimal deployment first
./deploy-showcase.sh design
```

### To stop everything:
```bash
# Stop all services
./deploy-showcase.sh stop

# Or force stop
docker stop $(docker ps -q)
```

## Performance Tips for Laptops

1. **Close other applications** - Docker needs memory
2. **Start with Design System only** - Lightest option
3. **Use "still-pond" performance mode** in the UI
4. **Stop services when done** to free resources

## Quick Test Commands

```bash
# Check if services are running
docker ps

# View logs
docker logs indigenous-design-system

# Check health
curl http://localhost:3049/health

# Stop everything
./deploy-showcase.sh stop
```

## Next Steps

1. Once Docker is running, start with: `./deploy-showcase.sh design`
2. Open http://localhost:3049 to see the Elemental Design System
3. If that works well, try `./deploy-showcase.sh core` for more features
4. Explore the API at http://localhost:3000

Your laptop is powerful enough to run this locally! 
Start small with the design system, then scale up as needed.