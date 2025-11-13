# MavPrep API Design Specification

## Table of Contents
1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
   - [Authentication API](#authentication-api)
   - [Tests API](#tests-api)
   - [Questions API](#questions-api)
   - [Progress API](#progress-api)
   - [Flashcards API](#flashcards-api)
   - [Study Plans API](#study-plans-api)
   - [Videos API](#videos-api)
   - [Community API](#community-api)
   - [Analytics API](#analytics-api)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [Pagination](#pagination)
7. [Versioning](#versioning)

---

## API Overview

### Base URL
```
Production:  https://api.mavprep.com/v1
Staging:     https://staging-api.mavprep.com/v1
Development: http://localhost:3000/api/v1
```

### API Principles

- **RESTful Design**: Resources as nouns, HTTP methods as verbs
- **JSON Format**: All requests and responses in JSON
- **HTTPS Only**: All endpoints require HTTPS in production
- **Versioned**: API version in URL path (`/v1`)
- **Stateless**: Each request contains all necessary information
- **Idempotent**: PUT and DELETE operations are idempotent

### HTTP Methods

| Method | Usage | Idempotent |
|--------|-------|------------|
| GET | Retrieve resources | Yes |
| POST | Create new resources | No |
| PUT | Update entire resource | Yes |
| PATCH | Partial update | No |
| DELETE | Delete resource | Yes |

### Content Types

**Request Headers**:
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-API-Version: 1.0
X-Request-ID: <unique-request-id>
```

**Response Headers**:
```http
Content-Type: application/json
X-Request-ID: <same-as-request>
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

---

## Authentication

### Authentication Methods

MavPrep API uses **JWT (JSON Web Tokens)** for authentication, issued by AWS Cognito.

#### 1. Social OAuth (Google, Microsoft, Apple)
```
User → Cognito Hosted UI → OAuth Provider → Cognito → JWT Tokens
```

#### 2. Email/Password
```
POST /auth/login
{
  "email": "student@uta.edu",
  "password": "securePassword123"
}

Response:
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ...",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}
```

### Using Tokens

Include the access token in the `Authorization` header:

```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Refresh

When access token expires, use refresh token:

```http
POST /auth/refresh
{
  "refreshToken": "eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ..."
}
```

### Authorization Levels

| Level | Access | Endpoints |
|-------|--------|-----------|
| **Public** | No auth required | Health check, public content |
| **Authenticated** | Valid JWT token | All user features |
| **Instructor** | Special role | Content creation, analytics |
| **Admin** | Admin role | User management, system config |

---

## API Endpoints

## Authentication API

### POST /auth/signup
**Description**: Register a new user account

**Request**:
```json
{
  "email": "student@uta.edu",
  "password": "SecurePass123!",
  "name": "John Doe",
  "university": "University of Texas at Arlington",
  "major": "Computer Science",
  "graduationYear": 2026
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Account created successfully. Please verify your email.",
  "user": {
    "id": "user123",
    "email": "student@uta.edu",
    "name": "John Doe",
    "emailVerified": false
  }
}
```

**Errors**:
- `400`: Invalid email or password format
- `409`: Email already registered

---

### POST /auth/login
**Description**: Authenticate user and get JWT tokens

**Request**:
```json
{
  "email": "student@uta.edu",
  "password": "SecurePass123!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ...",
  "expiresIn": 3600,
  "user": {
    "id": "user123",
    "email": "student@uta.edu",
    "name": "John Doe",
    "university": "UTA"
  }
}
```

**Errors**:
- `401`: Invalid credentials
- `403`: Email not verified
- `404`: User not found

---

### POST /auth/refresh
**Description**: Refresh access token using refresh token

**Request**:
```json
{
  "refreshToken": "eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

---

### POST /auth/logout
**Description**: Log out user and invalidate tokens

**Request**:
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### POST /auth/forgot-password
**Description**: Request password reset email

**Request**:
```json
{
  "email": "student@uta.edu"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

---

### POST /auth/reset-password
**Description**: Reset password with verification code

**Request**:
```json
{
  "email": "student@uta.edu",
  "code": "123456",
  "newPassword": "NewSecurePass123!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

## Tests API

### GET /tests
**Description**: List available tests

**Authorization**: Required

**Query Parameters**:
- `subjectId` (optional): Filter by subject
- `difficulty` (optional): Filter by difficulty (easy, medium, hard)
- `limit` (optional): Number of results (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Request**:
```http
GET /tests?subjectId=subject101&difficulty=medium&limit=10
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "tests": [
      {
        "id": "test123",
        "name": "Calculus Midterm Practice",
        "description": "Comprehensive test covering derivatives and integrals",
        "subjectId": "subject101",
        "subjectName": "Calculus I",
        "questionCount": 50,
        "duration": 90,
        "passingScore": 70,
        "difficulty": "medium",
        "attemptCount": 1250,
        "averageScore": 78.5,
        "isPublished": true
      }
    ],
    "pagination": {
      "total": 45,
      "limit": 10,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

### GET /tests/{testId}
**Description**: Get test details

**Authorization**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "test123",
    "name": "Calculus Midterm Practice",
    "description": "Comprehensive test covering derivatives and integrals",
    "subjectId": "subject101",
    "subjectName": "Calculus I",
    "duration": 90,
    "totalPoints": 100,
    "passingScore": 70,
    "questionCount": 50,
    "topics": [
      {
        "id": "topic1",
        "name": "Derivatives",
        "questionCount": 25
      },
      {
        "id": "topic2",
        "name": "Integrals",
        "questionCount": 25
      }
    ],
    "instructions": "This is a timed test. You have 90 minutes to complete...",
    "showCorrectAnswers": true,
    "shuffleQuestions": true,
    "allowReview": true,
    "userAttempts": 2,
    "bestScore": 85
  }
}
```

---

### POST /tests/{testId}/start
**Description**: Start a test attempt

**Authorization**: Required

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "attemptId": "attempt789",
    "testId": "test123",
    "startTime": "2025-01-20T15:30:00Z",
    "endTime": "2025-01-20T17:00:00Z",
    "questions": [
      {
        "id": "q1",
        "text": "What is the derivative of x^2?",
        "type": "multiple_choice",
        "points": 2,
        "imageUrl": null,
        "options": [
          { "id": "opt1", "label": "A", "text": "2x" },
          { "id": "opt2", "label": "B", "text": "x^2" },
          { "id": "opt3", "label": "C", "text": "2x^2" },
          { "id": "opt4", "label": "D", "text": "x" }
        ]
      }
    ]
  }
}
```

---

### POST /tests/{testId}/submit
**Description**: Submit test answers

**Authorization**: Required

**Request**:
```json
{
  "attemptId": "attempt789",
  "answers": [
    {
      "questionId": "q1",
      "selectedOptionId": "opt1",
      "timeSpent": 45
    },
    {
      "questionId": "q2",
      "selectedOptionId": "opt3",
      "timeSpent": 120
    }
  ]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "attemptId": "attempt789",
    "score": 85,
    "totalPoints": 100,
    "percentageScore": 85.0,
    "passed": true,
    "correctAnswers": 42,
    "incorrectAnswers": 8,
    "totalQuestions": 50,
    "timeSpent": 4500,
    "results": [
      {
        "questionId": "q1",
        "correct": true,
        "selectedOption": "A",
        "correctOption": "A",
        "explanation": "Using the power rule: d/dx(x^n) = n*x^(n-1)",
        "points": 2
      }
    ],
    "topicPerformance": [
      {
        "topicId": "topic1",
        "topicName": "Derivatives",
        "correct": 20,
        "total": 25,
        "percentage": 80
      }
    ]
  }
}
```

---

### GET /tests/{testId}/results/{attemptId}
**Description**: Get results for a specific test attempt

**Authorization**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "attemptId": "attempt789",
    "testId": "test123",
    "testName": "Calculus Midterm Practice",
    "score": 85,
    "percentageScore": 85.0,
    "passed": true,
    "startTime": "2025-01-20T15:30:00Z",
    "endTime": "2025-01-20T16:45:00Z",
    "timeSpent": 4500,
    "correctAnswers": 42,
    "totalQuestions": 50,
    "topicPerformance": [...],
    "difficultyBreakdown": {...},
    "results": [...]
  }
}
```

---

## Questions API

### GET /questions
**Description**: Search and list questions

**Authorization**: Required (Instructor/Admin)

**Query Parameters**:
- `topicId` (optional): Filter by topic
- `difficulty` (optional): Filter by difficulty
- `type` (optional): Filter by question type
- `search` (optional): Full-text search
- `limit` (optional): Number of results
- `offset` (optional): Pagination offset

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": "q1",
        "text": "What is the derivative of x^2?",
        "type": "multiple_choice",
        "difficulty": "easy",
        "points": 2,
        "topicId": "topic1",
        "topicName": "Derivatives",
        "options": [
          { "label": "A", "text": "2x", "isCorrect": true },
          { "label": "B", "text": "x^2", "isCorrect": false }
        ],
        "explanation": "Using the power rule...",
        "timesAnswered": 1250,
        "correctPercentage": 85.2
      }
    ],
    "pagination": {
      "total": 500,
      "limit": 20,
      "offset": 0
    }
  }
}
```

---

### POST /questions
**Description**: Create a new question

**Authorization**: Required (Instructor/Admin)

**Request**:
```json
{
  "topicId": "topic1",
  "text": "What is the integral of 2x?",
  "type": "multiple_choice",
  "difficulty": "medium",
  "points": 3,
  "explanation": "The integral of 2x is x^2 + C",
  "hint": "Remember the power rule for integration",
  "options": [
    { "label": "A", "text": "x^2 + C", "isCorrect": true },
    { "label": "B", "text": "2x^2 + C", "isCorrect": false },
    { "label": "C", "text": "x + C", "isCorrect": false },
    { "label": "D", "text": "2", "isCorrect": false }
  ]
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "q123",
    "message": "Question created successfully"
  }
}
```

---

## Progress API

### GET /progress/overview
**Description**: Get user's overall progress summary

**Authorization**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "totalTests": 45,
    "averageScore": 82.5,
    "studyTimeMinutes": 3600,
    "studyStreak": 12,
    "questionsAnswered": 2500,
    "correctAnswers": 2100,
    "accuracy": 84.0,
    "subjectsStudied": 5,
    "topicsCompleted": 32,
    "badges": ["first-test", "7-day-streak", "perfect-score"],
    "recentActivity": [
      {
        "date": "2025-01-20",
        "testsCompleted": 2,
        "studyTimeMinutes": 120,
        "questionsAnswered": 100
      }
    ]
  }
}
```

---

### GET /progress/subjects
**Description**: Get progress breakdown by subject

**Authorization**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "subjects": [
      {
        "subjectId": "subject101",
        "subjectName": "Calculus I",
        "testsCompleted": 15,
        "averageScore": 85.5,
        "bestScore": 95,
        "worstScore": 72,
        "timeSpent": 1200,
        "lastStudied": "2025-01-20T15:30:00Z",
        "progressPercent": 75,
        "topics": [
          {
            "topicId": "topic1",
            "topicName": "Derivatives",
            "mastery": 85,
            "questionsAnswered": 150,
            "accuracy": 82
          }
        ],
        "weakAreas": ["limits", "chain-rule"],
        "strongAreas": ["power-rule", "derivatives"]
      }
    ]
  }
}
```

---

### GET /progress/history
**Description**: Get detailed progress history

**Authorization**: Required

**Query Parameters**:
- `startDate` (optional): ISO 8601 date
- `endDate` (optional): ISO 8601 date
- `subjectId` (optional): Filter by subject
- `limit` (optional): Number of results

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "date": "2025-01-20",
        "testsCompleted": 2,
        "averageScore": 85,
        "studyTimeMinutes": 180,
        "questionsAnswered": 100,
        "topicsStudied": ["derivatives", "integrals"]
      }
    ],
    "summary": {
      "totalDays": 30,
      "studyDays": 25,
      "totalStudyTime": 3000,
      "averageScoreTrend": 5.2
    }
  }
}
```

---

## Flashcards API

### GET /flashcards/decks
**Description**: List user's flashcard decks

**Authorization**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "decks": [
      {
        "id": "deck123",
        "name": "Calculus Derivatives",
        "subjectId": "subject101",
        "subjectName": "Calculus I",
        "totalCards": 50,
        "newCards": 5,
        "learningCards": 10,
        "reviewCards": 35,
        "dueCards": 12,
        "created": "2025-01-01T10:00:00Z",
        "lastReviewed": "2025-01-20T14:00:00Z"
      }
    ]
  }
}
```

---

### GET /flashcards/decks/{deckId}/due
**Description**: Get flashcards due for review

**Authorization**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "deckId": "deck123",
    "dueCount": 12,
    "cards": [
      {
        "id": "card456",
        "front": "What is the derivative of x^2?",
        "back": "2x",
        "frontImageUrl": null,
        "backImageUrl": null,
        "interval": 7,
        "easeFactor": 2.5,
        "nextReview": "2025-01-20T10:00:00Z"
      }
    ]
  }
}
```

---

### POST /flashcards
**Description**: Create a new flashcard

**Authorization**: Required

**Request**:
```json
{
  "deckId": "deck123",
  "front": "What is the integral of 2x?",
  "back": "x^2 + C",
  "frontImageUrl": null,
  "backImageUrl": null,
  "tags": ["integrals", "power-rule"]
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "card789",
    "message": "Flashcard created successfully"
  }
}
```

---

### POST /flashcards/{cardId}/review
**Description**: Record flashcard review

**Authorization**: Required

**Request**:
```json
{
  "rating": 2
}
```
*Rating: 0=Again, 1=Hard, 2=Good, 3=Easy*

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "cardId": "card456",
    "interval": 14,
    "nextReview": "2025-02-03T10:00:00Z",
    "easeFactor": 2.6
  }
}
```

---

## Study Plans API

### GET /study-plans
**Description**: List user's study plans

**Authorization**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "plan123",
        "name": "Calculus Final Exam Prep",
        "examDate": "2025-05-15T09:00:00Z",
        "daysUntilExam": 45,
        "targetScore": 90,
        "progress": 65,
        "status": "active",
        "created": "2025-01-15T10:00:00Z"
      }
    ]
  }
}
```

---

### POST /study-plans
**Description**: Create a new study plan

**Authorization**: Required

**Request**:
```json
{
  "name": "Calculus Final Exam Prep",
  "examDate": "2025-05-15T09:00:00Z",
  "targetScore": 90,
  "subjectIds": ["subject101"],
  "studyHoursPerDay": 2,
  "studyDaysPerWeek": 6,
  "preferredStudyTime": "evening"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "plan123",
    "name": "Calculus Final Exam Prep",
    "schedule": [
      {
        "date": "2025-01-22",
        "topics": ["derivatives", "limits"],
        "estimatedTime": 120
      }
    ],
    "milestones": [
      {
        "date": "2025-02-01",
        "description": "Complete all derivative topics"
      }
    ]
  }
}
```

---

### GET /study-plans/{planId}
**Description**: Get study plan details

**Authorization**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "plan123",
    "name": "Calculus Final Exam Prep",
    "examDate": "2025-05-15T09:00:00Z",
    "daysUntilExam": 45,
    "targetScore": 90,
    "progress": 65,
    "subjects": [
      {
        "subjectId": "subject101",
        "subjectName": "Calculus I",
        "currentMastery": 75,
        "targetMastery": 90,
        "topics": [
          {
            "topicId": "topic1",
            "topicName": "Derivatives",
            "scheduledDate": "2025-01-22",
            "completed": true,
            "performance": 85
          }
        ]
      }
    ],
    "milestones": [...],
    "schedule": [...]
  }
}
```

---

### POST /study-plans/{planId}/complete-task
**Description**: Mark a study task as completed

**Authorization**: Required

**Request**:
```json
{
  "topicId": "topic1",
  "performance": 85,
  "timeSpent": 120
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Task marked as completed",
    "updatedProgress": 70
  }
}
```

---

## Videos API

### GET /videos
**Description**: List available video lessons

**Authorization**: Required

**Query Parameters**:
- `topicId` (optional): Filter by topic
- `difficulty` (optional): Filter by difficulty
- `limit` (optional): Number of results
- `offset` (optional): Pagination offset

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "id": "video123",
        "title": "Introduction to Derivatives",
        "description": "Learn the fundamental concepts...",
        "topicId": "topic1",
        "topicName": "Derivatives",
        "duration": 1800,
        "thumbnailUrl": "https://cdn.mavprep.com/thumbnails/video123.jpg",
        "instructorName": "Dr. Jane Smith",
        "difficulty": "beginner",
        "viewCount": 1250,
        "averageRating": 4.8,
        "isFree": true
      }
    ],
    "pagination": {
      "total": 120,
      "limit": 20,
      "offset": 0
    }
  }
}
```

---

### GET /videos/{videoId}
**Description**: Get video details and streaming URL

**Authorization**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "video123",
    "title": "Introduction to Derivatives",
    "description": "Learn the fundamental concepts...",
    "duration": 1800,
    "thumbnailUrl": "https://cdn.mavprep.com/thumbnails/video123.jpg",
    "streamingUrl": "https://d123abc.cloudfront.net/videos/calculus/derivatives/intro.m3u8",
    "qualityLevels": ["360p", "480p", "720p", "1080p"],
    "instructorName": "Dr. Jane Smith",
    "instructorBio": "PhD in Mathematics...",
    "transcript": "In this lesson, we'll explore...",
    "subtitlesUrl": "https://cdn.mavprep.com/subtitles/video123.vtt",
    "slidesUrl": "https://cdn.mavprep.com/slides/video123.pdf",
    "relatedVideos": [
      {
        "id": "video124",
        "title": "Advanced Derivatives",
        "thumbnailUrl": "..."
      }
    ]
  }
}
```

---

### POST /videos/{videoId}/view
**Description**: Track video view

**Authorization**: Required

**Request**:
```json
{
  "watchedSeconds": 1200,
  "completed": false
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "View tracked successfully"
  }
}
```

---

## Community API

### GET /community/subjects
**Description**: List subjects with discussion forums

**Authorization**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "subjects": [
      {
        "id": "subject101",
        "name": "Calculus I",
        "postCount": 1250,
        "activeUsers": 350,
        "recentActivity": "2025-01-20T16:00:00Z"
      }
    ]
  }
}
```

---

### GET /community/{subjectId}/posts
**Description**: List posts in a subject forum

**Authorization**: Required

**Query Parameters**:
- `sort` (optional): hot, new, top, answered (default: hot)
- `filter` (optional): questions, discussions, all (default: all)
- `limit` (optional): Number of results
- `offset` (optional): Pagination offset

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "post123",
        "title": "Help with derivative of sin(x)",
        "content": "I'm struggling to understand...",
        "contentType": "question",
        "userId": "user123",
        "userName": "John Doe",
        "userAvatar": "https://cdn.mavprep.com/avatars/user123.jpg",
        "userReputation": 150,
        "tags": ["derivatives", "trigonometry"],
        "views": 45,
        "likes": 12,
        "commentCount": 8,
        "isAnswered": true,
        "isPinned": false,
        "created": "2025-01-20T15:30:00Z",
        "lastActivity": "2025-01-21T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 500,
      "limit": 20,
      "offset": 0
    }
  }
}
```

---

### POST /community/{subjectId}/posts
**Description**: Create a new post

**Authorization**: Required

**Request**:
```json
{
  "title": "Help with derivative of sin(x)",
  "content": "I'm struggling to understand why the derivative of sin(x) is cos(x)...",
  "contentType": "question",
  "topicId": "topic1",
  "tags": ["derivatives", "trigonometry", "help"]
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "post123",
    "message": "Post created successfully"
  }
}
```

---

### GET /community/posts/{postId}
**Description**: Get post details with comments

**Authorization**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "post": {
      "id": "post123",
      "title": "Help with derivative of sin(x)",
      "content": "I'm struggling to understand...",
      "userId": "user123",
      "userName": "John Doe",
      "views": 45,
      "likes": 12,
      "created": "2025-01-20T15:30:00Z"
    },
    "comments": [
      {
        "id": "comment456",
        "content": "The derivative of sin(x) is cos(x) because...",
        "userId": "user456",
        "userName": "Jane Smith",
        "userReputation": 500,
        "likes": 8,
        "isAnswer": true,
        "created": "2025-01-20T16:00:00Z"
      }
    ]
  }
}
```

---

### POST /community/posts/{postId}/like
**Description**: Like a post

**Authorization**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "liked": true,
    "likeCount": 13
  }
}
```

---

### POST /community/posts/{postId}/comments
**Description**: Add a comment to a post

**Authorization**: Required

**Request**:
```json
{
  "content": "The derivative of sin(x) is cos(x) because..."
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "comment789",
    "message": "Comment added successfully"
  }
}
```

---

### PUT /community/comments/{commentId}/accept
**Description**: Mark comment as accepted answer

**Authorization**: Required (Post author only)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Comment marked as accepted answer"
  }
}
```

---

## Analytics API

### GET /analytics/overview
**Description**: Get user's analytics overview

**Authorization**: Required

**Query Parameters**:
- `period` (optional): 7d, 30d, 90d, 1y (default: 30d)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "period": "30d",
    "studyTime": {
      "total": 3600,
      "average": 120,
      "trend": 15.5
    },
    "performance": {
      "averageScore": 82.5,
      "trend": 5.2,
      "testsCompleted": 45
    },
    "activity": {
      "studyDays": 25,
      "currentStreak": 12,
      "longestStreak": 18
    },
    "subjects": [
      {
        "subjectId": "subject101",
        "subjectName": "Calculus I",
        "timeSpent": 1200,
        "averageScore": 85,
        "progress": 75
      }
    ],
    "chartData": {
      "scoreOverTime": [
        { "date": "2025-01-01", "score": 75 },
        { "date": "2025-01-02", "score": 78 }
      ],
      "studyTimeBySubject": [
        { "subject": "Calculus I", "minutes": 1200 },
        { "subject": "Physics I", "minutes": 800 }
      ]
    }
  }
}
```

---

## Error Handling

### Error Response Format

All API errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "value": "invalid-email",
      "constraint": "Must be a valid email address"
    },
    "timestamp": "2025-01-20T15:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### HTTP Status Codes

| Code | Description | When to Use |
|------|-------------|-------------|
| **200** | OK | Successful GET, PUT, PATCH, DELETE |
| **201** | Created | Successful POST creating a resource |
| **204** | No Content | Successful DELETE with no response body |
| **400** | Bad Request | Invalid request format or parameters |
| **401** | Unauthorized | Missing or invalid authentication token |
| **403** | Forbidden | Authenticated but insufficient permissions |
| **404** | Not Found | Resource doesn't exist |
| **409** | Conflict | Resource already exists or state conflict |
| **422** | Unprocessable Entity | Validation error |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Unexpected server error |
| **503** | Service Unavailable | Service temporarily unavailable |

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 422 | Request validation failed |
| `AUTHENTICATION_ERROR` | 401 | Invalid or missing credentials |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Service down or maintenance |

---

## Rate Limiting

### Limits

| Tier | Requests/Minute | Requests/Hour | Requests/Day |
|------|-----------------|---------------|--------------|
| **Free** | 60 | 1,000 | 10,000 |
| **Student** | 120 | 3,000 | 50,000 |
| **Instructor** | 300 | 10,000 | 100,000 |

### Rate Limit Headers

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1640995200
```

### Rate Limit Error

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again later.",
    "retryAfter": 60
  }
}
```

---

## Pagination

### Query Parameters

```http
GET /tests?limit=20&offset=40
```

- `limit`: Number of results per page (max: 100, default: 20)
- `offset`: Number of results to skip (default: 0)

### Response Format

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "total": 500,
      "limit": 20,
      "offset": 40,
      "hasMore": true
    }
  }
}
```

### Cursor-Based Pagination (Future)

For real-time data with frequent updates:

```http
GET /community/posts?limit=20&cursor=eyJpZCI6InBvc3QxMjMifQ
```

---

## Versioning

### URL Versioning

API version is included in the URL path:

```
https://api.mavprep.com/v1/tests
https://api.mavprep.com/v2/tests  (future)
```

### Version Lifecycle

- **v1**: Current version (stable)
- **v2**: Future version (when breaking changes needed)
- **Deprecation**: 6-month notice before version retirement

---

## Conclusion

This API design provides a comprehensive, RESTful interface for all MavPrep features:

- **Authentication**: Secure JWT-based auth with social OAuth
- **Tests**: Complete test-taking workflow
- **Progress**: Detailed analytics and tracking
- **Flashcards**: Spaced repetition system
- **Study Plans**: AI-generated personalized schedules
- **Videos**: Video streaming and tracking
- **Community**: Forums, Q&A, and discussions
- **Analytics**: Performance insights and visualizations

**Next Steps**:
1. Implement OpenAPI/Swagger specification
2. Set up API Gateway with Lambda integration
3. Implement request validation middleware
4. Add comprehensive API testing
5. Create API documentation site

For implementation details, refer to:
- [AWS_ARCHITECTURE.md](./AWS_ARCHITECTURE.md) - Infrastructure setup
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Database design
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Deployment instructions
