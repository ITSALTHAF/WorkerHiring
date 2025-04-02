# Worker Hiring Application - Project Overview

## Introduction

The Worker Hiring Application is a comprehensive two-way marketplace platform designed to connect service seekers (clients) with service providers (workers) such as plumbers, electricians, carpenters, and other skilled professionals. This mobile-first application provides a seamless experience for both clients and workers, with features including user authentication, profile management, job posting, booking, payments, messaging, and more.

## Project Structure

The project is organized into the following main directories:

```
WorkerHiringApp/
├── backend/               # Node.js backend API
│   ├── src/               # Source code
│   │   ├── controllers/   # API controllers
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Custom middleware
│   │   ├── utils/         # Utility functions
│   │   ├── config/        # Configuration files
│   │   └── index.ts       # Entry point
│   ├── __tests__/         # Backend tests
│   └── package.json       # Dependencies
│
├── mobile/                # React Native mobile app
│   ├── src/               # Source code
│   │   ├── screens/       # App screens
│   │   ├── components/    # Reusable components
│   │   ├── navigation/    # Navigation configuration
│   │   ├── services/      # API services
│   │   ├── utils/         # Utility functions
│   │   ├── assets/        # Images, fonts, etc.
│   │   ├── hooks/         # Custom React hooks
│   │   └── context/       # React context providers
│   ├── __tests__/         # Frontend tests
│   └── package.json       # Dependencies
│
├── design/                # Design assets
│   ├── mockups/           # UI mockups
│   └── assets/            # Design resources
│
└── docs/                  # Documentation
    ├── requirements.md    # Project requirements
    ├── database_schema.md # Database schema
    ├── deployment_guide.md # Deployment instructions
    └── user_guide.md      # User documentation
```

## Key Features

### User Roles & Authentication
- Two types of users: Service Seekers (Clients) and Service Providers (Workers)
- Users can switch between roles
- Secure email, phone, and social media login
- Multi-Factor Authentication (MFA)
- Profile verification system (KYC)

### Profile Management
- Comprehensive profile management for both clients and workers
- Portfolio management for workers with image uploads
- Skill and certification management
- Availability scheduling

### Job Posting & Search
- Intuitive job posting interface
- Advanced search with multiple filters
- Job application system
- Job status tracking

### Booking & Scheduling
- Seamless booking process
- Calendar integration
- Status tracking
- Completion verification

### Payments & Wallet
- Secure payment processing
- Escrow system for client protection
- Multiple payment methods
- Transaction history and reporting

### Messaging System
- Real-time chat functionality
- Media sharing
- Typing indicators and read receipts
- Notification system

### Ratings & Reviews
- Mutual rating system
- Detailed reviews
- Response capability
- Fake review detection

### Admin Panel
- User management
- Content moderation
- Transaction oversight
- Analytics and reporting

## Technology Stack

### Backend
- **Language**: TypeScript
- **Framework**: Node.js with Express
- **Database**: MongoDB
- **Authentication**: JWT, OAuth
- **Real-time Communication**: Socket.io
- **Payment Processing**: Stripe
- **Cloud Storage**: AWS S3
- **AI Integration**: TensorFlow.js

### Mobile App
- **Framework**: React Native
- **State Management**: Context API
- **Navigation**: React Navigation
- **UI Components**: Custom components with styled-components
- **Maps Integration**: Google Maps API
- **Push Notifications**: Firebase Cloud Messaging
- **Analytics**: Firebase Analytics

## Getting Started

Please refer to the following documentation to get started with the project:

1. [Deployment Guide](deployment_guide.md) - Instructions for deploying the application
2. [User Guide](user_guide.md) - Comprehensive guide for using the application

## Development

To set up the development environment:

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Configure your .env file
npm run dev
```

### Mobile App
```bash
cd mobile
npm install
cp .env.example .env
# Configure your .env file
npm run start
```

## Testing

The project includes comprehensive tests for both backend and frontend:

### Backend Tests
```bash
cd backend
npm test
```

### Mobile App Tests
```bash
cd mobile
npm test
```

## Deployment

For detailed deployment instructions, please refer to the [Deployment Guide](deployment_guide.md).

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## Contact

For support or inquiries, please contact:
- Email: support@workerhiringapp.com
- Phone: +1-800-HIRE-APP
