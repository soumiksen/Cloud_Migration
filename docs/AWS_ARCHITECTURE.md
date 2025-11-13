# MavPrep AWS Cloud Architecture

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [AWS Services & Free Tier](#aws-services--free-tier)
4. [System Components](#system-components)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [Security Architecture](#security-architecture)
7. [Scalability Strategy](#scalability-strategy)
8. [Cost Projections](#cost-projections)

---

## Executive Summary

MavPrep is built on a modern, serverless AWS architecture designed to maximize free tier benefits while providing enterprise-grade scalability, security, and performance. This architecture supports all core features of the platform:

- Practice Tests with Question Banks
- Custom Study Plans
- Progress Analytics
- Video Lessons
- Smart Flashcards with Spaced Repetition
- Community Support (Forums & Q&A)

**Key Metrics:**

- **Initial Cost**: $5-15/month (within free tier limits)
- **Target Users**: 500-1,000 monthly active users initially
- **Scalability**: Designed to scale to 50,000+ users
- **Availability**: 99.9% uptime target
- **Performance**: Sub-500ms API response times

---

## Architecture Overview

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet Users                          │
│                      (Students via Web/Mobile)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                  ┌──────────▼──────────┐
                  │     Route 53 DNS    │
                  │  (mavprep.com)      │
                  └──────────┬──────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
   ┌────▼────────┐                         ┌─────▼──────┐
   │ CloudFront  │◄────────────────────────│     S3     │
   │     CDN     │   (Static Assets)       │  Buckets   │
   └────┬────────┘                         └────────────┘
        │                                   - Videos
        │                                   - Images
   ┌────▼────────┐                         - Documents
   │  Amplify    │
   │  Hosting    │
   │ (Next.js)   │
   └────┬────────┘
        │
        │ HTTPS/REST
        │
   ┌────▼─────────┐
   │ API Gateway  │
   │  (REST/HTTP) │
   └────┬─────────┘
        │
        ├──────────────┬──────────────┬──────────────┬──────────────┐
        │              │              │              │              │
   ┌────▼────┐    ┌───▼────┐    ┌───▼────┐    ┌───▼────┐    ┌───▼────┐
   │  Auth   │    │ Tests  │    │Progress│    │Videos  │    │Community│
   │ Lambda  │    │ Lambda │    │ Lambda │    │ Lambda │    │ Lambda │
   └────┬────┘    └───┬────┘    └───┬────┘    └───┬────┘    └───┬────┘
        │             │              │              │              │
        │             │              │              │              │
   ┌────▼─────────────▼──────────────▼──────────────▼──────────────▼────┐
   │                          Data Layer                                │
   │  ┌──────────┐         ┌──────────┐        ┌────────────┐           │
   │  │ Cognito  │         │ DynamoDB │        │    RDS     │           │
   │  │User Pools│         │  Tables  │        │ PostgreSQL │           │
   │  └──────────┘         └──────────┘        └────────────┘           │
   │   - Google            - Users              - Questions             │
   │   - Microsoft         - Progress           - Tests                 │
   │   - Apple OAuth       - Flashcards         - Subjects              │
   │   - Email/Pass        - Community          - Videos                │
   │                       - Study Plans        - Analytics             │
   └────────────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
   ┌────▼────────┐                         ┌─────▼──────┐
   │ CloudWatch  │                         │    SNS     │
   │   Logs &    │                         │ Notifications│
   │  Metrics    │                         │   + SES    │
   └─────────────┘                         └────────────┘
```

### Architecture Principles

1. **Serverless-First**: Minimize operational overhead, maximize scalability
2. **Cost-Optimized**: Leverage AWS Free Tier services extensively
3. **Security-Focused**: Encryption at rest and in transit, IAM least privilege
4. **Performance**: CDN caching, database optimization, efficient queries
5. **Scalable**: Auto-scaling from zero to millions of users
6. **Observable**: Comprehensive logging, monitoring, and alerting

---

## AWS Services & Free Tier

### Free Tier Strategy

AWS offers two types of free tier:

**Always Free** (no time limit):

- AWS Lambda: 1M requests + 400K GB-seconds/month
- DynamoDB: 25 GB storage + 25 RCU/WCU
- CloudFront: 1 TB data out + 10M requests/month
- Cognito: 10,000 Monthly Active Users (MAU)
- CloudWatch: 5 GB logs, 10 custom metrics, 10 alarms
- SNS: 1M publishes/month
- SES: 62K outbound emails/month

**12-Month Free Tier** (for accounts created before July 15, 2025):

- AWS Amplify: 1,000 build minutes + 15 GB hosting/month
- RDS: 750 hours/month (db.t3.micro)
- S3: 5 GB storage + 20K GET + 2K PUT
- API Gateway: 1M HTTP API calls/month

### Service Selection Matrix

| Service            | Purpose          | Free Tier Benefit      | Cost After Free Tier   |
| ------------------ | ---------------- | ---------------------- | ---------------------- |
| **AWS Amplify**    | Frontend hosting | 15 GB/month (12mo)     | $0.15/GB               |
| **Lambda**         | Backend API      | 1M requests (always)   | $0.20/1M requests      |
| **API Gateway**    | API management   | 1M calls (12mo)        | $1.00/1M requests      |
| **DynamoDB**       | NoSQL database   | 25 GB (always)         | $0.25/GB               |
| **RDS PostgreSQL** | Relational DB    | 750 hrs/month (12mo)   | $0.017/hour (t3.micro) |
| **S3**             | Object storage   | 5 GB (12mo)            | $0.023/GB              |
| **CloudFront**     | CDN              | 1 TB transfer (always) | $0.085/GB              |
| **Cognito**        | Authentication   | 10K MAU (always)       | $0.0055/MAU            |
| **CloudWatch**     | Monitoring       | 5 GB logs (always)     | $0.50/GB               |
| **SNS**            | Notifications    | 1M publishes (always)  | $0.50/1M               |
| **SES**            | Email service    | 62K emails (always)    | $0.10/1K emails        |

---

## System Components

### 1. Frontend Hosting - AWS Amplify

**Purpose**: Host Next.js 16 application with server-side rendering (SSR)

**Why Amplify?**

- Native Next.js support with automatic detection
- Built-in CI/CD from GitHub
- Free SSL certificates (ACM)
- Global CDN backed by CloudFront
- Serverless rendering for dynamic pages
- Pull request previews for testing

**Configuration**:

```yaml
# amplify.yml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd mavprep-landing
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - "**/*"
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

**Deployment Flow**:

```
GitHub Push → Amplify Webhook → Build (npm run build) → Deploy → CloudFront Invalidation
```

### 2. Backend API - AWS Lambda + API Gateway

**Purpose**: Serverless REST API for all application logic

**Architecture Pattern**: Microservices with Lambda functions

```
API Gateway (HTTP API)
├── /auth/*          → auth-lambda      (Cognito integration)
├── /tests/*         → tests-lambda     (Test management)
├── /questions/*     → questions-lambda (Question CRUD)
├── /progress/*      → progress-lambda  (Progress tracking)
├── /flashcards/*    → flashcards-lambda (Flashcard system)
├── /study-plans/*   → study-plans-lambda (Study plan generator)
├── /videos/*        → videos-lambda    (Video management)
├── /community/*     → community-lambda (Forums & Q&A)
└── /analytics/*     → analytics-lambda (Analytics data)
```

**Lambda Configuration**:

- **Runtime**: Node.js 20.x
- **Memory**: 256-512 MB (optimized per function)
- **Timeout**: 30 seconds (API Gateway maximum)
- **Environment**: Production/Staging/Development

**API Gateway Setup**:

- **Type**: HTTP API (lower cost, better performance)
- **Authorization**: Cognito User Pool Authorizer
- **CORS**: Enabled for mavprep.com domain
- **Throttling**: 10,000 requests/second, 5,000 burst
- **Caching**: Enabled for GET requests (5-minute TTL)

### 3. Database Layer

#### 3.1 Amazon DynamoDB (NoSQL - Primary Database)

**Purpose**: High-performance, scalable NoSQL database for real-time data

**Use Cases**:

- User profiles and preferences
- Progress tracking (test scores, activity)
- Flashcard system with spaced repetition state
- Study plan schedules and milestones
- Community posts, comments, likes
- User sessions and cache

**Key Benefits**:

- 25 GB free storage (always free)
- Single-digit millisecond latency
- Auto-scaling included
- Built-in backup and point-in-time recovery
- DynamoDB Streams for real-time processing

**Table Design** (see DATABASE_SCHEMA.md for complete schemas):

```
Tables:
1. Users            (PK: USER#<id>, SK: PROFILE/SETTINGS/...)
2. Progress         (PK: USER#<id>, SK: PROGRESS#<testId>#<timestamp>)
3. Flashcards       (PK: USER#<id>, SK: FLASHCARD#<cardId>)
4. StudyPlans       (PK: USER#<id>, SK: PLAN#<planId>)
5. Community        (PK: COMMUNITY#<topicId>, SK: POST#<timestamp>#<postId>)
6. Comments         (PK: POST#<postId>, SK: COMMENT#<timestamp>#<commentId>)
```

#### 3.2 Amazon RDS PostgreSQL (Relational Database)

**Purpose**: Relational database for complex queries and relationships

**Use Cases**:

- Question bank with hierarchical topics
- Test templates and configurations
- Subject and topic hierarchies
- Video lesson metadata
- Advanced analytics queries
- Reporting and aggregations

**Key Benefits**:

- ACID compliance for data integrity
- Complex JOIN queries
- Full SQL support
- Familiar interface for developers

**Configuration**:

- **Instance**: db.t3.micro (1 vCPU, 1 GB RAM)
- **Storage**: 20 GB General Purpose SSD
- **Engine**: PostgreSQL 15
- **Multi-AZ**: Disabled initially (enable for production)
- **Backup**: 7-day automatic backups
- **Encryption**: Enabled at rest

**Schema** (see DATABASE_SCHEMA.md for complete schemas):

```
Tables:
- subjects          (university courses)
- topics            (hierarchical topic structure)
- questions         (question bank)
- question_options  (multiple choice options)
- test_templates    (test configurations)
- test_questions    (questions in tests)
- video_lessons     (video metadata)
```

### 4. Authentication - Amazon Cognito

**Purpose**: User authentication and authorization

**Features**:

- Email/password authentication
- Social identity providers (Google, Microsoft, Apple)
- JWT token management
- Multi-factor authentication (MFA)
- Password policies and account recovery
- User attribute management

**Configuration**:

```javascript
{
  userPoolName: "mavprep-users",
  selfSignUpEnabled: true,
  signInAliases: {
    email: true,
    username: true
  },
  autoVerify: { email: true },
  passwordPolicy: {
    minLength: 8,
    requireLowercase: true,
    requireUppercase: true,
    requireDigits: true,
    requireSymbols: false
  },
  mfa: "OPTIONAL",
  identityProviders: {
    Google: { clientId: "...", clientSecret: "..." },
    Microsoft: { clientId: "...", clientSecret: "..." },
    Apple: { clientId: "...", keyId: "..." }
  }
}
```

**Authentication Flow**:

```
1. User signs in → Cognito validates credentials
2. Cognito returns JWT tokens (ID token, Access token, Refresh token)
3. Frontend stores tokens securely
4. API requests include token in Authorization header
5. API Gateway validates token automatically
6. Lambda receives user context in event.requestContext
```

### 5. File Storage - Amazon S3

**Purpose**: Scalable object storage for videos, images, and documents

**Bucket Structure**:

```
mavprep-videos-production/
├── raw/                    # Original video uploads
├── processed/              # Transcoded videos (480p, 720p, 1080p)
└── thumbnails/             # Video thumbnails

mavprep-user-uploads-production/
├── profile-pictures/       # User avatars
└── study-materials/        # User-uploaded files

mavprep-question-assets-production/
├── images/                 # Question diagrams and images
└── equations/              # LaTeX-rendered equations

mavprep-static-assets-production/
├── logos/                  # Brand assets
├── icons/                  # UI icons
└── marketing/              # Marketing materials
```

**Security Features**:

- Bucket encryption (SSE-S3)
- Block public access (enabled)
- Presigned URLs for uploads
- CloudFront Origin Access Control
- Lifecycle policies for cost optimization

**Lifecycle Policies**:

```
- Transition to S3 Intelligent-Tiering after 30 days
- Transition to Glacier after 180 days (old videos)
- Delete temp uploads after 7 days
```

### 6. Content Delivery - Amazon CloudFront

**Purpose**: Global CDN for low-latency content delivery

**Distribution Strategy**:

**Distribution 1: Frontend (Amplify)**

- Origin: Amplify domain
- Cache: Aggressive (static assets)
- Behavior: Redirect HTTP to HTTPS

**Distribution 2: Videos**

- Origin: S3 videos bucket
- Cache: 30-day TTL
- Signed URLs: For premium content
- Streaming: HLS/DASH support

**Distribution 3: Static Assets**

- Origin: S3 static assets bucket
- Cache: 1-year TTL
- Compression: Enabled (gzip, brotli)

**Benefits**:

- 1 TB free data transfer/month (always free)
- 10M free requests/month
- Low latency worldwide
- DDoS protection (AWS Shield Standard)
- Free SSL/TLS certificates

### 7. Monitoring & Logging - CloudWatch

**Purpose**: Application monitoring, logging, and alerting

**Components**:

**CloudWatch Logs**:

```
/aws/lambda/auth-function
/aws/lambda/tests-function
/aws/lambda/questions-function
/aws/lambda/progress-function
/aws/lambda/flashcards-function
/aws/lambda/community-function
/aws/apigateway/mavprep-api
```

**CloudWatch Metrics**:

- Lambda invocations, duration, errors
- API Gateway request count, latency, errors
- DynamoDB consumed capacity, throttles
- RDS CPU, memory, connections
- Custom application metrics (user signups, tests completed)

**CloudWatch Alarms**:

```
1. Lambda error rate > 5%
2. API Gateway 5xx errors > 10 in 5 minutes
3. RDS CPU > 80%
4. DynamoDB throttled requests > 0
5. Estimated monthly cost > $50
```

**CloudWatch Dashboards**:

- Real-time system health
- User activity metrics
- Cost tracking
- Performance metrics

### 8. Notifications - SNS & SES

**Amazon SNS (Simple Notification Service)**:

- Pub/sub messaging for system events
- Topics: user-events, test-events, community-events
- Subscribers: Lambda functions, email, SMS

**Amazon SES (Simple Email Service)**:

- Transactional emails (welcome, verification, password reset)
- Study plan reminders
- Weekly progress reports
- Community notifications

**Email Templates**:

```
- welcome.html          (Welcome new users)
- verify-email.html     (Email verification)
- password-reset.html   (Password reset link)
- study-reminder.html   (Daily study reminders)
- progress-report.html  (Weekly progress summary)
- community-digest.html (Community activity)
```

---

## Data Flow Diagrams

### User Authentication Flow

```
┌──────────┐
│  User    │
└────┬─────┘
     │ 1. Click "Sign in with Google"
     ▼
┌──────────────────┐
│  Next.js Frontend│
└────┬─────────────┘
     │ 2. Redirect to Cognito Hosted UI
     ▼
┌─────────────────┐
│  Cognito        │
│  Hosted UI      │
└────┬────────────┘
     │ 3. Redirect to Google OAuth
     ▼
┌──────────────────┐
│  Google OAuth    │
└────┬─────────────┘
     │ 4. User grants permission
     ▼
┌─────────────────┐
│  Cognito        │
│  User Pool      │
└────┬────────────┘
     │ 5. Return JWT tokens
     ▼
┌──────────────────┐
│  Next.js Frontend│
│  (Store tokens)  │
└────┬─────────────┘
     │ 6. Make API calls with token
     ▼
┌──────────────────┐
│  API Gateway     │
│  (Validate token)│
└────┬─────────────┘
     │ 7. Invoke Lambda
     ▼
┌──────────────────┐
│  Lambda Function │
└──────────────────┘
```

### Taking a Practice Test Flow

```
┌──────────┐
│  User    │
└────┬─────┘
     │ 1. Browse available tests
     ▼
┌──────────────────┐        ┌──────────────┐
│  Next.js App     │───────►│ API Gateway  │
└──────────────────┘        └──────┬───────┘
                                   │ 2. GET /tests
                                   ▼
                            ┌────────────────┐      ┌─────────────┐
                            │ Tests Lambda   │─────►│ RDS         │
                            └────────┬───────┘      │ PostgreSQL  │
                                   │                └─────────────┘
                                   │ 3. Return test list
                                   ▼
                            ┌──────────────┐
                            │ CloudFront   │◄─────┐
                            │ (cache imgs) │      │
                            └──────┬───────┘      │
                                   │              │ Question images
                                   ▼              │
                            ┌──────────────┐      │
                            │ User starts  │      │
                            │ test         │      │
                            └──────┬───────┘      │
                                   │ 4. POST /tests/{id}/start
                                   ▼              │
                            ┌────────────────┐    │
                            │ Tests Lambda   │    │
                            │ (fetch Q's)    │────┘
                            └────────┬───────┘
                                   │ 5. Record start in DynamoDB
                                   ▼
                            ┌────────────────┐
                            │ DynamoDB       │
                            │ (Progress)     │
                            └────────────────┘
                                   │
                            User answers questions
                                   │
                                   ▼
                            ┌────────────────┐
                            │ Submit test    │
                            └────────┬───────┘
                                   │ 6. POST /tests/{id}/submit
                                   ▼
                            ┌────────────────┐
                            │ Tests Lambda   │
                            │ (grade test)   │
                            └────────┬───────┘
                                   │ 7. Calculate score
                                   ▼
                            ┌────────────────┐
                            │ DynamoDB       │
                            │ (save progress)│
                            └────────┬───────┘
                                   │ 8. Publish event
                                   ▼
                            ┌────────────────┐
                            │ SNS Topic      │
                            │ (test-events)  │
                            └────────┬───────┘
                                   │
                        ┌──────────┴──────────┐
                        ▼                     ▼
                ┌────────────────┐   ┌────────────────┐
                │ Analytics      │   │ Email Lambda   │
                │ Lambda         │   │ (send report)  │
                └────────────────┘   └────────┬───────┘
                                              │
                                              ▼
                                     ┌────────────────┐
                                     │ SES            │
                                     │ (send email)   │
                                     └────────────────┘
```

### Video Upload & Streaming Flow

```
Admin Upload Flow:
┌──────────┐
│  Admin   │
└────┬─────┘
     │ 1. Request upload URL
     ▼
┌──────────────────┐        ┌──────────────┐
│  Admin Panel     │───────►│ API Gateway  │
└──────────────────┘        └──────┬───────┘
                                   │ 2. POST /videos/upload
                                   ▼
                            ┌────────────────┐
                            │ Videos Lambda  │
                            └────────┬───────┘
                                   │ 3. Generate presigned POST URL
                                   ▼
                            ┌────────────────┐
                            │ S3 (raw/)      │
                            └────────┬───────┘
                                   │ 4. Direct upload from browser
                                   ▼
                            ┌────────────────┐
                            │ S3 Event       │
                            │ Notification   │
                            └────────┬───────┘
                                   │ 5. Trigger processing
                                   ▼
                            ┌────────────────┐
                            │ Processing     │
                            │ Lambda         │
                            └────────┬───────┘
                                   │ 6. Save metadata
                        ┌──────────┴──────────┐
                        ▼                     ▼
                ┌────────────────┐   ┌────────────────┐
                │ RDS            │   │ S3 (processed/)│
                │ (video meta)   │   │                │
                └────────────────┘   └────────────────┘

Student Viewing Flow:
┌──────────┐
│ Student  │
└────┬─────┘
     │ 1. Browse videos
     ▼
┌──────────────────┐        ┌──────────────┐
│  Next.js App     │───────►│ API Gateway  │
└──────────────────┘        └──────┬───────┘
                                   │ 2. GET /videos
                                   ▼
                            ┌────────────────┐      ┌─────────────┐
                            │ Videos Lambda  │─────►│ RDS         │
                            └────────┬───────┘      │ (video list)│
                                   │                └─────────────┘
                                   │ 3. Select video
                                   ▼
                            ┌────────────────┐
                            │ Generate signed│
                            │ CloudFront URL │
                            └────────┬───────┘
                                   │ 4. Return signed URL
                                   ▼
                            ┌────────────────┐
                            │ CloudFront CDN │
                            │ (stream video) │
                            └────────┬───────┘
                                   │ 5. Fetch from S3
                                   ▼
                            ┌────────────────┐
                            │ S3 (processed/)│
                            │ (video file)   │
                            └────────────────┘
```

---

## Security Architecture

### Defense in Depth Strategy

```
Layer 1: Edge Protection
├── CloudFront (DDoS protection, WAF)
├── AWS Shield Standard (automatic)
└── SSL/TLS encryption

Layer 2: API Security
├── API Gateway (throttling, authorization)
├── Cognito JWT validation
├── Request validation
└── Rate limiting

Layer 3: Application Security
├── Lambda (business logic validation)
├── Input sanitization
├── Output encoding
└── Least privilege IAM roles

Layer 4: Data Security
├── Encryption at rest (DynamoDB, RDS, S3)
├── Encryption in transit (HTTPS/TLS)
├── KMS key management
└── Backup and recovery
```

### IAM Security

**Principle of Least Privilege**:

- Each Lambda function has its own IAM role
- Roles grant only necessary permissions
- No wildcard permissions in production

**Sample Lambda IAM Role**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query"],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/Users"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

### Data Encryption

**At Rest**:

- DynamoDB: AWS-managed encryption keys (default)
- RDS: Customer-managed KMS keys
- S3: Server-side encryption (SSE-S3 or SSE-KMS)

**In Transit**:

- HTTPS only (CloudFront redirects HTTP to HTTPS)
- TLS 1.2+ minimum
- Certificate pinning for mobile apps

### Authentication & Authorization

**JWT Token Structure**:

```json
{
  "sub": "user-id-123",
  "email": "student@uta.edu",
  "cognito:groups": ["students"],
  "custom:university": "UTA",
  "custom:major": "Computer Science",
  "exp": 1704067200
}
```

**Authorization Levels**:

- **Public**: Landing page, marketing content
- **Authenticated**: All logged-in users
- **Student**: Standard user features
- **Instructor**: Content creation, analytics
- **Admin**: User management, system configuration

### Security Best Practices

1. **Never store secrets in code**

   - Use AWS Secrets Manager or Parameter Store
   - Rotate secrets regularly

2. **Validate all inputs**

   - Schema validation with Joi/Zod
   - SQL injection prevention (parameterized queries)
   - NoSQL injection prevention (SDK methods)
   - XSS prevention (DOMPurify)

3. **Implement rate limiting**

   - API Gateway throttling
   - Lambda concurrent execution limits
   - DynamoDB on-demand mode (auto-throttle)

4. **Monitor security events**

   - CloudTrail for API audit logs
   - CloudWatch alarms for suspicious activity
   - AWS Config for compliance monitoring

5. **Regular security audits**
   - AWS Trusted Advisor checks
   - Third-party security scans
   - Penetration testing (with AWS approval)

---

## Scalability Strategy

### Current Architecture (0-1K users)

- **Frontend**: Amplify (serverless, auto-scaling)
- **API**: Lambda (1M free requests)
- **Database**: DynamoDB (25 GB free), RDS t3.micro
- **CDN**: CloudFront (1 TB free)
- **Cost**: $5-15/month

### Scaling Phase 1 (1K-10K users)

**Optimizations**:

1. Enable API Gateway caching (5-minute TTL)
2. Implement Lambda reserved concurrency for critical functions
3. Add DynamoDB auto-scaling (provisioned capacity)
4. Upgrade RDS to t3.small
5. Add ElastiCache Redis for session storage

**Cost**: $100-300/month

### Scaling Phase 2 (10K-50K users)

**Infrastructure Changes**:

1. Migrate to Aurora Serverless v2 (auto-scaling database)
2. Implement DynamoDB Global Tables (multi-region)
3. Add Lambda provisioned concurrency (reduce cold starts)
4. Use CloudFront signed URLs for video streaming
5. Implement SQS for async processing

**Cost**: $500-1,000/month

### Scaling Phase 3 (50K+ users)

**Advanced Architecture**:

1. Multi-region deployment (us-east-1, us-west-2, eu-west-1)
2. Route 53 latency-based routing
3. Aurora Global Database
4. Lambda@Edge for edge computing
5. Step Functions for complex workflows
6. Dedicated NAT Gateways for VPC

**Cost**: $2,000-5,000/month

### Auto-Scaling Configuration

**Lambda**:

```javascript
// Automatic scaling (0 to 1000 concurrent executions)
// No configuration needed - built-in
```

**DynamoDB**:

```javascript
// Auto-scaling configuration
{
  readCapacity: {
    min: 5,
    max: 1000,
    targetUtilization: 70
  },
  writeCapacity: {
    min: 5,
    max: 1000,
    targetUtilization: 70
  }
}
```

**RDS/Aurora**:

```javascript
// Aurora Serverless v2 auto-scaling
{
  minCapacity: 0.5, // ACU (Aurora Capacity Units)
  maxCapacity: 16,
  autoPause: true,
  pauseAfter: 300 // 5 minutes of inactivity
}
```

---

## Cost Projections

### Free Tier (Months 1-12)

**Assumptions**:

- 500 Monthly Active Users
- 50,000 API requests/month
- 10 GB S3 storage
- 100 GB CloudFront data transfer
- 20 hours Lambda execution

| Service        | Free Tier Limit    | Usage   | Cost          |
| -------------- | ------------------ | ------- | ------------- |
| Amplify        | 15 GB + 1K mins    | 5 GB    | $0            |
| Lambda         | 1M + 400K GB-s     | 50K     | $0            |
| API Gateway    | 1M requests        | 50K     | $0            |
| DynamoDB       | 25 GB + 25 RCU/WCU | 10 GB   | $0            |
| RDS (t3.micro) | 750 hours          | 730 hrs | $0            |
| S3             | 5 GB + 20K GET     | 10 GB   | **$4.20**     |
| CloudFront     | 1 TB + 10M req     | 100 GB  | $0            |
| Cognito        | 10K MAU            | 500     | $0            |
| CloudWatch     | 5 GB logs          | 2 GB    | $0            |
| SES            | 62K emails         | 5K      | $0            |
| SNS            | 1M publishes       | 10K     | $0            |
| **TOTAL**      |                    |         | **~$5/month** |

### After Free Tier (Month 13+)

**Assumptions**:

- 1,000 Monthly Active Users
- 100,000 API requests/month
- 50 GB S3 storage
- 500 GB CloudFront data transfer

| Service              | Usage           | Cost/Month            |
| -------------------- | --------------- | --------------------- |
| Amplify              | 20 GB + 1K mins | $5.00                 |
| Lambda               | 100K requests   | $0.20                 |
| API Gateway          | 100K requests   | $0.10                 |
| DynamoDB (On-Demand) | 50 GB storage   | $12.50                |
| Aurora Serverless v2 | 0.5-2 ACU avg   | $60-90                |
| S3                   | 50 GB storage   | $1.15                 |
| CloudFront           | 500 GB transfer | $0 (within free tier) |
| Cognito              | 1K MAU          | $0 (within free tier) |
| CloudWatch           | 10 GB logs      | $2.50                 |
| SES                  | 10K emails      | $1.00                 |
| SNS                  | 50K messages    | $0 (within free tier) |
| **TOTAL**            |                 | **$85-115/month**     |

### Growth Projections

| Users  | Estimated Monthly Cost | Key Expenses                        |
| ------ | ---------------------- | ----------------------------------- |
| 500    | $5-15                  | S3 storage                          |
| 1,000  | $85-115                | Aurora, DynamoDB, Amplify           |
| 5,000  | $300-400               | Database scaling, increased traffic |
| 10,000 | $600-800               | Multi-AZ, caching, video bandwidth  |
| 50,000 | $2,000-3,000           | Multi-region, advanced features     |

### Cost Optimization Tips

1. **Enable S3 Intelligent-Tiering** for automatic cost optimization
2. **Use CloudFront aggressively** to reduce S3 data transfer costs
3. **Implement API caching** to reduce Lambda invocations
4. **Monitor and set budget alarms** to avoid surprises
5. **Use Reserved Instances** for predictable RDS workloads (after free tier)
6. **Compress assets** before uploading to S3
7. **Delete old logs** with lifecycle policies
8. **Use provisioned capacity** for DynamoDB if traffic is predictable

---

## Disaster Recovery & Business Continuity

### Backup Strategy

**DynamoDB**:

- Point-in-time recovery enabled
- On-demand backups before major changes
- Cross-region replication for critical tables

**RDS**:

- Automated daily backups (7-day retention)
- Manual snapshots before deployments
- Multi-AZ for production (not in free tier)

**S3**:

- Versioning enabled
- Cross-region replication for critical buckets
- Lifecycle policies for long-term archival

### Recovery Time Objectives (RTO)

| Component | RTO       | RPO   | Strategy                 |
| --------- | --------- | ----- | ------------------------ |
| Frontend  | < 1 hour  | 0     | Redeploy from Git        |
| Lambda    | < 15 min  | 0     | Redeploy functions       |
| DynamoDB  | < 1 hour  | 5 min | Point-in-time recovery   |
| RDS       | < 4 hours | 5 min | Restore from snapshot    |
| S3        | < 2 hours | 0     | Cross-region replication |

### Incident Response

1. **Detection**: CloudWatch alarms trigger SNS notifications
2. **Assessment**: Team reviews logs and metrics
3. **Containment**: Disable affected components, enable maintenance mode
4. **Recovery**: Restore from backups or redeploy
5. **Post-Mortem**: Document incident, improve processes

---

## Next Steps

### Phase 1: Setup (Week 1-2)

1. Create AWS account
2. Set up billing alerts
3. Configure Cognito User Pool
4. Deploy basic Lambda + API Gateway
5. Test authentication flow

### Phase 2: Database (Week 3-4)

1. Create DynamoDB tables
2. Set up RDS PostgreSQL
3. Implement database schemas
4. Test CRUD operations
5. Set up backups

### Phase 3: Core Features (Week 5-10)

1. Implement practice tests
2. Build flashcard system
3. Create study plan generator
4. Develop progress analytics
5. Frontend integration

### Phase 4: Content & Community (Week 11-14)

1. Set up video storage and streaming
2. Implement community forums
3. Build Q&A functionality
4. Add gamification

### Phase 5: Launch (Week 15-16)

1. Security audit
2. Performance testing
3. Documentation
4. Soft launch to UTA students
5. Gather feedback and iterate

---

## Conclusion

This AWS architecture provides a solid foundation for MavPrep, balancing cost-effectiveness with scalability, security, and performance. By leveraging AWS Free Tier services and serverless technologies, we can build a production-ready platform for under $15/month initially, scaling seamlessly as the user base grows.

**Key Advantages**:

- Minimal upfront infrastructure costs
- Pay-as-you-grow pricing model
- Enterprise-grade security and reliability
- Global scalability with CloudFront CDN
- Automated backups and disaster recovery
- Comprehensive monitoring and alerting

For detailed implementation guidance, refer to:

- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Complete database designs
- [API_DESIGN.md](./API_DESIGN.md) - API specifications and endpoints
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Step-by-step deployment instructions
- [COST_OPTIMIZATION.md](./COST_OPTIMIZATION.md) - Cost management strategies
