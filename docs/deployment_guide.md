# Worker Hiring Application Deployment Guide

This document provides comprehensive instructions for deploying the Worker Hiring Application in a production environment. The application consists of a Node.js backend API and a React Native mobile application.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Backend Deployment](#backend-deployment)
3. [Database Setup](#database-setup)
4. [Mobile App Deployment](#mobile-app-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Security Considerations](#security-considerations)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)
8. [Scaling Considerations](#scaling-considerations)

## System Requirements

### Backend Server Requirements

- **Operating System**: Ubuntu 20.04 LTS or newer
- **CPU**: Minimum 2 vCPUs, recommended 4 vCPUs
- **RAM**: Minimum 4GB, recommended 8GB
- **Storage**: Minimum 20GB SSD
- **Node.js**: Version 16.x or newer
- **MongoDB**: Version 5.0 or newer
- **Redis**: Version 6.0 or newer (for session management and caching)
- **Nginx**: Latest stable version (for reverse proxy)
- **SSL Certificate**: Valid SSL certificate for secure HTTPS connections

### Mobile App Build Requirements

- **Node.js**: Version 16.x or newer
- **React Native CLI**: Latest version
- **Xcode**: Latest version (for iOS builds)
- **Android Studio**: Latest version (for Android builds)
- **JDK**: Version 11 or newer

## Backend Deployment

### Option 1: Manual Deployment

1. **Prepare the server**:
   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 for process management
   sudo npm install -g pm2
   
   # Install Nginx
   sudo apt install -y nginx
   
   # Configure firewall
   sudo ufw allow 'Nginx Full'
   sudo ufw allow ssh
   sudo ufw enable
   ```

2. **Clone the repository**:
   ```bash
   git clone https://github.com/your-organization/worker-hiring-app.git
   cd worker-hiring-app/backend
   ```

3. **Install dependencies**:
   ```bash
   npm install --production
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env file with production values
   nano .env
   ```

5. **Build the application**:
   ```bash
   npm run build
   ```

6. **Configure PM2**:
   ```bash
   pm2 start dist/index.js --name "worker-hiring-api"
   pm2 startup
   pm2 save
   ```

7. **Configure Nginx as reverse proxy**:
   ```bash
   sudo nano /etc/nginx/sites-available/worker-hiring-api
   ```
   
   Add the following configuration:
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;
   
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

8. **Enable the site and restart Nginx**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/worker-hiring-api /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

9. **Set up SSL with Let's Encrypt**:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d api.yourdomain.com
   ```

### Option 2: Docker Deployment

1. **Install Docker and Docker Compose**:
   ```bash
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **Create Docker Compose file**:
   ```bash
   nano docker-compose.yml
   ```
   
   Add the following configuration:
   ```yaml
   version: '3'
   
   services:
     api:
       build: ./backend
       restart: always
       ports:
         - "5000:5000"
       env_file:
         - ./backend/.env
       depends_on:
         - mongo
         - redis
       networks:
         - app-network
   
     mongo:
       image: mongo:5.0
       restart: always
       volumes:
         - mongo-data:/data/db
       networks:
         - app-network
   
     redis:
       image: redis:6.0
       restart: always
       volumes:
         - redis-data:/data
       networks:
         - app-network
   
     nginx:
       image: nginx:latest
       restart: always
       ports:
         - "80:80"
         - "443:443"
       volumes:
         - ./nginx/conf.d:/etc/nginx/conf.d
         - ./nginx/ssl:/etc/nginx/ssl
         - ./nginx/www:/var/www/html
       depends_on:
         - api
       networks:
         - app-network
   
   networks:
     app-network:
       driver: bridge
   
   volumes:
     mongo-data:
     redis-data:
   ```

3. **Create Nginx configuration**:
   ```bash
   mkdir -p nginx/conf.d
   nano nginx/conf.d/default.conf
   ```
   
   Add the following configuration:
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;
       
       location / {
           return 301 https://$host$request_uri;
       }
   }
   
   server {
       listen 443 ssl;
       server_name api.yourdomain.com;
       
       ssl_certificate /etc/nginx/ssl/cert.pem;
       ssl_certificate_key /etc/nginx/ssl/key.pem;
       
       location / {
           proxy_pass http://api:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Start the services**:
   ```bash
   docker-compose up -d
   ```

### Option 3: Cloud Deployment (AWS)

1. **Set up Elastic Beanstalk**:
   - Create a new Elastic Beanstalk application
   - Choose Node.js platform
   - Upload your application as a ZIP file or connect to your repository

2. **Configure environment variables** in the Elastic Beanstalk console

3. **Set up MongoDB Atlas** for database:
   - Create a MongoDB Atlas account
   - Set up a new cluster
   - Configure network access to allow connections from your Elastic Beanstalk environment
   - Create a database user
   - Get the connection string and update your environment variables

4. **Set up Amazon ElastiCache** for Redis:
   - Create a new ElastiCache cluster using Redis
   - Configure security groups to allow access from your Elastic Beanstalk environment
   - Update your environment variables with the Redis endpoint

5. **Configure AWS Route 53** for domain management:
   - Create a new record set pointing to your Elastic Beanstalk environment
   - Set up SSL certificate using AWS Certificate Manager

## Database Setup

### MongoDB Setup

1. **Install MongoDB** (if not using Docker or cloud service):
   ```bash
   # Import MongoDB public GPG key
   wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
   
   # Create list file for MongoDB
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
   
   # Reload local package database
   sudo apt-get update
   
   # Install MongoDB packages
   sudo apt-get install -y mongodb-org
   
   # Start MongoDB
   sudo systemctl start mongod
   
   # Enable MongoDB to start on boot
   sudo systemctl enable mongod
   ```

2. **Create database and user**:
   ```bash
   # Connect to MongoDB
   mongo
   
   # Create database
   use worker_hiring_app
   
   # Create user
   db.createUser({
     user: "appuser",
     pwd: "secure_password",
     roles: [{ role: "readWrite", db: "worker_hiring_app" }]
   })
   
   # Exit MongoDB shell
   exit
   ```

3. **Enable authentication**:
   ```bash
   sudo nano /etc/mongod.conf
   ```
   
   Add/modify the following sections:
   ```yaml
   security:
     authorization: enabled
   ```
   
   Restart MongoDB:
   ```bash
   sudo systemctl restart mongod
   ```

4. **Run database migrations**:
   ```bash
   cd /path/to/backend
   npm run db:migrate
   ```

5. **Seed initial data** (if needed):
   ```bash
   npm run db:seed
   ```

### Redis Setup

1. **Install Redis** (if not using Docker or cloud service):
   ```bash
   sudo apt install -y redis-server
   ```

2. **Configure Redis**:
   ```bash
   sudo nano /etc/redis/redis.conf
   ```
   
   Make the following changes:
   - Set `supervised` to `systemd`
   - Set `bind 127.0.0.1` to restrict access
   - Set a password: `requirepass your_secure_password`
   
   Restart Redis:
   ```bash
   sudo systemctl restart redis
   ```

## Mobile App Deployment

### Building for Android

1. **Generate a signing key**:
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore worker-hiring-app.keystore -alias worker-hiring-app -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configure Gradle variables**:
   ```bash
   # Create gradle.properties in android/app
   cd mobile/android/app
   nano gradle.properties
   ```
   
   Add the following:
   ```properties
   MYAPP_RELEASE_STORE_FILE=worker-hiring-app.keystore
   MYAPP_RELEASE_KEY_ALIAS=worker-hiring-app
   MYAPP_RELEASE_STORE_PASSWORD=your_keystore_password
   MYAPP_RELEASE_KEY_PASSWORD=your_key_password
   ```

3. **Update build.gradle**:
   ```bash
   nano build.gradle
   ```
   
   Add the following inside the `android` block:
   ```gradle
   signingConfigs {
       release {
           storeFile file(MYAPP_RELEASE_STORE_FILE)
           storePassword MYAPP_RELEASE_STORE_PASSWORD
           keyAlias MYAPP_RELEASE_KEY_ALIAS
           keyPassword MYAPP_RELEASE_KEY_PASSWORD
       }
   }
   buildTypes {
       release {
           signingConfig signingConfigs.release
           minifyEnabled true
           proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
       }
   }
   ```

4. **Build the release APK**:
   ```bash
   cd mobile/android
   ./gradlew assembleRelease
   ```
   
   The APK will be generated at `mobile/android/app/build/outputs/apk/release/app-release.apk`

5. **Publish to Google Play Store**:
   - Create a Google Play Developer account
   - Create a new application
   - Upload the APK
   - Fill in store listing details
   - Submit for review

### Building for iOS

1. **Configure app signing in Xcode**:
   - Open the project in Xcode
   - Go to the project settings
   - Select the "Signing & Capabilities" tab
   - Sign in with your Apple Developer account
   - Select your team
   - Configure automatic signing

2. **Set up app identifier in Apple Developer Portal**:
   - Log in to Apple Developer Portal
   - Go to Certificates, IDs & Profiles
   - Create a new App ID
   - Configure capabilities as needed

3. **Archive the app in Xcode**:
   - Select the "Generic iOS Device" as the build target
   - Select Product > Archive
   - Wait for the archiving process to complete

4. **Upload to App Store Connect**:
   - In the Archives window, click "Distribute App"
   - Select "App Store Connect"
   - Follow the prompts to upload the app
   - Fill in App Store listing details
   - Submit for review

## Environment Configuration

### Backend Environment Variables

Create a `.env` file in the backend directory with the following variables:

```
# Server Configuration
NODE_ENV=production
PORT=5000
API_URL=https://api.yourdomain.com
CLIENT_URL=https://yourdomain.com

# Database Configuration
MONGO_URI=mongodb://appuser:secure_password@localhost:27017/worker_hiring_app
REDIS_URL=redis://:your_secure_password@localhost:6379

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASSWORD=your_email_password
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Worker Hiring App

# File Upload Configuration
MAX_FILE_UPLOAD=5000000 # 5MB in bytes
FILE_UPLOAD_PATH=./public/uploads

# Payment Gateway Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Social Auth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
APPLE_CLIENT_ID=your_apple_client_id
APPLE_TEAM_ID=your_apple_team_id
APPLE_KEY_ID=your_apple_key_id
APPLE_PRIVATE_KEY=your_apple_private_key

# Push Notifications
FIREBASE_SERVER_KEY=your_firebase_server_key
```

### Mobile App Environment Configuration

Create a `.env` file in the mobile directory with the following variables:

```
# API Configuration
API_URL=https://api.yourdomain.com

# Google Maps API Key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Social Auth Configuration
GOOGLE_WEB_CLIENT_ID=your_google_web_client_id
FACEBOOK_APP_ID=your_facebook_app_id
```

## Security Considerations

1. **API Security**:
   - Use HTTPS for all communications
   - Implement rate limiting to prevent abuse
   - Use proper authentication and authorization
   - Validate all input data
   - Implement CORS with appropriate restrictions

2. **Database Security**:
   - Use strong passwords
   - Enable authentication
   - Restrict network access
   - Regularly backup data
   - Encrypt sensitive data

3. **Mobile App Security**:
   - Implement certificate pinning
   - Store sensitive data in secure storage
   - Implement biometric authentication where appropriate
   - Obfuscate code to prevent reverse engineering
   - Implement proper session management

4. **Payment Security**:
   - Use a reputable payment processor (Stripe)
   - Never store credit card information
   - Implement proper logging for payment transactions
   - Set up webhook validation

5. **User Data Protection**:
   - Implement proper data encryption
   - Follow GDPR and other relevant regulations
   - Provide clear privacy policy
   - Implement data retention policies

## Monitoring and Maintenance

1. **Server Monitoring**:
   - Set up monitoring using tools like PM2, New Relic, or AWS CloudWatch
   - Configure alerts for high CPU/memory usage
   - Monitor disk space and database size
   - Set up log rotation

2. **Application Monitoring**:
   - Implement error tracking using Sentry or similar tools
   - Set up performance monitoring
   - Track API response times
   - Monitor user activity and engagement

3. **Database Monitoring**:
   - Monitor database performance
   - Set up regular backups
   - Implement database maintenance tasks
   - Monitor database connections

4. **Regular Maintenance**:
   - Keep dependencies up to date
   - Apply security patches promptly
   - Perform regular code reviews
   - Update SSL certificates before expiration

5. **Backup Strategy**:
   - Implement daily automated backups
   - Store backups in multiple locations
   - Test backup restoration regularly
   - Implement point-in-time recovery

## Scaling Considerations

1. **Horizontal Scaling**:
   - Use load balancers to distribute traffic
   - Deploy multiple API instances
   - Implement stateless architecture
   - Use container orchestration (Kubernetes)

2. **Database Scaling**:
   - Implement MongoDB replication
   - Consider sharding for very large datasets
   - Use read replicas for read-heavy workloads
   - Implement proper indexing

3. **Caching Strategy**:
   - Use Redis for caching frequently accessed data
   - Implement CDN for static assets
   - Use in-memory caching where appropriate
   - Implement cache invalidation strategies

4. **Microservices Architecture**:
   - Consider splitting the application into microservices for better scalability
   - Implement service discovery
   - Use message queues for asynchronous processing
   - Implement circuit breakers for fault tolerance

5. **Global Deployment**:
   - Use CDN for global content delivery
   - Consider multi-region deployment
   - Implement geolocation-based routing
   - Use edge computing for low-latency requirements
