# MavPrep Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [AWS Account Setup](#aws-account-setup)
3. [Infrastructure Deployment](#infrastructure-deployment)
4. [Database Setup](#database-setup)
5. [Backend Deployment](#backend-deployment)
6. [Frontend Deployment](#frontend-deployment)
7. [Post-Deployment Configuration](#post-deployment-configuration)
8. [Testing & Validation](#testing--validation)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

Install the following tools on your development machine:

```bash
# Node.js 20+ and npm
node --version  # Should be 20.x or higher
npm --version

# AWS CLI v2
aws --version  # Should be 2.x

# AWS CDK
npm install -g aws-cdk
cdk --version

# Git
git --version

# PostgreSQL client (for database management)
psql --version
```

### Required Accounts

1. **AWS Account** (create before July 15, 2025 for 12-month free tier)
2. **GitHub Account** (for CI/CD)
3. **Google Cloud Console** (for OAuth)
4. **Microsoft Azure Portal** (for OAuth)
5. **Apple Developer Account** (for Sign in with Apple)

### Knowledge Requirements

- Basic understanding of AWS services
- Familiarity with command line
- Understanding of Git and GitHub
- Basic knowledge of Next.js and React

---

## AWS Account Setup

### Step 1: Create AWS Account

1. Go to [aws.amazon.com](https://aws.amazon.com)
2. Click "Create an AWS Account"
3. Fill in email, password, and account name
4. Enter billing information (credit card required, but won't be charged if staying within free tier)
5. Verify identity (phone verification)
6. Select "Free" support plan
7. Complete account creation

### Step 2: Secure Your Account

```bash
# 1. Enable MFA on root account
- Go to IAM Console > Security Credentials
- Enable MFA using authenticator app (Google Authenticator, Authy)

# 2. Create IAM user for administration
aws iam create-user --user-name mavprep-admin

# 3. Attach AdministratorAccess policy
aws iam attach-user-policy \
  --user-name mavprep-admin \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# 4. Create access keys
aws iam create-access-key --user-name mavprep-admin
```

**Save the access keys securely!**

### Step 3: Configure AWS CLI

```bash
# Configure AWS CLI with your credentials
aws configure

AWS Access Key ID [None]: YOUR_ACCESS_KEY
AWS Secret Access Key [None]: YOUR_SECRET_KEY
Default region name [None]: us-east-1
Default output format [None]: json

# Verify configuration
aws sts get-caller-identity
```

### Step 4: Set Up Billing Alerts

```bash
# Create budget alarm for $50/month
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget file://budget.json

# budget.json
{
  "BudgetName": "MavPrep-Monthly-Budget",
  "BudgetLimit": {
    "Amount": "50",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}
```

### Step 5: Create CloudWatch Billing Alarm

```bash
# Enable billing alerts in CloudWatch
aws cloudwatch put-metric-alarm \
  --alarm-name "MavPrep-Billing-Alarm" \
  --alarm-description "Alert when estimated charges exceed $50" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --evaluation-periods 1 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=Currency,Value=USD \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:billing-alerts
```

---

## Infrastructure Deployment

### Step 1: Clone Repository

```bash
git clone https://github.com/your-org/mavprep.git
cd mavprep
```

### Step 2: Initialize CDK Project

```bash
# Create infrastructure directory
mkdir infrastructure
cd infrastructure

# Initialize CDK project
cdk init app --language=typescript

# Install dependencies
npm install @aws-cdk/aws-amplify \
            @aws-cdk/aws-cognito \
            @aws-cdk/aws-dynamodb \
            @aws-cdk/aws-rds \
            @aws-cdk/aws-s3 \
            @aws-cdk/aws-cloudfront \
            @aws-cdk/aws-lambda \
            @aws-cdk/aws-apigatewayv2 \
            @aws-cdk/aws-sns \
            @aws-cdk/aws-ses
```

### Step 3: Define Infrastructure Stack

Create `lib/mavprep-stack.ts`:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';

export class MavPrepStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, 'MavPrepUsers', {
      selfSignUpEnabled: true,
      signInAliases: { email: true, username: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
      },
    });

    // DynamoDB Tables
    const usersTable = new dynamodb.Table(this, 'Users', {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
    });

    // RDS PostgreSQL
    const vpc = new ec2.Vpc(this, 'MavPrepVPC', {
      maxAzs: 2,
      natGateways: 0, // No NAT gateway (use free tier)
    });

    const database = new rds.DatabaseInstance(this, 'MavPrepDB', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
      vpc,
      allocatedStorage: 20,
      storageEncrypted: true,
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: false,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
    });

    // S3 Buckets
    const videoBucket = new s3.Bucket(this, 'VideoBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.INTELLIGENT_TIERING,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
        },
      ],
    });

    // Lambda Function Example
    const testLambda = new lambda.Function(this, 'TestsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda/tests'),
      handler: 'index.handler',
      environment: {
        USERS_TABLE: usersTable.tableName,
        DATABASE_URL: database.secret?.secretArn || '',
      },
      timeout: cdk.Duration.seconds(30),
    });

    // API Gateway
    const api = new apigateway.HttpApi(this, 'MavPrepAPI', {
      corsPreflight: {
        allowOrigins: ['https://mavprep.com', 'http://localhost:3000'],
        allowMethods: [apigateway.CorsHttpMethod.ANY],
        allowHeaders: ['*'],
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
    });

    new cdk.CfnOutput(this, 'APIEndpoint', {
      value: api.url || '',
    });
  }
}
```

### Step 4: Deploy Infrastructure

```bash
# Bootstrap CDK (one-time setup)
cdk bootstrap aws://ACCOUNT_ID/us-east-1

# Synthesize CloudFormation template
cdk synth

# Deploy stack
cdk deploy

# Confirm changes when prompted
Do you wish to deploy these changes (y/n)? y
```

**Deployment takes 10-15 minutes.**

---

## Database Setup

### Step 1: Connect to RDS PostgreSQL

```bash
# Get database endpoint from CDK outputs or AWS Console
DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier mavprepdb \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

# Get database password from Secrets Manager
DB_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id rds!db-xxxxx \
  --query 'SecretString' \
  --output text | jq -r '.password')

# Connect to database
psql -h $DB_ENDPOINT -U postgres -d postgres
```

### Step 2: Create Database and Schema

```sql
-- Create database
CREATE DATABASE mavprep;

-- Connect to database
\c mavprep

-- Create subjects table
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  university VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create topics table
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  name VARCHAR(255) NOT NULL,
  order_index INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create questions table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id),
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL,
  difficulty_level VARCHAR(20) NOT NULL,
  points INTEGER DEFAULT 1,
  explanation TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create question_options table
CREATE TABLE question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id),
  option_text TEXT NOT NULL,
  option_label VARCHAR(10),
  is_correct BOOLEAN DEFAULT FALSE,
  order_index INTEGER NOT NULL
);

-- Create indexes
CREATE INDEX idx_topics_subject ON topics(subject_id);
CREATE INDEX idx_questions_topic ON questions(topic_id);
CREATE INDEX idx_options_question ON question_options(question_id);

-- Insert sample data
INSERT INTO subjects (code, name, university) VALUES
('MATH 1426', 'Calculus I', 'UTA'),
('CSE 1325', 'Object-Oriented Programming', 'UTA');
```

### Step 3: Run Database Migrations

```bash
# Using Knex.js migrations
npm install knex pg

# Initialize Knex
npx knex init

# Create migration
npx knex migrate:make create_initial_schema

# Run migrations
npx knex migrate:latest

# Rollback if needed
npx knex migrate:rollback
```

---

## Backend Deployment

### Step 1: Prepare Lambda Functions

```bash
# Create Lambda function directory structure
mkdir -p lambda/auth
mkdir -p lambda/tests
mkdir -p lambda/progress
mkdir -p lambda/flashcards
mkdir -p lambda/videos
mkdir -p lambda/community

# Install dependencies for each function
cd lambda/auth
npm init -y
npm install @aws-sdk/client-cognito-identity-provider \
            @aws-sdk/client-dynamodb \
            jsonwebtoken

# Create index.js
cat > index.js <<'EOF'
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const dynamodb = new DynamoDBClient({ region: "us-east-1" });

export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  try {
    // Your Lambda logic here

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ message: "Success" })
    };
  } catch (error) {
    console.error("Error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
EOF
```

### Step 2: Deploy Lambda Functions

```bash
# Package Lambda function
zip -r function.zip .

# Update Lambda function
aws lambda update-function-code \
  --function-name TestsFunction \
  --zip-file fileb://function.zip

# Publish new version
aws lambda publish-version \
  --function-name TestsFunction
```

### Step 3: Configure API Gateway

```bash
# Create HTTP API route
aws apigatewayv2 create-route \
  --api-id API_ID \
  --route-key 'GET /tests' \
  --target integrations/INTEGRATION_ID

# Create integration
aws apigatewayv2 create-integration \
  --api-id API_ID \
  --integration-type AWS_PROXY \
  --integration-uri arn:aws:lambda:us-east-1:ACCOUNT_ID:function:TestsFunction \
  --payload-format-version 2.0
```

### Step 4: Set Up Environment Variables

```bash
# Create .env file for Lambda functions
cat > .env <<EOF
DATABASE_URL=postgresql://user:pass@endpoint:5432/mavprep
DYNAMODB_TABLE=MavPrep-Users
USER_POOL_ID=us-east-1_xxxxx
JWT_SECRET=your-secret-key
EOF

# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name mavprep/database \
  --secret-string file://.env
```

---

## Frontend Deployment

### Step 1: Configure Amplify

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize Amplify
cd mavprep-landing
amplify init

? Enter a name for the project: mavprep
? Enter a name for the environment: prod
? Choose your default editor: Visual Studio Code
? Choose the type of app: javascript
? What javascript framework: react
? Source Directory Path: src
? Distribution Directory Path: .next
? Build Command: npm run build
? Start Command: npm run dev
```

### Step 2: Connect to GitHub

```bash
# Create GitHub repository (if not exists)
gh repo create mavprep --public

# Push code
git add .
git commit -m "Initial commit"
git push origin main
```

### Step 3: Deploy with Amplify

```bash
# Via AWS Console:
1. Go to AWS Amplify Console
2. Click "New app" > "Host web app"
3. Connect GitHub repository
4. Select branch: main
5. Configure build settings (auto-detected for Next.js)
6. Review and deploy

# Or via CLI:
amplify add hosting

? Select the plugin module to execute: Amazon CloudFront and S3
? Select a domain: <your-domain> or use Amplify domain
? Do you want to use a CloudFront CDN? Yes

amplify publish
```

### Step 4: Configure Environment Variables

```bash
# In Amplify Console, add environment variables:
NEXT_PUBLIC_API_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/v1
NEXT_PUBLIC_USER_POOL_ID=us-east-1_xxxxx
NEXT_PUBLIC_USER_POOL_CLIENT_ID=xxxxx
NEXT_PUBLIC_COGNITO_DOMAIN=mavprep.auth.us-east-1.amazoncognito.com
```

### Step 5: Configure Custom Domain (Optional)

```bash
# Add custom domain in Amplify Console
1. Go to Domain management
2. Add domain: mavprep.com
3. Configure DNS (create CNAME records as shown)
4. Wait for SSL certificate validation (5-30 minutes)
5. Domain will be available at https://mavprep.com
```

---

## Post-Deployment Configuration

### Step 1: Configure Cognito OAuth

**Google OAuth:**
```bash
1. Go to Google Cloud Console
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URI:
   https://mavprep.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
4. Copy Client ID and Client Secret
5. Add to Cognito User Pool > Identity Providers > Google
```

**Microsoft OAuth:**
```bash
1. Go to Azure Portal > App Registrations
2. Create new registration
3. Add redirect URI (same as above)
4. Copy Application (client) ID and Client Secret
5. Add to Cognito User Pool > Identity Providers > Microsoft
```

### Step 2: Upload Initial Content

```bash
# Upload sample questions to database
psql -h $DB_ENDPOINT -U postgres -d mavprep < sample-data.sql

# Upload video thumbnails to S3
aws s3 sync ./thumbnails s3://mavprep-videos-production/thumbnails/

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

### Step 3: Configure Monitoring

```bash
# Create CloudWatch Dashboard
aws cloudwatch put-dashboard \
  --dashboard-name MavPrep-Production \
  --dashboard-body file://dashboard.json

# Set up alarms
aws cloudwatch put-metric-alarm \
  --alarm-name "Lambda-Errors-High" \
  --alarm-description "Alert when Lambda error rate > 5%" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

---

## Testing & Validation

### Step 1: Smoke Tests

```bash
# Test API health check
curl https://api.mavprep.com/v1/health

# Test authentication
curl -X POST https://api.mavprep.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'

# Test protected endpoint
curl https://api.mavprep.com/v1/tests \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 2: Frontend Tests

```bash
cd mavprep-landing

# Run unit tests
npm test

# Run E2E tests with Playwright
npm run test:e2e

# Check build
npm run build
```

### Step 3: Load Testing

```bash
# Using Artillery
npm install -g artillery

# Create load test config
cat > load-test.yml <<EOF
config:
  target: https://api.mavprep.com
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Test API"
    flow:
      - get:
          url: "/v1/tests"
          headers:
            Authorization: "Bearer {{token}}"
EOF

# Run load test
artillery run load-test.yml
```

---

## Troubleshooting

### Common Issues

**Issue 1: Lambda Timeout**
```bash
# Increase timeout
aws lambda update-function-configuration \
  --function-name TestsFunction \
  --timeout 30
```

**Issue 2: RDS Connection Failed**
```bash
# Check security group
aws ec2 describe-security-groups \
  --group-ids sg-xxxxx

# Add inbound rule for PostgreSQL
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 5432 \
  --cidr 0.0.0.0/0  # For testing only, restrict in production
```

**Issue 3: Amplify Build Failed**
```bash
# Check build logs in Amplify Console
# Common fixes:
1. Verify build command in amplify.yml
2. Check environment variables
3. Ensure all dependencies in package.json
4. Clear build cache and retry
```

**Issue 4: CORS Errors**
```bash
# Update API Gateway CORS
aws apigatewayv2 update-api \
  --api-id API_ID \
  --cors-configuration AllowOrigins=https://mavprep.com,AllowMethods=*,AllowHeaders=*
```

### Debugging Tips

```bash
# View Lambda logs
aws logs tail /aws/lambda/TestsFunction --follow

# View API Gateway logs
aws logs tail /aws/apigateway/mavprep-api --follow

# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=TestsFunction \
  --start-time 2025-01-20T00:00:00Z \
  --end-time 2025-01-20T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

---

## Conclusion

You now have a fully deployed MavPrep platform on AWS!

**Next Steps:**
1. Set up CI/CD pipeline
2. Configure monitoring dashboards
3. Add more content (questions, videos)
4. Invite beta users
5. Gather feedback and iterate

**Support:**
- AWS Documentation: https://docs.aws.amazon.com
- MavPrep Issues: https://github.com/your-org/mavprep/issues
- Team Discord: #mavprep-dev

---

## Appendix

### Useful AWS Commands

```bash
# List all resources
aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=Project,Values=MavPrep

# Estimate monthly costs
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost

# Delete all resources (cleanup)
cdk destroy
```

### Environment Variables Reference

```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=https://api.mavprep.com/v1
NEXT_PUBLIC_USER_POOL_ID=us-east-1_xxxxx
NEXT_PUBLIC_USER_POOL_CLIENT_ID=xxxxx
NEXT_PUBLIC_COGNITO_DOMAIN=mavprep.auth.us-east-1.amazoncognito.com

# Backend Lambda (.env)
DATABASE_URL=postgresql://user:pass@endpoint:5432/mavprep
DYNAMODB_USERS_TABLE=MavPrep-Users
USER_POOL_ID=us-east-1_xxxxx
JWT_SECRET=your-secret-key
AWS_REGION=us-east-1
```
