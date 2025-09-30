/**
 * AWS Lambda Error Monitor & Auto-Fixer
 * 
 * This system automatically:
 * 1. Monitors Lambda functions for errors using CloudWatch metrics
 * 2. Analyzes error logs to understand the root cause
 * 3. Uses AWS Knowledge MCP to find the correct fix
 * 4. Applies the fix using Lambda MCP operations
 * 
 * MCP Servers Required:
 * - CloudWatch MCP: For error metrics and log analysis
 * - Knowledge MCP: For AWS documentation and troubleshooting
 * - Lambda MCP: For code updates and deployment
 */

const { CloudWatchClient, GetMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
const { CloudWatchLogsClient, GetLogEventsCommand } = require('@aws-sdk/client-cloudwatch-logs');

class LambdaErrorMonitor {
    constructor() {
        this.cloudwatch = new CloudWatchClient({ region: process.env.AWS_REGION || 'us-east-1' });
        this.logs = new CloudWatchLogsClient({ region: process.env.AWS_REGION || 'us-east-1' });
        this.functionsToMonitor = process.env.MONITOR_FUNCTIONS?.split(',') || [];
        this.errorThreshold = parseInt(process.env.ERROR_THRESHOLD) || 5; // errors per minute
    }

    /**
     * Main entry point - monitors all configured Lambda functions
     */
    async monitorFunctions() {
        console.log('🔍 Starting Lambda error monitoring...');
        
        const results = [];
        
        for (const functionName of this.functionsToMonitor) {
            try {
                console.log(`📊 Checking function: ${functionName}`);
                
                // Step 1: Check for errors using CloudWatch metrics
                const errorData = await this.getErrorMetrics(functionName);
                
                if (errorData.hasErrors && errorData.errorCount >= this.errorThreshold) {
                    console.log(`⚠️  Errors detected in ${functionName}: ${errorData.errorCount} errors`);
                    
                    // Step 2: Get detailed error logs
                    const errorDetails = await this.getErrorLogs(functionName);
                    
                    // Step 3: Analyze and get fix recommendations
                    const fixRecommendation = await this.analyzeAndGetFix(errorDetails);
                    
                    // Step 4: Apply the fix
                    if (fixRecommendation && fixRecommendation.shouldFix) {
                        const fixResult = await this.applyFix(functionName, fixRecommendation);
                        results.push({
                            functionName,
                            status: 'fixed',
                            errorCount: errorData.errorCount,
                            fixApplied: fixResult
                        });
                    } else {
                        results.push({
                            functionName,
                            status: 'analyzed',
                            errorCount: errorData.errorCount,
                            recommendation: fixRecommendation
                        });
                    }
                } else {
                    console.log(`✅ ${functionName} is healthy (${errorData.errorCount || 0} errors)`);
                    results.push({
                        functionName,
                        status: 'healthy',
                        errorCount: errorData.errorCount || 0
                    });
                }
                
            } catch (error) {
                console.error(`❌ Error monitoring ${functionName}:`, error);
                results.push({
                    functionName,
                    status: 'error',
                    error: error.message
                });
            }
        }
        
        return results;
    }

    /**
     * Get error metrics for a Lambda function using CloudWatch
     */
    async getErrorMetrics(functionName) {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - 15 * 60 * 1000); // Last 15 minutes
        
        const command = new GetMetricDataCommand({
            MetricDataQueries: [
                {
                    Id: 'errors',
                    MetricStat: {
                        Metric: {
                            Namespace: 'AWS/Lambda',
                            MetricName: 'Errors',
                            Dimensions: [
                                {
                                    Name: 'FunctionName',
                                    Value: functionName
                                }
                            ]
                        },
                        Period: 300, // 5 minutes
                        Stat: 'Sum'
                    }
                },
                {
                    Id: 'invocations',
                    MetricStat: {
                        Metric: {
                            Namespace: 'AWS/Lambda',
                            MetricName: 'Invocations',
                            Dimensions: [
                                {
                                    Name: 'FunctionName',
                                    Value: functionName
                                }
                            ]
                        },
                        Period: 300,
                        Stat: 'Sum'
                    }
                }
            ],
            StartTime: startTime,
            EndTime: endTime
        });

        try {
            const response = await this.cloudwatch.send(command);
            
            const errorValues = response.MetricDataResults?.find(r => r.Id === 'errors')?.Values || [];
            const invocationValues = response.MetricDataResults?.find(r => r.Id === 'invocations')?.Values || [];
            
            const totalErrors = errorValues.reduce((sum, val) => sum + val, 0);
            const totalInvocations = invocationValues.reduce((sum, val) => sum + val, 0);
            
            return {
                hasErrors: totalErrors > 0,
                errorCount: totalErrors,
                totalInvocations,
                errorRate: totalInvocations > 0 ? (totalErrors / totalInvocations) * 100 : 0,
                timeRange: { startTime, endTime }
            };
            
        } catch (error) {
            console.error('Failed to get metrics:', error);
            throw error;
        }
    }

    /**
     * Get detailed error logs from CloudWatch Logs
     */
    async getErrorLogs(functionName) {
        const logGroupName = `/aws/lambda/${functionName}`;
        const endTime = Date.now();
        const startTime = endTime - 15 * 60 * 1000; // Last 15 minutes
        
        try {
            const command = new GetLogEventsCommand({
                logGroupName,
                startTime,
                endTime,
                filterPattern: 'ERROR',
                limit: 50
            });
            
            const response = await this.logs.send(command);
            
            if (!response.events || response.events.length === 0) {
                return { errorLogs: [], hasErrors: false };
            }
            
            const errorLogs = response.events.map(event => ({
                timestamp: new Date(event.timestamp),
                message: event.message,
                logStream: event.logStreamName
            }));
            
            return {
                errorLogs,
                hasErrors: true,
                logGroupName,
                timeRange: { startTime: new Date(startTime), endTime: new Date(endTime) }
            };
            
        } catch (error) {
            console.error('Failed to get error logs:', error);
            throw error;
        }
    }

    /**
     * Analyze errors and get fix recommendations using Knowledge MCP
     */
    async analyzeAndGetFix(errorDetails) {
        if (!errorDetails.hasErrors || !errorDetails.errorLogs.length) {
            return { shouldFix: false, reason: 'No errors found' };
        }
        
        // Extract common error patterns
        const errorPatterns = this.extractErrorPatterns(errorDetails.errorLogs);
        
        console.log('🧠 Analyzing errors with AWS Knowledge MCP...');
        
        // This would integrate with the Knowledge MCP server
        // For now, we'll simulate the analysis
        const analysis = await this.simulateKnowledgeAnalysis(errorPatterns);
        
        return analysis;
    }

    /**
     * Extract common error patterns from logs
     */
    extractErrorPatterns(errorLogs) {
        const patterns = {
            timeout: 0,
            memory: 0,
            permission: 0,
            import: 0,
            syntax: 0,
            runtime: 0,
            other: 0
        };
        
        errorLogs.forEach(log => {
            const message = log.message.toLowerCase();
            
            if (message.includes('timeout') || message.includes('timed out')) {
                patterns.timeout++;
            } else if (message.includes('memory') || message.includes('out of memory')) {
                patterns.memory++;
            } else if (message.includes('permission') || message.includes('access denied')) {
                patterns.permission++;
            } else if (message.includes('cannot find module') || message.includes('import')) {
                patterns.import++;
            } else if (message.includes('syntax error') || message.includes('unexpected token')) {
                patterns.syntax++;
            } else if (message.includes('runtime error') || message.includes('typeerror')) {
                patterns.runtime++;
            } else {
                patterns.other++;
            }
        });
        
        return {
            patterns,
            totalErrors: errorLogs.length,
            mostCommon: Object.entries(patterns).reduce((a, b) => patterns[a[0]] > patterns[b[0]] ? a : b)[0]
        };
    }

    /**
     * Simulate Knowledge MCP analysis (replace with actual MCP call)
     */
    async simulateKnowledgeAnalysis(errorPatterns) {
        const { mostCommon, totalErrors } = errorPatterns;
        
        // Simulate knowledge-based recommendations
        const recommendations = {
            timeout: {
                shouldFix: true,
                fixType: 'configuration',
                description: 'Function timeout issue detected',
                solution: {
                    type: 'updateTimeout',
                    newTimeout: 300, // 5 minutes
                    message: 'Increasing function timeout to handle longer execution times'
                }
            },
            memory: {
                shouldFix: true,
                fixType: 'configuration',
                description: 'Memory allocation issue detected',
                solution: {
                    type: 'updateMemory',
                    newMemory: 1024, // 1GB
                    message: 'Increasing memory allocation to prevent out-of-memory errors'
                }
            },
            permission: {
                shouldFix: false,
                fixType: 'iam',
                description: 'IAM permission issue detected',
                solution: {
                    type: 'iamUpdate',
                    message: 'IAM permissions need to be updated manually - not auto-fixable'
                }
            },
            import: {
                shouldFix: true,
                fixType: 'code',
                description: 'Module import/dependency issue detected',
                solution: {
                    type: 'dependencyFix',
                    message: 'Adding missing dependencies to package.json'
                }
            },
            syntax: {
                shouldFix: true,
                fixType: 'code',
                description: 'Syntax error detected',
                solution: {
                    type: 'syntaxFix',
                    message: 'Fixing syntax errors in the code'
                }
            },
            runtime: {
                shouldFix: true,
                fixType: 'code',
                description: 'Runtime error detected',
                solution: {
                    type: 'runtimeFix',
                    message: 'Adding error handling and null checks'
                }
            }
        };
        
        const recommendation = recommendations[mostCommon] || recommendations.other;
        
        return {
            ...recommendation,
            errorType: mostCommon,
            errorCount: totalErrors,
            confidence: totalErrors > 10 ? 'high' : 'medium'
        };
    }

    /**
     * Apply the recommended fix using Lambda MCP
     */
    async applyFix(functionName, fixRecommendation) {
        console.log(`🔧 Applying fix for ${functionName}: ${fixRecommendation.description}`);
        
        // This would integrate with the Lambda MCP server
        // For now, we'll simulate the fix application
        const fixResult = await this.simulateLambdaFix(functionName, fixRecommendation);
        
        return fixResult;
    }

    /**
     * Simulate Lambda MCP fix application (replace with actual MCP calls)
     */
    async simulateLambdaFix(functionName, fixRecommendation) {
        const { solution, fixType } = fixRecommendation;
        
        try {
            switch (solution.type) {
                case 'updateTimeout':
                    console.log(`⏱️  Updating timeout for ${functionName} to ${solution.newTimeout}s`);
                    // MCP call: updateFunctionConfiguration
                    break;
                    
                case 'updateMemory':
                    console.log(`💾 Updating memory for ${functionName} to ${solution.newMemory}MB`);
                    // MCP call: updateFunctionConfiguration
                    break;
                    
                case 'dependencyFix':
                    console.log(`📦 Fixing dependencies for ${functionName}`);
                    // MCP call: updateFunctionCode with new package.json
                    break;
                    
                case 'syntaxFix':
                    console.log(`🔧 Fixing syntax errors for ${functionName}`);
                    // MCP call: updateFunctionCode with corrected code
                    break;
                    
                case 'runtimeFix':
                    console.log(`🛡️  Adding error handling for ${functionName}`);
                    // MCP call: updateFunctionCode with improved error handling
                    break;
                    
                default:
                    console.log(`❓ Unknown fix type: ${solution.type}`);
                    return { success: false, error: 'Unknown fix type' };
            }
            
            // Simulate the Lambda MCP workflow:
            // 1. updateFunctionCode
            // 2. publishVersion
            // 3. updateAlias (point PROD to new version)
            
            console.log(`📝 Step 1: Updating function code for ${functionName}`);
            console.log(`📝 Step 2: Publishing new version for ${functionName}`);
            console.log(`📝 Step 3: Updating PROD alias for ${functionName}`);
            
            return {
                success: true,
                fixType: solution.type,
                message: solution.message,
                version: `v${Date.now()}`, // Simulated version
                appliedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error(`❌ Failed to apply fix:`, error);
            return {
                success: false,
                error: error.message,
                appliedAt: new Date().toISOString()
            };
        }
    }
}

/**
 * Lambda handler function
 */
exports.handler = async (event) => {
    console.log('🚀 Lambda Error Monitor starting...');
    
    try {
        const monitor = new LambdaErrorMonitor();
        const results = await monitor.monitorFunctions();
        
        const summary = {
            timestamp: new Date().toISOString(),
            totalFunctions: results.length,
            healthy: results.filter(r => r.status === 'healthy').length,
            fixed: results.filter(r => r.status === 'fixed').length,
            analyzed: results.filter(r => r.status === 'analyzed').length,
            errors: results.filter(r => r.status === 'error').length,
            results
        };
        
        console.log('📊 Monitoring Summary:', JSON.stringify(summary, null, 2));
        
        return {
            statusCode: 200,
            body: JSON.stringify(summary, null, 2)
        };
        
    } catch (error) {
        console.error('❌ Monitor failed:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error.message,
                timestamp: new Date().toISOString()
            }, null, 2)
        };
    }
};

// For local testing
if (require.main === module) {
    const monitor = new LambdaErrorMonitor();
    monitor.monitorFunctions()
        .then(results => {
            console.log('Results:', JSON.stringify(results, null, 2));
        })
        .catch(console.error);
}

module.exports = LambdaErrorMonitor;
