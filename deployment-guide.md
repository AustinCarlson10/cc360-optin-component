# 🚀 AWS Lambda Error Auto-Fixer Deployment Guide

This comprehensive system automatically detects and fixes Lambda function errors using AWS MCP servers.

## 🏗️ System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CloudWatch    │    │   AWS Knowledge  │    │   Lambda MCP    │
│      MCP        │    │       MCP        │    │                 │
│                 │    │                  │    │                 │
│ • getMetricData │    │ • Error Analysis │    │ • updateFunction│
│ • getLogEvents  │    │ • Fix Guidance   │    │ • publishVersion│
│                 │    │ • Best Practices │    │ • updateAlias   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                    ┌─────────────────────────┐
                    │   Error Orchestrator    │
                    │                         │
                    │ • Monitors Functions    │
                    │ • Analyzes Errors       │
                    │ • Applies Fixes         │
                    │ • Handles Rollbacks     │
                    └─────────────────────────┘
```

## 📋 Prerequisites

### 1. AWS MCP Servers Configuration

Create `mcp-config.json`:
```json
{
  "mcpServers": {
    "aws-knowledge-mcp-server": {
      "url": "https://knowledge-mcp.global.api.aws"
    },
    "aws-cloudwatch-mcp-server": {
      "url": "https://cloudwatch-mcp.global.api.aws"
    },
    "aws-lambda-mcp-server": {
      "url": "https://lambda-mcp.global.api.aws"
    }
  }
}
```

### 2. Environment Variables

Set these environment variables in your Lambda function:

```bash
# Required
AWS_REGION=us-east-1
AWS_KNOWLEDGE_API_KEY=your-knowledge-api-key
AWS_LAMBDA_API_KEY=your-lambda-api-key

# Function monitoring
MONITOR_FUNCTIONS=function1,function2,function3
ERROR_THRESHOLD=5

# Auto-fix configuration
ENABLE_AUTO_FIX=true
ENABLE_ROLLBACK=true
MAX_CONCURRENT_FIXES=3
FIX_COOLDOWN=300000

# Logging
LOG_LEVEL=info
```

### 3. IAM Permissions

Your Lambda execution role needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:GetMetricData",
        "cloudwatch:ListMetrics"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:GetLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/lambda/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:GetFunction",
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
        "lambda:PublishVersion",
        "lambda:GetAlias",
        "lambda:UpdateAlias",
        "lambda:ListVersionsByFunction"
      ],
      "Resource": "arn:aws:lambda:*:*:function:*"
    }
  ]
}
```

## 🚀 Deployment Steps

### Step 1: Prepare the Code

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create deployment package:**
   ```bash
   npm run deploy
   ```

### Step 2: Deploy to AWS Lambda

#### Option A: AWS CLI
```bash
aws lambda create-function \
  --function-name lambda-error-auto-fixer \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR-ACCOUNT:role/lambda-execution-role \
  --handler lambda-error-orchestrator.handler \
  --zip-file fileb://lambda-error-fixer.zip \
  --timeout 900 \
  --memory-size 512 \
  --environment Variables='{
    "AWS_REGION":"us-east-1",
    "MONITOR_FUNCTIONS":"your-function1,your-function2",
    "ERROR_THRESHOLD":"5",
    "ENABLE_AUTO_FIX":"true"
  }'
```

#### Option B: AWS Console
1. Go to AWS Lambda Console
2. Click "Create function"
3. Choose "Author from scratch"
4. Upload the `lambda-error-fixer.zip` file
5. Set handler to `lambda-error-orchestrator.handler`
6. Configure environment variables
7. Set timeout to 15 minutes
8. Deploy

### Step 3: Set Up EventBridge Trigger

Create a rule to run the orchestrator every 5 minutes:

```bash
aws events put-rule \
  --name lambda-error-monitor-schedule \
  --schedule-expression "rate(5 minutes)" \
  --description "Trigger Lambda error auto-fixer every 5 minutes"

aws lambda add-permission \
  --function-name lambda-error-auto-fixer \
  --statement-id allow-eventbridge \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:us-east-1:YOUR-ACCOUNT:rule/lambda-error-monitor-schedule

aws events put-targets \
  --rule lambda-error-monitor-schedule \
  --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:YOUR-ACCOUNT:function:lambda-error-auto-fixer"
```

### Step 4: Test the Deployment

1. **Manual test:**
   ```bash
   aws lambda invoke \
     --function-name lambda-error-auto-fixer \
     --payload '{}' \
     response.json
   ```

2. **Check logs:**
   ```bash
   aws logs tail /aws/lambda/lambda-error-auto-fixer --follow
   ```

## 🔧 Configuration Options

### Monitoring Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `MONITOR_FUNCTIONS` | Comma-separated list of functions to monitor | Required | `func1,func2,func3` |
| `ERROR_THRESHOLD` | Minimum errors per minute to trigger analysis | `5` | `10` |

### Auto-Fix Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `ENABLE_AUTO_FIX` | Enable automatic fixing | `false` | `true` |
| `ENABLE_ROLLBACK` | Enable automatic rollback on failure | `true` | `true` |
| `MAX_CONCURRENT_FIXES` | Maximum concurrent fixes | `3` | `5` |
| `FIX_COOLDOWN` | Cooldown period between fixes (ms) | `300000` | `600000` |

### Supported Fix Types

| Error Type | Auto-Fixable | Fix Description |
|------------|--------------|-----------------|
| **Timeout** | ✅ Yes | Increase function timeout |
| **Memory** | ✅ Yes | Increase memory allocation |
| **Import/Dependencies** | ✅ Yes | Add missing npm packages |
| **Syntax** | ✅ Yes | Fix syntax errors |
| **Runtime** | ✅ Yes | Add error handling |
| **Permissions** | ❌ No | Requires manual IAM updates |

## 📊 Monitoring & Alerts

### CloudWatch Metrics

The system creates custom metrics:

- `LambdaAutoFixer/ErrorsDetected`
- `LambdaAutoFixer/FixesApplied`
- `LambdaAutoFixer/FixSuccessRate`
- `LambdaAutoFixer/Rollbacks`

### CloudWatch Alarms

Set up alarms for:

```bash
# High error rate
aws cloudwatch put-metric-alarm \
  --alarm-name "LambdaAutoFixer-HighErrorRate" \
  --alarm-description "High error rate detected" \
  --metric-name "LambdaAutoFixer/ErrorsDetected" \
  --namespace "Custom" \
  --statistic "Sum" \
  --period 300 \
  --threshold 20 \
  --comparison-operator "GreaterThanThreshold"

# Low fix success rate
aws cloudwatch put-metric-alarm \
  --alarm-name "LambdaAutoFixer-LowSuccessRate" \
  --alarm-description "Low fix success rate" \
  --metric-name "LambdaAutoFixer/FixSuccessRate" \
  --namespace "Custom" \
  --statistic "Average" \
  --period 900 \
  --threshold 0.8 \
  --comparison-operator "LessThanThreshold"
```

## 🛠️ Troubleshooting

### Common Issues

1. **MCP Connection Failed**
   - Check API keys are correct
   - Verify MCP server URLs
   - Check network connectivity

2. **Permission Denied**
   - Verify IAM permissions
   - Check function execution role
   - Ensure cross-account access if needed

3. **Fix Verification Failed**
   - Check function deployment status
   - Verify alias configuration
   - Review CloudWatch logs

### Debug Mode

Enable debug logging:

```bash
aws lambda update-function-configuration \
  --function-name lambda-error-auto-fixer \
  --environment Variables='{"LOG_LEVEL":"debug"}'
```

### Manual Rollback

If auto-rollback fails:

```bash
# Get current function state
aws lambda get-function --function-name YOUR-FUNCTION

# Update alias to previous version
aws lambda update-alias \
  --function-name YOUR-FUNCTION \
  --name PROD \
  --function-version PREVIOUS-VERSION
```

## 📈 Performance Optimization

### Memory Allocation
- Start with 512MB
- Increase if processing large logs
- Monitor actual usage in CloudWatch

### Timeout Configuration
- Set to 15 minutes (maximum)
- Monitor execution time
- Optimize if consistently under 5 minutes

### Concurrent Execution
- Limit concurrent fixes to prevent API throttling
- Adjust based on AWS account limits
- Monitor for rate limiting errors

## 🔒 Security Considerations

1. **API Keys**
   - Store in AWS Secrets Manager
   - Rotate regularly
   - Use least privilege access

2. **Function Access**
   - Limit to specific function names
   - Use resource-based policies
   - Enable CloudTrail logging

3. **Code Changes**
   - Review all auto-applied fixes
   - Implement approval workflows for production
   - Use separate environments for testing

## 📞 Support

For issues or questions:

1. Check CloudWatch logs first
2. Review this documentation
3. Check AWS MCP server status
4. Contact AWS support if needed

---

**🎉 Your Lambda Error Auto-Fixer is now deployed and ready to keep your functions healthy!**
