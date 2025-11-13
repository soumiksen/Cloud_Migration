# MavPrep Cost Optimization Guide

## Table of Contents
1. [Free Tier Maximization](#free-tier-maximization)
2. [Cost Monitoring](#cost-monitoring)
3. [Service-Specific Optimization](#service-specific-optimization)
4. [Architecture Optimization](#architecture-optimization)
5. [Development Best Practices](#development-best-practices)
6. [Cost Allocation & Tagging](#cost-allocation--tagging)
7. [Cleanup Procedures](#cleanup-procedures)

---

## Free Tier Maximization

### Understanding AWS Free Tier

AWS offers three types of free offers:

**Always Free** (No expiration):
- Lambda: 1M requests + 400K GB-seconds/month
- DynamoDB: 25 GB storage + 25 RCU + 25 WCU
- CloudFront: 1 TB data transfer + 10M requests/month
- Cognito: 10,000 MAU
- SNS: 1M publishes/month
- SES: 62K outbound emails/month
- CloudWatch: 5 GB logs + 10 metrics + 10 alarms

**12-Month Free** (New accounts before July 15, 2025):
- EC2: 750 hours/month of t2.micro or t3.micro
- RDS: 750 hours/month of db.t2.micro or db.t3.micro
- S3: 5 GB Standard storage + 20K GET + 2K PUT
- Amplify: 1,000 build minutes + 15 GB served
- API Gateway: 1M HTTP API calls/month
- ElastiCache: 750 hours/month of cache.t2.micro

**Free Trials** (Limited time):
- Various services for 30-90 days

### Strategic Service Selection

**Prioritize Always-Free Services:**
```
1st Choice: Lambda + API Gateway (Always Free)
   - 1M requests/month free forever
   - Perfect for startup phase

2nd Choice: DynamoDB (Always Free)
   - 25 GB free storage forever
   - Single-digit ms latency
   - Auto-scaling included

3rd Choice: CloudFront (Always Free)
   - 1 TB transfer/month free forever
   - Essential for video streaming
```

**Use 12-Month Free Tier Wisely:**
```
RDS PostgreSQL (db.t3.micro):
- 750 hours = 31.25 days/month
- Run 24/7 within free tier
- Plan migration to Aurora Serverless after 12 months

S3 (5 GB):
- Use for critical assets only
- Implement lifecycle policies
- Move old data to Glacier after 90 days
```

### Free Tier Tracking

**Set Up Alerts:**
```bash
# Create budget for free tier tracking
aws budgets create-budget --cli-input-json '{
  "Budget": {
    "BudgetName": "MavPrep-Free-Tier-Budget",
    "BudgetLimit": {
      "Amount": "1",
      "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  },
  "NotificationsWithSubscribers": [
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 0.8
      },
      "Subscribers": [
        {
          "SubscriptionType": "EMAIL",
          "Address": "admin@mavprep.com"
        }
      ]
    }
  ]
}'
```

**Monitor Free Tier Usage:**
- Check AWS Billing Dashboard daily
- Enable "Free Tier Usage Alerts"
- Use AWS Cost Explorer to track trends
- Set CloudWatch alarms for approaching limits

---

## Cost Monitoring

### AWS Cost Explorer

**Enable Cost Explorer:**
```bash
# Via AWS CLI
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

**Create Custom Reports:**
```bash
# Cost by service
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=SERVICE,Key=SERVICE

# Cost by tag (Project=MavPrep)
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=TAG,Key=Project
```

### CloudWatch Billing Alarms

**Thresholds to Set:**
```bash
# Alert at $10 (warning)
aws cloudwatch put-metric-alarm \
  --alarm-name "MavPrep-Cost-Warning" \
  --alarm-description "Warning: Monthly cost approaching $10" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold

# Alert at $25 (critical)
aws cloudwatch put-metric-alarm \
  --alarm-name "MavPrep-Cost-Critical" \
  --alarm-description "Critical: Monthly cost approaching $25" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --evaluation-periods 1 \
  --threshold 25 \
  --comparison-operator GreaterThanThreshold

# Alert at $50 (maximum)
aws cloudwatch put-metric-alarm \
  --alarm-name "MavPrep-Cost-Maximum" \
  --alarm-description "Maximum: Monthly cost exceeded $50 budget" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --evaluation-periods 1 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold
```

### AWS Budgets

**Monthly Budget:**
```json
{
  "BudgetName": "MavPrep-Production-Budget",
  "BudgetLimit": {
    "Amount": "50",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST",
  "CostFilters": {
    "TagKeyValue": ["Project$MavPrep"]
  },
  "NotificationsWithSubscribers": [
    {
      "Notification": {
        "NotificationType": "FORECASTED",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 100
      },
      "Subscribers": [
        {
          "SubscriptionType": "EMAIL",
          "Address": "admin@mavprep.com"
        }
      ]
    }
  ]
}
```

---

## Service-Specific Optimization

### Lambda Optimization

**Right-Size Memory:**
```javascript
// Use Lambda Power Tuning
// https://github.com/alexcasalboni/aws-lambda-power-tuning

// Example: Test different memory configurations
const configurations = [256, 512, 1024, 2048];
// Run power tuning to find optimal configuration
// Result: 512 MB is optimal (balance of cost and performance)
```

**Reduce Cold Starts:**
```javascript
// 1. Keep bundle size small
// Use esbuild or webpack for bundling
module.exports = {
  entry: './index.js',
  target: 'node',
  mode: 'production',
  optimization: {
    minimize: true
  }
};

// 2. Reuse connections
let dbConnection;
export const handler = async (event) => {
  if (!dbConnection) {
    dbConnection = await createConnection();
  }
  // Use connection
};

// 3. Use provisioned concurrency only for critical functions
// Cost: $0.015 per GB-hour (only when necessary)
```

**Optimize Execution Time:**
```javascript
// Bad: Sequential operations
const user = await getUser(userId);
const tests = await getTests(userId);
const progress = await getProgress(userId);

// Good: Parallel operations
const [user, tests, progress] = await Promise.all([
  getUser(userId),
  getTests(userId),
  getProgress(userId)
]);

// Execution time: 300ms → 100ms
// Cost savings: ~66%
```

### DynamoDB Optimization

**Choose the Right Billing Mode:**
```javascript
// On-Demand (Pay per request)
// Best for: Unpredictable traffic, new applications
// Cost: $1.25 per million write requests, $0.25 per million reads

// Provisioned (Fixed capacity)
// Best for: Predictable traffic
// Free Tier: 25 RCU + 25 WCU always free
// Cost: $0.00065 per hour per RCU beyond free tier

// Recommendation for MavPrep: Start with Provisioned (free tier)
const table = new dynamodb.Table(this, 'Users', {
  billingMode: dynamodb.BillingMode.PROVISIONED,
  readCapacity: 5,  // Within free tier
  writeCapacity: 5, // Within free tier
});
```

**Enable Auto-Scaling:**
```javascript
// Auto-scale based on utilization
const readScaling = table.autoScaleReadCapacity({
  minCapacity: 5,  // Free tier minimum
  maxCapacity: 100 // Scale up when needed
});

readScaling.scaleOnUtilization({
  targetUtilizationPercent: 70
});
```

**Optimize Queries:**
```javascript
// Bad: Scan entire table
const items = await dynamodb.scan({
  TableName: 'Users'
});
// Cost: Reads all items (expensive)

// Good: Query with partition key
const items = await dynamodb.query({
  TableName: 'Users',
  KeyConditionExpression: 'PK = :pk',
  ExpressionAttributeValues: { ':pk': `USER#${userId}` }
});
// Cost: Reads only required items (cheap)
```

**Use Sparse Indexes:**
```javascript
// Only index items that have the attribute
// Reduces index storage costs
const gsi = table.addGlobalSecondaryIndex({
  indexName: 'email-index',
  partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
  projectionType: dynamodb.ProjectionType.KEYS_ONLY // Cheapest option
});
```

### S3 Optimization

**Lifecycle Policies:**
```javascript
const bucket = new s3.Bucket(this, 'VideoBucket', {
  lifecycleRules: [
    {
      // Move to Intelligent-Tiering after 30 days
      transitions: [
        {
          storageClass: s3.StorageClass.INTELLIGENT_TIERING,
          transitionAfter: cdk.Duration.days(30)
        },
        {
          storageClass: s3.StorageClass.GLACIER_INSTANT_RETRIEVAL,
          transitionAfter: cdk.Duration.days(180)
        }
      ]
    },
    {
      // Delete temporary uploads after 7 days
      expiration: cdk.Duration.days(7),
      prefix: 'temp/'
    },
    {
      // Delete old logs after 30 days
      expiration: cdk.Duration.days(30),
      prefix: 'logs/'
    }
  ]
});
```

**Cost Comparison:**
```
S3 Standard: $0.023/GB
S3 Intelligent-Tiering: $0.023/GB (frequent access)
                        $0.0125/GB (infrequent access)
                        $0.004/GB (archive access)
S3 Glacier Instant: $0.004/GB
S3 Glacier Flexible: $0.0036/GB

For 100 GB video storage:
- S3 Standard: $2.30/month
- S3 Intelligent-Tiering: $1.00-2.30/month (auto-optimized)
- Savings: Up to 56%
```

**Request Optimization:**
```bash
# Minimize PUT requests (most expensive)
# $0.005 per 1,000 PUT requests vs $0.0004 per 1,000 GET requests

# Bad: Upload each file individually
for file in files:
    s3.upload(file)  # 1000 PUT requests = $0.005

# Good: Batch upload with multipart
s3.upload_multipart(files)  # 1 PUT request = $0.000005
```

**CloudFront Integration:**
```javascript
// Reduce S3 data transfer costs with CloudFront
// Data transfer: S3 → Internet = $0.09/GB
// Data transfer: S3 → CloudFront = FREE
// CloudFront → Internet = $0.085/GB (1st 10 TB)

// Plus: CloudFront 1 TB/month always free
// Savings: $90/TB + CloudFront caching benefits
```

### RDS Optimization

**Instance Sizing:**
```bash
# Free Tier: db.t3.micro (1 vCPU, 1 GB RAM)
# 750 hours/month = 24/7 operation

# Optimize for free tier:
1. Run only one instance (db.t3.micro)
2. Don't enable Multi-AZ (doubles cost)
3. Keep storage ≤ 20 GB (free tier limit)
4. Use automated backups (7 days free)
```

**Storage Optimization:**
```sql
-- Monitor database size
SELECT
  pg_database.datname,
  pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
ORDER BY pg_database_size(pg_database.datname) DESC;

-- Clean up old data
DELETE FROM analytics_daily WHERE created_at < NOW() - INTERVAL '90 days';
VACUUM FULL;
```

**Query Optimization:**
```sql
-- Add indexes to slow queries
CREATE INDEX CONCURRENTLY idx_questions_topic_difficulty
ON questions(topic_id, difficulty_level);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM questions WHERE topic_id = 'xxx';

-- Use connection pooling
-- pgBouncer or RDS Proxy (note: RDS Proxy not in free tier)
```

**Backup Strategy:**
```bash
# Automated backups (7 days retention) - FREE
# Manual snapshots - $0.095/GB/month

# Strategy: Use automated backups only
aws rds modify-db-instance \
  --db-instance-identifier mavprepdb \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00"
```

### CloudFront Optimization

**Cache Configuration:**
```javascript
const distribution = new cloudfront.Distribution(this, 'Distribution', {
  defaultBehavior: {
    cachePolicy: new cloudfront.CachePolicy(this, 'CachePolicy', {
      defaultTtl: cdk.Duration.days(1),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.seconds(0),
      // Cache based on query strings selectively
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.allowList('v', 'quality')
    }),
    // Enable compression
    compress: true
  }
});
```

**Price Class Selection:**
```javascript
// Price Class 100: US, Canada, Europe
// Price Class 200: Above + Asia, Middle East, Africa
// Price Class All: Worldwide

// Recommendation: Start with Price Class 100
const distribution = new cloudfront.Distribution(this, 'Distribution', {
  priceClass: cloudfront.PriceClass.PRICE_CLASS_100
});

// Savings: ~20% compared to Price Class All
```

**Origin Shield (Not Free Tier):**
```
Skip Origin Shield initially
Cost: $0.01/10,000 requests + $0.005/GB
Only enable when traffic > 1M requests/month
```

### API Gateway Optimization

**Choose HTTP API over REST API:**
```
HTTP API: $1.00 per million requests
REST API: $3.50 per million requests
Savings: 71%

HTTP API limitations:
- No API keys
- No usage plans
- Simpler request validation

Recommendation: Use HTTP API for MavPrep
```

**Enable Caching:**
```bash
# Cache GET requests to reduce Lambda invocations
aws apigatewayv2 update-stage \
  --api-id xxxxx \
  --stage-name prod \
  --route-settings '*/GET:CachingEnabled=true,CacheTtlInSeconds=300'

# Cost: $0.02/hour for 0.5 GB cache
# Savings: Potentially 10-50x reduction in Lambda invocations
```

---

## Architecture Optimization

### Caching Strategy

**Multi-Layer Caching:**
```
Layer 1: Browser cache (free)
  ↓
Layer 2: CloudFront cache (1 TB free)
  ↓
Layer 3: API Gateway cache ($0.02/hour)
  ↓
Layer 4: Application cache (Redis/in-memory)
  ↓
Layer 5: Database
```

**Implementation:**
```javascript
// Browser cache (HTTP headers)
res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour

// CloudFront cache (via distribution config)
defaultTtl: cdk.Duration.hours(24)

// API Gateway cache
CacheTtlInSeconds: 300  // 5 minutes

// Application cache (in-memory)
const cache = new Map();
const getCachedData = (key) => {
  if (cache.has(key)) return cache.get(key);
  const data = fetchFromDB(key);
  cache.set(key, data);
  return data;
};
```

### Batch Processing

**Process in Batches:**
```javascript
// Bad: Process one at a time
for (const item of items) {
  await processItem(item);  // 1000 Lambda invocations
}

// Good: Process in batches
const batchSize = 25;
for (let i = 0; i < items.length; i += batchSize) {
  const batch = items.slice(i, i + batchSize);
  await processBatch(batch);  // 40 Lambda invocations
}

// Savings: 96% reduction in Lambda invocations
```

### Async Processing

**Use SQS for Async Tasks:**
```javascript
// Don't wait for slow operations
// Instead: Send to SQS and process later

// Sync (bad): API waits for email send
await sendEmail(user.email, template);
return response;  // User waits 2 seconds

// Async (good): API returns immediately
await sqs.sendMessage({ email: user.email, template });
return response;  // User waits 100ms

// SQS Free Tier: 1M requests/month
```

---

## Development Best Practices

### Local Development

**Use LocalStack:**
```bash
# Install LocalStack (AWS services locally)
pip install localstack

# Start LocalStack
localstack start

# Configure AWS CLI for LocalStack
aws configure --profile localstack
AWS Access Key ID: test
AWS Secret Access Key: test
Default region: us-east-1

# Use LocalStack for development
aws --endpoint-url=http://localhost:4566 dynamodb list-tables
```

**Benefits:**
- Zero AWS costs during development
- Faster iteration
- Test infrastructure changes safely

### Environment Separation

**Use Separate Accounts/Stages:**
```
Development: dev.mavprep.com (minimal resources)
Staging: staging.mavprep.com (production-like, scaled down)
Production: mavprep.com (full resources)
```

**Cost Allocation:**
```bash
# Tag resources by environment
aws ec2 create-tags \
  --resources i-1234567890abcdef0 \
  --tags Key=Environment,Value=production Key=Project,Value=MavPrep

# Track costs by environment
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=TAG,Key=Environment
```

### Code Optimization

**Reduce Bundle Size:**
```javascript
// Use tree-shaking
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";  // Good
import * as AWS from "aws-sdk";  // Bad (imports everything)

// Use esbuild for bundling
esbuild index.js --bundle --platform=node --target=node20 --outfile=dist/index.js

// Result: 50 MB → 2 MB bundle
// Lambda cold start: 5 seconds → 500ms
// Cost savings: Faster execution = lower cost
```

---

## Cost Allocation & Tagging

### Tagging Strategy

**Required Tags:**
```javascript
const tags = {
  Project: 'MavPrep',
  Environment: 'production',
  Team: 'backend',
  CostCenter: 'engineering',
  Owner: 'admin@mavprep.com'
};

// Apply to all resources
cdk.Tags.of(stack).add('Project', 'MavPrep');
cdk.Tags.of(stack).add('Environment', 'production');
```

**Cost Allocation Report:**
```bash
# Enable cost allocation tags
aws ce update-cost-allocation-tags-status \
  --cost-allocation-tags-status TagKey=Project,Status=Active

# Generate report
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=TAG,Key=Project
```

---

## Cleanup Procedures

### Delete Unused Resources

**Daily Cleanup:**
```bash
# Delete old Lambda versions
aws lambda list-versions-by-function --function-name TestsFunction \
  | jq -r '.Versions[] | select(.Version != "$LATEST") | .Version' \
  | tail -n +6 \
  | xargs -I {} aws lambda delete-function --function-name TestsFunction:{}

# Delete unattached EBS volumes
aws ec2 describe-volumes --filters Name=status,Values=available \
  | jq -r '.Volumes[].VolumeId' \
  | xargs -I {} aws ec2 delete-volume --volume-id {}

# Delete old CloudWatch log streams
aws logs delete-log-stream \
  --log-group-name /aws/lambda/TestsFunction \
  --log-stream-name 2024/01/01/stream
```

**Weekly Cleanup:**
```bash
# Delete old S3 temp files
aws s3 rm s3://mavprep-bucket/temp/ --recursive

# Delete old RDS snapshots (keep last 7)
aws rds describe-db-snapshots \
  --db-instance-identifier mavprepdb \
  --snapshot-type manual \
  | jq -r '.DBSnapshots | sort_by(.SnapshotCreateTime) | reverse | .[7:] | .[].DBSnapshotIdentifier' \
  | xargs -I {} aws rds delete-db-snapshot --db-snapshot-identifier {}
```

### Scheduled Shutdowns

**Stop Dev/Staging Resources:**
```bash
# Lambda to stop RDS at night (dev environment)
export const handler = async () => {
  const rds = new RDS();

  // Stop at 11 PM
  if (new Date().getHours() === 23) {
    await rds.stopDBInstance({ DBInstanceIdentifier: 'mavprep-dev' });
  }

  // Start at 8 AM
  if (new Date().getHours() === 8) {
    await rds.startDBInstance({ DBInstanceIdentifier: 'mavprep-dev' });
  }
};

// Schedule with EventBridge
// Savings: ~35% on dev RDS costs
```

---

## Cost Optimization Checklist

### Monthly Review

- [ ] Check AWS Cost Explorer for unexpected charges
- [ ] Review CloudWatch billing alarms
- [ ] Verify free tier usage limits
- [ ] Delete unused resources
- [ ] Review and optimize Lambda memory allocation
- [ ] Check S3 lifecycle policies are working
- [ ] Review DynamoDB capacity utilization
- [ ] Analyze CloudFront cache hit ratio
- [ ] Remove old log groups and streams
- [ ] Update cost allocation tags

### Quarterly Review

- [ ] Evaluate Reserved Instances (after free tier)
- [ ] Consider Savings Plans
- [ ] Review architecture for optimization opportunities
- [ ] Benchmark performance vs cost
- [ ] Plan for scaling (if approaching free tier limits)
- [ ] Review third-party service costs
- [ ] Optimize database queries
- [ ] Evaluate CDN usage patterns

---

## Cost Projections by User Growth

### 500 Users (Current)
```
Estimated Cost: $5-15/month
Within free tier for most services
Main costs: S3 storage ($4-5)
```

### 1,000 Users (Month 13+)
```
Estimated Cost: $85-115/month
- Aurora Serverless: $60-90
- DynamoDB on-demand: $12.50
- Amplify: $5
- Other services: $7-12
```

### 5,000 Users
```
Estimated Cost: $300-400/month
- Aurora (scaled up): $150-200
- DynamoDB: $50
- CloudFront (beyond free tier): $30
- Lambda: $20
- Other services: $50-100
```

### 10,000 Users
```
Estimated Cost: $600-800/month
- Aurora + Read Replicas: $300-400
- DynamoDB: $100
- ElastiCache Redis: $50
- CloudFront: $60
- Lambda: $40
- Other services: $50-150
```

---

## Conclusion

**Key Takeaways:**

1. **Maximize free tier usage** for first 12 months
2. **Monitor costs daily** with CloudWatch alarms
3. **Optimize before scaling** - don't throw money at problems
4. **Cache aggressively** to reduce backend calls
5. **Tag everything** for cost allocation
6. **Clean up regularly** - unused resources cost money
7. **Plan for growth** - understand cost scaling before it happens

**Cost Optimization Formula:**
```
Total Cost Savings =
  (Free Tier Usage) +
  (Efficient Architecture) +
  (Caching Strategy) +
  (Regular Cleanup) -
  (Over-Provisioning) -
  (Unused Resources)
```

**Target Metrics:**
- Stay under $15/month for first 6 months
- Keep cost per user under $0.15/month
- Maintain >80% cache hit ratio on CloudFront
- Reduce Lambda cold starts to <10%
- Keep DynamoDB within free tier (25 GB)

For more information, refer to:
- [AWS_ARCHITECTURE.md](./AWS_ARCHITECTURE.md)
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
