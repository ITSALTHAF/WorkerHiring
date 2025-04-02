# Database Schema Design for Worker Hiring Application

## Overview
This document outlines the database schema design for the Worker Hiring Application, a two-way marketplace platform where users can hire workers and register as service providers.

## Entity Relationship Diagram

```
User
  ↑
  |
  ↓
Profile ← → ServiceCategory
  ↑
  |
  ↓
Worker → WorkerSkill → Skill
  ↑
  |
  ↓
JobPosting → JobApplication
  ↑
  |
  ↓
Booking → Payment
  ↑
  |
  ↓
Review
```

## Core Entities

### User
- _id: ObjectId (Primary Key)
- email: String (Unique, Required)
- phone: String
- password: String (Hashed)
- role: Enum ["client", "worker", "admin"]
- isEmailVerified: Boolean
- isPhoneVerified: Boolean
- authProvider: Enum ["local", "google", "apple", "facebook"]
- authProviderId: String
- mfaEnabled: Boolean
- mfaMethod: Enum ["app", "sms", "email"]
- kycVerified: Boolean
- kycDocuments: Array
- createdAt: Date
- updatedAt: Date
- lastLogin: Date
- isActive: Boolean
- deviceTokens: Array

### Profile
- _id: ObjectId (Primary Key)
- userId: ObjectId (Foreign Key → User)
- firstName: String
- lastName: String
- avatar: String (URL)
- bio: String
- address: Object
  - street: String
  - city: String
  - state: String
  - zipCode: String
  - country: String
  - coordinates: [Number, Number] (GeoJSON Point)
- preferences: Object
- createdAt: Date
- updatedAt: Date

### Worker (extends Profile)
- _id: ObjectId (Primary Key)
- profileId: ObjectId (Foreign Key → Profile)
- title: String
- experience: Number (years)
- hourlyRate: Number
- availability: Object
  - schedule: Array
  - isAvailableNow: Boolean
- portfolio: Array
  - title: String
  - description: String
  - images: Array
- certifications: Array
  - title: String
  - issuer: String
  - issueDate: Date
  - expiryDate: Date
  - verificationUrl: String
- averageRating: Number
- totalJobs: Number
- totalEarnings: Number
- isVerified: Boolean
- createdAt: Date
- updatedAt: Date

### ServiceCategory
- _id: ObjectId (Primary Key)
- name: String
- description: String
- icon: String
- parentCategory: ObjectId (Self-reference)
- isActive: Boolean
- createdAt: Date
- updatedAt: Date

### Skill
- _id: ObjectId (Primary Key)
- name: String
- category: ObjectId (Foreign Key → ServiceCategory)
- description: String
- createdAt: Date
- updatedAt: Date

### WorkerSkill
- _id: ObjectId (Primary Key)
- workerId: ObjectId (Foreign Key → Worker)
- skillId: ObjectId (Foreign Key → Skill)
- yearsOfExperience: Number
- level: Enum ["beginner", "intermediate", "expert"]
- isVerified: Boolean
- createdAt: Date
- updatedAt: Date

### JobPosting
- _id: ObjectId (Primary Key)
- clientId: ObjectId (Foreign Key → User)
- title: String
- description: String
- category: ObjectId (Foreign Key → ServiceCategory)
- requiredSkills: Array of ObjectId (Foreign Key → Skill)
- location: Object
  - address: String
  - coordinates: [Number, Number] (GeoJSON Point)
- budget: Object
  - minAmount: Number
  - maxAmount: Number
  - currency: String
- paymentType: Enum ["hourly", "fixed"]
- urgency: Enum ["low", "medium", "high", "immediate"]
- startDate: Date
- endDate: Date
- status: Enum ["open", "in_progress", "completed", "cancelled"]
- attachments: Array
- views: Number
- applications: Number
- createdAt: Date
- updatedAt: Date

### JobApplication
- _id: ObjectId (Primary Key)
- jobId: ObjectId (Foreign Key → JobPosting)
- workerId: ObjectId (Foreign Key → Worker)
- coverLetter: String
- proposedAmount: Number
- estimatedDuration: Object
  - value: Number
  - unit: Enum ["hour", "day", "week"]
- status: Enum ["pending", "accepted", "rejected", "withdrawn"]
- attachments: Array
- createdAt: Date
- updatedAt: Date

### Booking
- _id: ObjectId (Primary Key)
- jobId: ObjectId (Foreign Key → JobPosting)
- clientId: ObjectId (Foreign Key → User)
- workerId: ObjectId (Foreign Key → Worker)
- startTime: Date
- endTime: Date
- status: Enum ["scheduled", "in_progress", "completed", "cancelled"]
- cancellationReason: String
- cancellationPolicy: Object
- location: Object
  - address: String
  - coordinates: [Number, Number] (GeoJSON Point)
- notes: String
- attachments: Array
- createdAt: Date
- updatedAt: Date

### Payment
- _id: ObjectId (Primary Key)
- bookingId: ObjectId (Foreign Key → Booking)
- clientId: ObjectId (Foreign Key → User)
- workerId: ObjectId (Foreign Key → Worker)
- amount: Number
- currency: String
- paymentMethod: String
- transactionId: String
- status: Enum ["pending", "completed", "failed", "refunded"]
- escrowReleaseDate: Date
- platformFee: Number
- taxAmount: Number
- invoiceUrl: String
- createdAt: Date
- updatedAt: Date

### Review
- _id: ObjectId (Primary Key)
- bookingId: ObjectId (Foreign Key → Booking)
- reviewerId: ObjectId (Foreign Key → User)
- receiverId: ObjectId (Foreign Key → User)
- rating: Number (1-5)
- comment: String
- reply: String
- attachments: Array
- isFlagged: Boolean
- flagReason: String
- createdAt: Date
- updatedAt: Date

### Notification
- _id: ObjectId (Primary Key)
- userId: ObjectId (Foreign Key → User)
- type: String
- title: String
- message: String
- data: Object
- isRead: Boolean
- createdAt: Date

### Message
- _id: ObjectId (Primary Key)
- conversationId: ObjectId
- senderId: ObjectId (Foreign Key → User)
- receiverId: ObjectId (Foreign Key → User)
- content: String
- attachments: Array
- isRead: Boolean
- createdAt: Date

### Conversation
- _id: ObjectId (Primary Key)
- participants: Array of ObjectId (Foreign Key → User)
- lastMessage: ObjectId (Foreign Key → Message)
- jobId: ObjectId (Foreign Key → JobPosting)
- bookingId: ObjectId (Foreign Key → Booking)
- isActive: Boolean
- createdAt: Date
- updatedAt: Date

## Indexes

- User: email, phone, authProviderId
- Profile: userId, coordinates (2dsphere)
- Worker: profileId, isAvailableNow, hourlyRate, averageRating
- JobPosting: clientId, category, status, coordinates (2dsphere), createdAt
- JobApplication: jobId, workerId, status
- Booking: jobId, clientId, workerId, status, startTime
- Payment: bookingId, clientId, workerId, status
- Review: bookingId, reviewerId, receiverId, rating
- Message: conversationId, senderId, receiverId, createdAt
- Conversation: participants, jobId, bookingId

## Relationships

1. User has one Profile
2. Profile can be extended to Worker
3. Worker has many WorkerSkills
4. WorkerSkill belongs to Skill
5. Skill belongs to ServiceCategory
6. User (as client) has many JobPostings
7. JobPosting has many JobApplications
8. JobApplication belongs to Worker
9. Booking connects JobPosting, Client, and Worker
10. Payment belongs to Booking
11. Review belongs to Booking
12. Message belongs to Conversation
13. Conversation has many participants (Users)

## Data Validation Rules

1. User email must be unique and valid format
2. Worker hourlyRate must be positive
3. JobPosting budget must have minAmount <= maxAmount
4. Review rating must be between 1 and 5
5. Booking startTime must be before endTime
6. Payment amount must be positive

## Security Considerations

1. Password must be hashed before storage
2. Sensitive payment information should not be stored directly
3. User authentication and authorization required for all operations
4. Rate limiting for API endpoints
5. Input validation for all user-provided data
