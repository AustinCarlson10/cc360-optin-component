# 🚀 Deployment Links & Information

## ✅ Successfully Deployed!

Your project has been pushed to GitHub and is ready for Vercel deployment.

---

## 📍 **GitHub Repository**

**Live Repo:** https://github.com/AustinCarlson10/cc360-optin-component

This repository contains:
1. **ICON Fence Website** - Professional fencing company website (`index.html`)
2. **Lambda Error Auto-Fixer** - AWS Lambda monitoring system (`.js` files)
3. **Dashboard** - Monitoring dashboard for the auto-fixer (`dashboard.html`)

---

## 🌐 **Vercel Deployment**

### Quick Deploy Link:
👉 **https://vercel.com/new/clone?repository-url=https://github.com/AustinCarlson10/cc360-optin-component**

### Steps:
1. Click the link above (should already be open in your browser)
2. Sign in to Vercel (or create a free account)
3. Click "Deploy"
4. Wait ~30 seconds for deployment

### Expected Vercel URL:
After deployment, you'll get a URL like:
- `https://cc360-optin-component.vercel.app` 
- `https://cc360-optin-component-austincarlson10.vercel.app`

### Access Points:
- **Main Site (ICON Fence):** `https://your-url.vercel.app/`
- **Lambda Dashboard:** `https://your-url.vercel.app/dashboard`

---

## 📦 **What's Included**

### 🏠 ICON Fence Website
- Modern, responsive design
- Dark/light theme toggle
- Quote request form
- Mobile-friendly navigation
- Service showcase

### 🤖 AWS Lambda Error Auto-Fixer
A complete system that:
- ✅ Monitors Lambda functions using CloudWatch MCP `getMetricData`
- ✅ Analyzes errors using CloudWatch MCP `getLogEvents`
- ✅ Gets fix recommendations from AWS Knowledge MCP
- ✅ Applies fixes using Lambda MCP (`updateFunctionCode`, `publishVersion`, `updateAlias`)
- ✅ Includes automatic rollback on failure

**Files:**
- `lambda-error-orchestrator.js` - Main orchestration logic
- `error-monitor.js` - CloudWatch monitoring
- `knowledge-integration.js` - AWS Knowledge MCP integration
- `lambda-auto-fixer.js` - Lambda MCP fix application
- `mcp-config.json` - MCP server configuration

### 📊 Web Dashboard
- Visual representation of the auto-fixer workflow
- Feature showcase
- Configuration examples
- Deployment guide

---

## 🔧 **For AWS Lambda Deployment**

The Lambda auto-fixer system needs to be deployed to **AWS Lambda** (not Vercel).

### Quick AWS Deployment:

```bash
# Install dependencies
npm install

# Create deployment package
zip -r lambda-fixer.zip *.js package.json mcp-config.json

# Deploy to AWS Lambda
aws lambda create-function \
  --function-name lambda-error-auto-fixer \
  --runtime nodejs18.x \
  --role YOUR-LAMBDA-ROLE-ARN \
  --handler lambda-error-orchestrator.handler \
  --zip-file fileb://lambda-fixer.zip \
  --timeout 900 \
  --memory-size 512
```

See `deployment-guide.md` for full instructions.

---

## 📋 **Environment Variables for AWS Lambda**

```bash
AWS_REGION=us-east-1
MONITOR_FUNCTIONS=your-function-1,your-function-2
ERROR_THRESHOLD=5
ENABLE_AUTO_FIX=true
ENABLE_ROLLBACK=true
MAX_CONCURRENT_FIXES=3
FIX_COOLDOWN=300000
LOG_LEVEL=info
```

---

## 🎯 **Summary**

✅ **GitHub:** https://github.com/AustinCarlson10/cc360-optin-component
✅ **Vercel Deploy:** https://vercel.com/new/clone?repository-url=https://github.com/AustinCarlson10/cc360-optin-component
✅ **Fencing Website:** Ready to view on Vercel
✅ **Lambda Dashboard:** Ready to view on Vercel at `/dashboard`
✅ **Lambda Auto-Fixer:** Ready to deploy to AWS Lambda

---

## 🚀 **Next Steps**

1. **Complete Vercel deployment** (click Deploy in the browser)
2. **Get your Vercel URL** (shown after deployment)
3. **Optional:** Deploy the Lambda auto-fixer to AWS Lambda
4. **Optional:** Configure MCP servers with your API keys

---

**🎉 You're all set! Once you click Deploy on Vercel, come back and share your live URL!**
