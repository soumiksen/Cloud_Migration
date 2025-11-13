# MavPrep Database Schema Documentation

## Table of Contents
1. [Database Strategy Overview](#database-strategy-overview)
2. [DynamoDB Schema](#dynamodb-schema)
3. [PostgreSQL Schema](#postgresql-schema)
4. [Data Relationships](#data-relationships)
5. [Query Patterns](#query-patterns)
6. [Indexing Strategy](#indexing-strategy)
7. [Data Migration](#data-migration)

---

## Database Strategy Overview

MavPrep uses a **hybrid database approach** combining both NoSQL (DynamoDB) and SQL (PostgreSQL) databases to optimize for different use cases:

### DynamoDB (NoSQL) - For Real-Time, User-Centric Data
**Use Cases:**
- User profiles and preferences (fast lookups)
- Progress tracking (high write volume)
- Flashcard state management (frequent updates)
- Study plans (personalized data)
- Community posts and interactions (flexible schema)

**Benefits:**
- Single-digit millisecond latency
- Automatic scaling
- 25 GB free tier (always free)
- Built-in backup and streams
- Serverless (no infrastructure management)

### PostgreSQL (SQL) - For Structured, Relational Data
**Use Cases:**
- Question bank (complex queries, joins)
- Test templates (relationships between questions/tests/topics)
- Subject hierarchies (tree structures)
- Video lesson catalog (metadata and relationships)
- Analytics aggregations (complex SQL queries)

**Benefits:**
- ACID compliance
- Complex JOIN operations
- Full SQL support
- Data integrity constraints
- Familiar interface

---

## DynamoDB Schema

### Design Principles

**Single Table Design**: Most data in one table with composite keys
- **PK (Partition Key)**: Entity type + ID
- **SK (Sort Key)**: Relationship type + additional identifiers
- **GSI (Global Secondary Indexes)**: For alternative access patterns

**Benefits:**
- Reduced costs (fewer tables)
- Better performance (fewer round trips)
- Atomic transactions within partition

### 1. Users Table

**Purpose**: Store user profiles, settings, and preferences

#### Schema

```javascript
TableName: "MavPrep-Users"
BillingMode: PAY_PER_REQUEST (On-Demand) or PROVISIONED (Free Tier)
PartitionKey: PK (String)
SortKey: SK (String)
```

#### Access Patterns

##### Pattern 1: User Profile
```javascript
{
  PK: "USER#<userId>",
  SK: "PROFILE",
  userId: "user123",
  email: "student@uta.edu",
  name: "John Doe",
  university: "University of Texas at Arlington",
  major: "Computer Science",
  graduationYear: 2026,
  avatarUrl: "https://cdn.mavprep.com/avatars/user123.jpg",
  created: "2025-01-15T10:30:00Z",
  lastLogin: "2025-01-20T14:22:00Z",
  timezone: "America/Chicago",
  emailVerified: true,
  onboardingCompleted: true
}
```

##### Pattern 2: User Settings
```javascript
{
  PK: "USER#<userId>",
  SK: "SETTINGS",
  notifications: {
    email: true,
    push: false,
    studyReminders: true,
    communityUpdates: false,
    weeklyReport: true
  },
  preferences: {
    theme: "dark",
    language: "en",
    difficultyPreference: "medium",
    studyGoalHoursPerDay: 2
  },
  privacy: {
    profileVisible: true,
    shareProgress: false,
    anonymousCommunity: false
  }
}
```

#### Global Secondary Indexes

**GSI 1: Email Index**
```javascript
IndexName: "email-index"
PartitionKey: email
ProjectionType: ALL
Purpose: Look up user by email address
```

**GSI 2: University Index**
```javascript
IndexName: "university-index"
PartitionKey: university
SortKey: created
ProjectionType: ALL
Purpose: Find all users from a specific university
```

### 2. Progress Table

**Purpose**: Track user performance on tests, quizzes, and activities

#### Schema

```javascript
TableName: "MavPrep-Progress"
PartitionKey: PK (String) = "USER#<userId>"
SortKey: SK (String) = "PROGRESS#<testId>#<timestamp>"
```

#### Access Patterns

##### Pattern 1: Test Attempt
```javascript
{
  PK: "USER#user123",
  SK: "PROGRESS#test456#2025-01-20T15:30:00Z",
  attemptId: "attempt789",
  testId: "test456",
  testName: "Calculus Midterm Practice",
  subjectId: "subject101",
  subjectName: "Calculus I",

  // Test Results
  score: 85,
  totalQuestions: 50,
  correctAnswers: 42,
  incorrectAnswers: 8,
  skippedQuestions: 0,
  percentageScore: 84.0,

  // Time Tracking
  startTime: "2025-01-20T15:30:00Z",
  endTime: "2025-01-20T16:45:00Z",
  timeSpentSeconds: 4500,

  // Topic Performance
  topicPerformance: {
    "derivatives": { correct: 8, total: 10, percentage: 80 },
    "integrals": { correct: 9, total: 10, percentage: 90 },
    "limits": { correct: 7, total: 10, percentage: 70 }
  },

  // Difficulty Breakdown
  difficultyBreakdown: {
    easy: { correct: 15, total: 15, percentage: 100 },
    medium: { correct: 20, total: 25, percentage: 80 },
    hard: { correct: 7, total: 10, percentage: 70 }
  },

  // Answers
  answers: [
    { questionId: "q1", selectedOption: "A", correct: true, timeSpent: 45 },
    { questionId: "q2", selectedOption: "C", correct: false, timeSpent: 120 }
  ],

  completed: true,
  graded: true
}
```

##### Pattern 2: Daily Activity Summary
```javascript
{
  PK: "USER#user123",
  SK: "DAILY#2025-01-20",
  date: "2025-01-20",

  // Activity Counts
  testsCompleted: 3,
  questionsAnswered: 150,
  correctAnswers: 120,
  studyTimeMinutes: 180,
  videosWatched: 5,
  flashcardsReviewed: 50,

  // Topics Studied
  topicsStudied: ["calculus", "physics", "chemistry"],
  subjectsStudied: ["Calculus I", "Physics I", "Chemistry 101"],

  // Streaks
  studyStreak: 7,
  loginStreak: 15,

  // Time Distribution
  timeByActivity: {
    tests: 120,
    flashcards: 30,
    videos: 25,
    community: 5
  }
}
```

#### Global Secondary Indexes

**GSI 1: Subject Performance Index**
```javascript
IndexName: "subject-date-index"
PartitionKey: subjectId
SortKey: startTime (timestamp)
ProjectionType: ALL
Purpose: Get user's progress in a specific subject over time
```

**GSI 2: Test Leaderboard Index**
```javascript
IndexName: "test-score-index"
PartitionKey: testId
SortKey: score (Number)
ProjectionType: KEYS_ONLY
Purpose: Get top scores for a specific test
```

### 3. Flashcards Table

**Purpose**: Store flashcards with spaced repetition state

#### Schema

```javascript
TableName: "MavPrep-Flashcards"
PartitionKey: PK (String) = "USER#<userId>"
SortKey: SK (String) = "FLASHCARD#<cardId>"
```

#### Access Patterns

##### Pattern 1: Flashcard Item
```javascript
{
  PK: "USER#user123",
  SK: "FLASHCARD#card456",
  cardId: "card456",
  deckId: "deck789",
  deckName: "Calculus Derivatives",

  // Card Content
  front: "What is the derivative of x^2?",
  back: "2x",
  frontImageUrl: "https://cdn.mavprep.com/equations/derivative1.png",
  backImageUrl: null,

  // Spaced Repetition (SM-2 Algorithm)
  interval: 7,              // Days until next review
  repetition: 3,            // Number of successful reviews
  easeFactor: 2.5,          // Ease factor (2.5 default)
  nextReview: "2025-01-27T10:00:00Z",
  lastReviewed: "2025-01-20T10:00:00Z",

  // Statistics
  reviewCount: 5,
  correctCount: 4,
  incorrectCount: 1,
  averageRating: 2.8,       // 0=Again, 1=Hard, 2=Good, 3=Easy

  // Metadata
  created: "2025-01-01T08:00:00Z",
  tags: ["derivatives", "calculus", "power-rule"],
  source: "user-created"    // or "preset"
}
```

##### Pattern 2: Deck Metadata
```javascript
{
  PK: "USER#user123",
  SK: "DECK#deck789",
  deckId: "deck789",
  deckName: "Calculus Derivatives",
  subjectId: "subject101",

  // Statistics
  totalCards: 50,
  newCards: 5,
  learningCards: 10,
  reviewCards: 35,

  // Settings
  newCardsPerDay: 10,
  reviewsPerDay: 50,

  created: "2025-01-01T08:00:00Z",
  lastReviewed: "2025-01-20T10:00:00Z"
}
```

#### Global Secondary Indexes

**GSI 1: Due Cards Index**
```javascript
IndexName: "deck-nextReview-index"
PartitionKey: deckId
SortKey: nextReview (timestamp)
ProjectionType: ALL
Purpose: Get cards due for review in a specific deck
```

### 4. Study Plans Table

**Purpose**: Store personalized study schedules and milestones

#### Schema

```javascript
TableName: "MavPrep-StudyPlans"
PartitionKey: PK (String) = "USER#<userId>"
SortKey: SK (String) = "PLAN#<planId>"
```

#### Access Patterns

```javascript
{
  PK: "USER#user123",
  SK: "PLAN#plan456",
  planId: "plan456",
  planName: "Calculus Final Exam Prep",

  // Exam Details
  examDate: "2025-05-15T09:00:00Z",
  daysUntilExam: 45,
  targetScore: 90,

  // Subjects and Topics
  subjects: [
    {
      subjectId: "subject101",
      subjectName: "Calculus I",
      priority: 1,
      currentMastery: 75,
      targetMastery: 90,
      topics: [
        {
          topicId: "topic1",
          topicName: "Derivatives",
          scheduledDate: "2025-01-22",
          completed: true,
          performance: 85,
          timeSpent: 120
        },
        {
          topicId: "topic2",
          topicName: "Integrals",
          scheduledDate: "2025-01-25",
          completed: false,
          performance: null,
          timeSpent: 0
        }
      ]
    }
  ],

  // Milestones
  milestones: [
    {
      date: "2025-02-01",
      description: "Complete all derivative topics",
      completed: true,
      completedDate: "2025-01-30"
    },
    {
      date: "2025-03-01",
      description: "Complete all integral topics",
      completed: false
    }
  ],

  // Progress
  overallProgress: 65,
  tasksCompleted: 15,
  tasksTotal: 30,

  // Schedule
  studyHoursPerDay: 2,
  studyDaysPerWeek: 6,
  preferredStudyTime: "evening",

  // Status
  status: "active",         // active, completed, paused, abandoned
  created: "2025-01-15T10:00:00Z",
  lastUpdated: "2025-01-20T14:00:00Z"
}
```

### 5. Community Table

**Purpose**: Store discussion posts, Q&A, and community interactions

#### Schema

```javascript
TableName: "MavPrep-Community"
PartitionKey: PK (String) = "COMMUNITY#<subjectId>" or "TOPIC#<topicId>"
SortKey: SK (String) = "POST#<timestamp>#<postId>"
```

#### Access Patterns

##### Pattern 1: Discussion Post
```javascript
{
  PK: "COMMUNITY#subject101",
  SK: "POST#2025-01-20T15:30:00Z#post123",
  postId: "post123",

  // Content
  title: "Help with derivative of sin(x)",
  content: "I'm struggling to understand why the derivative of sin(x) is cos(x)...",
  contentType: "question",  // question, discussion, announcement

  // Author
  userId: "user123",
  userName: "John Doe",
  userAvatar: "https://cdn.mavprep.com/avatars/user123.jpg",
  userReputation: 150,

  // Categorization
  subjectId: "subject101",
  subjectName: "Calculus I",
  topicId: "topic1",
  topicName: "Derivatives",
  tags: ["derivatives", "trigonometry", "help"],

  // Engagement
  views: 45,
  likes: 12,
  commentCount: 8,

  // Status
  isPinned: false,
  isAnswered: true,
  isClosed: false,
  isReported: false,

  // Timestamps
  created: "2025-01-20T15:30:00Z",
  updated: "2025-01-20T16:45:00Z",
  lastActivityTime: "2025-01-21T10:00:00Z"
}
```

#### Global Secondary Indexes

**GSI 1: User Posts Index**
```javascript
IndexName: "user-created-index"
PartitionKey: userId
SortKey: created (timestamp)
ProjectionType: ALL
Purpose: Get all posts by a specific user
```

**GSI 2: Tags Index**
```javascript
IndexName: "tags-created-index"
PartitionKey: tag (one of the tags)
SortKey: created (timestamp)
ProjectionType: ALL
Purpose: Find posts by tag
```

### 6. Comments Table

**Purpose**: Store comments/replies on community posts

#### Schema

```javascript
TableName: "MavPrep-Comments"
PartitionKey: PK (String) = "POST#<postId>"
SortKey: SK (String) = "COMMENT#<timestamp>#<commentId>"
```

#### Access Patterns

```javascript
{
  PK: "POST#post123",
  SK: "COMMENT#2025-01-20T16:00:00Z#comment456",
  commentId: "comment456",
  postId: "post123",

  // Content
  content: "The derivative of sin(x) is cos(x) because...",

  // Author
  userId: "user456",
  userName: "Jane Smith",
  userAvatar: "https://cdn.mavprep.com/avatars/user456.jpg",
  userReputation: 500,
  userBadges: ["helpful", "expert"],

  // Engagement
  likes: 8,

  // Status
  isAnswer: true,           // Marked as accepted answer
  isEdited: false,
  isReported: false,

  // Timestamps
  created: "2025-01-20T16:00:00Z",
  updated: null
}
```

### 7. User Reputation Table

**Purpose**: Track user reputation, badges, and achievements

#### Schema

```javascript
{
  PK: "USER#user123",
  SK: "REPUTATION",

  // Reputation Score
  reputation: 500,
  reputationHistory: [
    { date: "2025-01-20", change: +15, reason: "Answer accepted" },
    { date: "2025-01-19", change: +5, reason: "Post upvoted" }
  ],

  // Activity Counts
  postsCount: 25,
  answersCount: 40,
  acceptedAnswersCount: 15,
  helpfulVotesReceived: 120,

  // Badges
  badges: [
    {
      id: "first-post",
      name: "First Post",
      description: "Created your first post",
      earnedDate: "2025-01-01"
    },
    {
      id: "helpful",
      name: "Helpful",
      description: "Received 50 helpful votes",
      earnedDate: "2025-01-15"
    }
  ],

  // Rankings
  globalRank: 1234,
  universityRank: 45,
  subjectRanks: {
    "subject101": 12,
    "subject102": 34
  }
}
```

---

## PostgreSQL Schema

### Design Principles

**Normalized Design**: Minimize data redundancy
**Referential Integrity**: Foreign key constraints
**Indexing**: Optimized for query patterns
**Partitioning**: For large tables (future consideration)

### 1. Subjects Table

**Purpose**: Store university courses and subjects

```sql
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  university VARCHAR(255),
  department VARCHAR(255),
  credit_hours INTEGER,
  level VARCHAR(20),      -- undergraduate, graduate
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_subjects_university ON subjects(university);
CREATE INDEX idx_subjects_code ON subjects(code);
CREATE INDEX idx_subjects_active ON subjects(is_active);

-- Sample Data
INSERT INTO subjects (code, name, description, university, department, level) VALUES
('MATH 1426', 'Calculus I', 'Limits, derivatives, and applications', 'UTA', 'Mathematics', 'undergraduate'),
('CSE 1325', 'Object-Oriented Programming', 'Introduction to OOP concepts', 'UTA', 'Computer Science', 'undergraduate');
```

### 2. Topics Table

**Purpose**: Hierarchical topic structure within subjects

```sql
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  parent_topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER,
  difficulty_level VARCHAR(20),  -- beginner, intermediate, advanced
  estimated_study_hours DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_topics_subject ON topics(subject_id);
CREATE INDEX idx_topics_parent ON topics(parent_topic_id);
CREATE INDEX idx_topics_order ON topics(subject_id, order_index);

-- Sample Data
INSERT INTO topics (subject_id, name, description, order_index, difficulty_level) VALUES
('<calculus-subject-id>', 'Limits', 'Introduction to limits and continuity', 1, 'beginner'),
('<calculus-subject-id>', 'Derivatives', 'Differentiation and applications', 2, 'intermediate'),
('<calculus-subject-id>', 'Integrals', 'Integration techniques and applications', 3, 'intermediate');

-- Hierarchical example (sub-topics)
INSERT INTO topics (subject_id, parent_topic_id, name, order_index) VALUES
('<calculus-subject-id>', '<derivatives-topic-id>', 'Power Rule', 1),
('<calculus-subject-id>', '<derivatives-topic-id>', 'Chain Rule', 2),
('<calculus-subject-id>', '<derivatives-topic-id>', 'Product Rule', 3);
```

### 3. Questions Table

**Purpose**: Question bank for tests and practice

```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL,  -- multiple_choice, true_false, short_answer, essay
  difficulty_level VARCHAR(20) NOT NULL,  -- easy, medium, hard
  points INTEGER DEFAULT 1,
  explanation TEXT,
  hint TEXT,

  -- Media
  question_image_url VARCHAR(500),
  explanation_image_url VARCHAR(500),

  -- Metadata
  created_by VARCHAR(255),
  source VARCHAR(100),     -- instructor, community, textbook
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Statistics
  times_answered INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  average_time_seconds INTEGER,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_questions_topic ON questions(topic_id);
CREATE INDEX idx_questions_difficulty ON questions(difficulty_level);
CREATE INDEX idx_questions_type ON questions(question_type);
CREATE INDEX idx_questions_active ON questions(is_active);

-- Full-text search index
CREATE INDEX idx_questions_fulltext ON questions USING GIN(to_tsvector('english', question_text));

-- Sample Data
INSERT INTO questions (topic_id, question_text, question_type, difficulty_level, explanation) VALUES
('<derivatives-topic-id>',
 'What is the derivative of x^2?',
 'multiple_choice',
 'easy',
 'Using the power rule: d/dx(x^n) = n*x^(n-1), we get d/dx(x^2) = 2x^1 = 2x');
```

### 4. Question Options Table

**Purpose**: Answer choices for multiple-choice questions

```sql
CREATE TABLE question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_label VARCHAR(10),    -- A, B, C, D or 1, 2, 3, 4
  is_correct BOOLEAN DEFAULT FALSE,
  order_index INTEGER NOT NULL,
  explanation TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_options_question ON question_options(question_id);

-- Constraint: At least one option must be correct
ALTER TABLE question_options ADD CONSTRAINT check_has_correct_answer
  CHECK (
    EXISTS (
      SELECT 1 FROM question_options qo
      WHERE qo.question_id = question_options.question_id
      AND qo.is_correct = TRUE
    )
  );

-- Sample Data
INSERT INTO question_options (question_id, option_text, option_label, is_correct, order_index) VALUES
('<question-id>', '2x', 'A', TRUE, 1),
('<question-id>', 'x^2', 'B', FALSE, 2),
('<question-id>', '2x^2', 'C', FALSE, 3),
('<question-id>', 'x', 'D', FALSE, 4);
```

### 5. Test Templates Table

**Purpose**: Pre-configured test templates

```sql
CREATE TABLE test_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Configuration
  duration_minutes INTEGER,
  total_points INTEGER,
  passing_score INTEGER,
  shuffle_questions BOOLEAN DEFAULT TRUE,
  shuffle_options BOOLEAN DEFAULT TRUE,
  show_correct_answers BOOLEAN DEFAULT TRUE,
  allow_review BOOLEAN DEFAULT TRUE,

  -- Access Control
  is_published BOOLEAN DEFAULT FALSE,
  is_timed BOOLEAN DEFAULT TRUE,
  requires_proctor BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_tests_subject ON test_templates(subject_id);
CREATE INDEX idx_tests_published ON test_templates(is_published);

-- Sample Data
INSERT INTO test_templates (subject_id, name, description, duration_minutes, passing_score) VALUES
('<calculus-subject-id>',
 'Calculus I Midterm Practice',
 'Comprehensive practice test covering limits, derivatives, and applications',
 90,
 70);
```

### 6. Test Questions Table

**Purpose**: Many-to-many relationship between tests and questions

```sql
CREATE TABLE test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_template_id UUID NOT NULL REFERENCES test_templates(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  points_override INTEGER,    -- Override default question points
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(test_template_id, question_id),
  UNIQUE(test_template_id, order_index)
);

-- Indexes
CREATE INDEX idx_test_questions_test ON test_questions(test_template_id);
CREATE INDEX idx_test_questions_question ON test_questions(question_id);
CREATE INDEX idx_test_questions_order ON test_questions(test_template_id, order_index);

-- Sample Data
INSERT INTO test_questions (test_template_id, question_id, order_index, points_override) VALUES
('<test-id>', '<question1-id>', 1, 2),
('<test-id>', '<question2-id>', 2, 2),
('<test-id>', '<question3-id>', 3, 3);
```

### 7. Video Lessons Table

**Purpose**: Video lesson metadata and relationships

```sql
CREATE TABLE video_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Video Details
  duration_seconds INTEGER NOT NULL,
  quality_levels VARCHAR(50)[],  -- ['360p', '480p', '720p', '1080p']

  -- Storage
  s3_key VARCHAR(500) NOT NULL,
  cloudfront_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),

  -- Instructor
  instructor_name VARCHAR(255),
  instructor_bio TEXT,

  -- Content
  transcript TEXT,
  subtitles_url VARCHAR(500),
  slides_url VARCHAR(500),

  -- Metadata
  difficulty_level VARCHAR(20),
  prerequisites TEXT[],
  tags VARCHAR(100)[],

  -- Statistics
  view_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2),
  rating_count INTEGER DEFAULT 0,

  -- Status
  is_published BOOLEAN DEFAULT FALSE,
  is_free BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_videos_topic ON video_lessons(topic_id);
CREATE INDEX idx_videos_published ON video_lessons(is_published);
CREATE INDEX idx_videos_free ON video_lessons(is_free);
CREATE INDEX idx_videos_tags ON video_lessons USING GIN(tags);

-- Sample Data
INSERT INTO video_lessons (
  topic_id, title, description, duration_seconds,
  s3_key, cloudfront_url, instructor_name
) VALUES (
  '<derivatives-topic-id>',
  'Introduction to Derivatives',
  'Learn the fundamental concept of derivatives and their applications',
  1800,  -- 30 minutes
  'lessons/calculus/derivatives/intro.mp4',
  'https://d123abc.cloudfront.net/lessons/calculus/derivatives/intro.mp4',
  'Dr. Jane Smith'
);
```

### 8. Analytics Table (Optional - For Aggregated Data)

**Purpose**: Pre-aggregated analytics for faster queries

```sql
CREATE TABLE analytics_subject_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  subject_id UUID NOT NULL REFERENCES subjects(id),
  date DATE NOT NULL,

  -- Aggregated Metrics
  tests_taken INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  average_score DECIMAL(5,2),
  study_time_minutes INTEGER DEFAULT 0,

  -- Performance by Difficulty
  easy_correct INTEGER DEFAULT 0,
  easy_total INTEGER DEFAULT 0,
  medium_correct INTEGER DEFAULT 0,
  medium_total INTEGER DEFAULT 0,
  hard_correct INTEGER DEFAULT 0,
  hard_total INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, subject_id, date)
);

-- Indexes
CREATE INDEX idx_analytics_user ON analytics_subject_performance(user_id);
CREATE INDEX idx_analytics_subject ON analytics_subject_performance(subject_id);
CREATE INDEX idx_analytics_date ON analytics_subject_performance(date);
```

---

## Data Relationships

### Entity Relationship Diagram (Text)

```
subjects (1) ──────< (N) topics
   │
   │ (1)
   │
   └────────< (N) test_templates
   │
   │ (1)
   │
   └────────< (N) video_lessons

topics (1) ──────< (N) questions
   │
   │ (1)
   │
   ├──────< (N) topics (self-referencing, parent-child)
   │
   │ (1)
   │
   └────────< (N) video_lessons

questions (1) ──────< (N) question_options
   │
   │ (N)
   │
   └────────< (N) test_questions >──────< (N) test_templates

DynamoDB Relationships:
- Users ──< Progress (1:N)
- Users ──< Flashcards (1:N)
- Users ──< StudyPlans (1:N)
- Users ──< Community Posts (1:N)
- Posts ──< Comments (1:N)
```

---

## Query Patterns

### Common DynamoDB Queries

#### 1. Get User Profile
```javascript
const params = {
  TableName: 'MavPrep-Users',
  Key: {
    PK: 'USER#user123',
    SK: 'PROFILE'
  }
};
const result = await dynamodb.get(params);
```

#### 2. Get User's Test History
```javascript
const params = {
  TableName: 'MavPrep-Progress',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  ExpressionAttributeValues: {
    ':pk': 'USER#user123',
    ':sk': 'PROGRESS#'
  },
  ScanIndexForward: false,  // Descending order (newest first)
  Limit: 20
};
const result = await dynamodb.query(params);
```

#### 3. Get Flashcards Due for Review
```javascript
const params = {
  TableName: 'MavPrep-Flashcards',
  IndexName: 'deck-nextReview-index',
  KeyConditionExpression: 'deckId = :deckId AND nextReview <= :now',
  ExpressionAttributeValues: {
    ':deckId': 'deck789',
    ':now': new Date().toISOString()
  }
};
const result = await dynamodb.query(params);
```

### Common PostgreSQL Queries

#### 1. Get All Questions for a Topic
```sql
SELECT
  q.id,
  q.question_text,
  q.difficulty_level,
  q.points,
  json_agg(
    json_build_object(
      'id', qo.id,
      'text', qo.option_text,
      'label', qo.option_label
    ) ORDER BY qo.order_index
  ) AS options
FROM questions q
LEFT JOIN question_options qo ON q.id = qo.question_id
WHERE q.topic_id = $1
  AND q.is_active = TRUE
GROUP BY q.id
ORDER BY random()  -- Shuffle questions
LIMIT 20;
```

#### 2. Get Test with Questions
```sql
SELECT
  tt.id AS test_id,
  tt.name AS test_name,
  tt.duration_minutes,
  json_agg(
    json_build_object(
      'question_id', q.id,
      'text', q.question_text,
      'type', q.question_type,
      'points', COALESCE(tq.points_override, q.points),
      'options', (
        SELECT json_agg(
          json_build_object(
            'id', qo.id,
            'text', qo.option_text,
            'label', qo.option_label
          ) ORDER BY qo.order_index
        )
        FROM question_options qo
        WHERE qo.question_id = q.id
      )
    ) ORDER BY tq.order_index
  ) AS questions
FROM test_templates tt
JOIN test_questions tq ON tt.id = tq.test_template_id
JOIN questions q ON tq.question_id = q.id
WHERE tt.id = $1
GROUP BY tt.id;
```

#### 3. Get Subject Hierarchy with Topics
```sql
WITH RECURSIVE topic_tree AS (
  -- Base case: top-level topics
  SELECT
    id,
    subject_id,
    parent_topic_id,
    name,
    order_index,
    0 AS level,
    ARRAY[id] AS path
  FROM topics
  WHERE parent_topic_id IS NULL

  UNION ALL

  -- Recursive case: child topics
  SELECT
    t.id,
    t.subject_id,
    t.parent_topic_id,
    t.name,
    t.order_index,
    tt.level + 1,
    tt.path || t.id
  FROM topics t
  JOIN topic_tree tt ON t.parent_topic_id = tt.id
)
SELECT
  s.id AS subject_id,
  s.name AS subject_name,
  json_agg(
    json_build_object(
      'id', tt.id,
      'name', tt.name,
      'level', tt.level,
      'path', tt.path
    ) ORDER BY tt.path
  ) AS topics
FROM subjects s
LEFT JOIN topic_tree tt ON s.id = tt.subject_id
WHERE s.id = $1
GROUP BY s.id;
```

#### 4. Search Questions by Full-Text
```sql
SELECT
  q.id,
  q.question_text,
  q.difficulty_level,
  t.name AS topic_name,
  s.name AS subject_name,
  ts_rank(to_tsvector('english', q.question_text), query) AS rank
FROM questions q
JOIN topics t ON q.topic_id = t.id
JOIN subjects s ON t.subject_id = s.id,
  to_tsquery('english', $1) query
WHERE to_tsvector('english', q.question_text) @@ query
  AND q.is_active = TRUE
ORDER BY rank DESC
LIMIT 20;
```

---

## Indexing Strategy

### DynamoDB Indexes

**Primary Indexes** (required):
- Partition Key (PK)
- Sort Key (SK)

**Global Secondary Indexes** (optional, for alternative access patterns):
- Maximum 20 GSIs per table
- Each GSI has its own read/write capacity
- Consider projection type (KEYS_ONLY, INCLUDE, ALL)

**Best Practices**:
- Use sparse indexes (only items with the indexed attribute)
- Project only necessary attributes (KEYS_ONLY or INCLUDE)
- Monitor GSI throttling separately

### PostgreSQL Indexes

**B-Tree Indexes** (default):
```sql
CREATE INDEX idx_name ON table_name(column_name);
```

**Composite Indexes**:
```sql
CREATE INDEX idx_composite ON table_name(column1, column2);
```

**Partial Indexes** (conditional):
```sql
CREATE INDEX idx_active_questions ON questions(topic_id)
WHERE is_active = TRUE;
```

**GIN Indexes** (arrays, full-text search):
```sql
CREATE INDEX idx_tags ON video_lessons USING GIN(tags);
CREATE INDEX idx_fulltext ON questions USING GIN(to_tsvector('english', question_text));
```

**Best Practices**:
- Index foreign keys
- Index columns used in WHERE, JOIN, ORDER BY
- Monitor index usage with `pg_stat_user_indexes`
- Remove unused indexes

---

## Data Migration

### Initial Data Load

**1. Subject and Topic Data**:
```sql
-- Load from CSV or JSON
COPY subjects(code, name, description, university, department)
FROM '/path/to/subjects.csv'
DELIMITER ','
CSV HEADER;
```

**2. Question Bank Import**:
```javascript
// Import from JSON file
const questions = require('./question-bank.json');

for (const q of questions) {
  await db.query(`
    INSERT INTO questions (topic_id, question_text, question_type, difficulty_level)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `, [q.topicId, q.text, q.type, q.difficulty]);
}
```

### Ongoing Sync

**DynamoDB to PostgreSQL** (for analytics):
```javascript
// Use DynamoDB Streams + Lambda
exports.handler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName === 'INSERT') {
      const item = record.dynamodb.NewImage;
      // Aggregate and insert into PostgreSQL analytics table
      await syncToPostgres(item);
    }
  }
};
```

### Backup Strategy

**DynamoDB**:
- Enable Point-in-Time Recovery (PITR)
- On-demand backups before major changes
- Export to S3 for long-term archival

**PostgreSQL**:
- Automated daily backups (7-day retention)
- Manual snapshots before deployments
- Export to S3 for disaster recovery

---

## Conclusion

This hybrid database design leverages the strengths of both DynamoDB and PostgreSQL:

**DynamoDB** excels at:
- User-specific, real-time data (profiles, progress, flashcards)
- High write throughput (test submissions, activity tracking)
- Flexible schema (community posts, varying user data)
- Free tier benefits (25 GB always free)

**PostgreSQL** excels at:
- Structured, relational data (questions, tests, subjects)
- Complex queries with joins
- Data integrity and ACID compliance
- Analytics and reporting

By using both databases strategically, MavPrep achieves optimal performance, cost-efficiency, and scalability.

**Next Steps**:
1. Review and validate schemas with team
2. Create database initialization scripts
3. Implement data access layer (ORMs, SDKs)
4. Set up database monitoring and alerts
5. Plan data migration strategy
