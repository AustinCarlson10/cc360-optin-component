/**
 * AWS Knowledge MCP Integration
 * 
 * This module integrates with the AWS Knowledge MCP server to:
 * 1. Analyze Lambda error patterns
 * 2. Look up AWS documentation and best practices
 * 3. Provide specific fix recommendations
 * 4. Generate code fixes for common issues
 */

const axios = require('axios');

class AWSKnowledgeIntegration {
    constructor() {
        this.knowledgeApiUrl = 'https://knowledge-mcp.global.api.aws';
        this.apiKey = process.env.AWS_KNOWLEDGE_API_KEY;
        
        // Common Lambda error patterns and their AWS documentation references
        this.errorPatterns = {
            timeout: {
                docs: ['lambda-timeout', 'lambda-concurrency', 'lambda-performance'],
                commonFixes: [
                    'increase-timeout',
                    'optimize-code',
                    'implement-async-patterns',
                    'use-step-functions'
                ]
            },
            memory: {
                docs: ['lambda-memory', 'lambda-optimization', 'lambda-performance'],
                commonFixes: [
                    'increase-memory',
                    'optimize-algorithms',
                    'reduce-data-processing',
                    'implement-streaming'
                ]
            },
            permission: {
                docs: ['lambda-permissions', 'iam-lambda', 'lambda-execution-role'],
                commonFixes: [
                    'update-iam-policy',
                    'add-resource-permissions',
                    'fix-execution-role'
                ]
            },
            import: {
                docs: ['lambda-dependencies', 'lambda-layers', 'lambda-packaging'],
                commonFixes: [
                    'add-missing-dependencies',
                    'create-lambda-layer',
                    'optimize-package-size'
                ]
            },
            syntax: {
                docs: ['lambda-runtime', 'lambda-debugging', 'lambda-testing'],
                commonFixes: [
                    'fix-syntax-errors',
                    'add-type-checking',
                    'implement-linting'
                ]
            },
            runtime: {
                docs: ['lambda-error-handling', 'lambda-debugging', 'lambda-monitoring'],
                commonFixes: [
                    'add-error-handling',
                    'implement-retry-logic',
                    'add-null-checks'
                ]
            }
        };
    }

    /**
     * Analyze error patterns and get AWS documentation-based recommendations
     */
    async analyzeErrors(errorPatterns, errorLogs) {
        console.log('🧠 Analyzing errors with AWS Knowledge MCP...');
        
        const { mostCommon, patterns, totalErrors } = errorPatterns;
        const errorType = mostCommon;
        
        try {
            // Get AWS documentation for this error type
            const docs = await this.getAWSDocumentation(errorType);
            
            // Get specific fix recommendations
            const recommendations = await this.getFixRecommendations(errorType, errorLogs);
            
            // Generate code fixes if applicable
            const codeFixes = await this.generateCodeFixes(errorType, errorLogs);
            
            return {
                errorType,
                errorCount: totalErrors,
                confidence: this.calculateConfidence(totalErrors, patterns[errorType]),
                awsDocs: docs,
                recommendations,
                codeFixes,
                shouldFix: this.shouldAutoFix(errorType, totalErrors),
                fixPriority: this.getFixPriority(errorType, totalErrors)
            };
            
        } catch (error) {
            console.error('Knowledge analysis failed:', error);
            
            // Fallback to basic recommendations
            return this.getFallbackRecommendation(errorType, totalErrors);
        }
    }

    /**
     * Get AWS documentation for specific error types
     */
    async getAWSDocumentation(errorType) {
        const pattern = this.errorPatterns[errorType];
        if (!pattern) return [];

        try {
            const docs = [];
            
            for (const docTopic of pattern.docs) {
                // This would make actual calls to the Knowledge MCP server
                const docContent = await this.fetchDocumentation(docTopic);
                docs.push({
                    topic: docTopic,
                    content: docContent,
                    relevance: 'high'
                });
            }
            
            return docs;
            
        } catch (error) {
            console.error(`Failed to fetch docs for ${errorType}:`, error);
            return [];
        }
    }

    /**
     * Simulate fetching documentation from Knowledge MCP
     */
    async fetchDocumentation(topic) {
        // Simulate API call to Knowledge MCP
        const mockDocs = {
            'lambda-timeout': {
                title: 'AWS Lambda Function Timeout Configuration',
                summary: 'Lambda functions have a maximum execution time limit. Timeouts can be increased up to 15 minutes.',
                bestPractices: [
                    'Set timeout based on expected execution time',
                    'Consider using Step Functions for longer workflows',
                    'Monitor and optimize code performance',
                    'Use asynchronous patterns where possible'
                ],
                commonIssues: [
                    'Timeout too low for actual execution time',
                    'Synchronous operations blocking execution',
                    'Large data processing without optimization'
                ]
            },
            'lambda-memory': {
                title: 'AWS Lambda Memory Configuration',
                summary: 'Memory allocation affects both memory and CPU power. Insufficient memory can cause out-of-memory errors.',
                bestPractices: [
                    'Start with 128MB and increase based on usage',
                    'Monitor actual memory usage in CloudWatch',
                    'Balance memory with cost optimization',
                    'Use memory profiling tools'
                ],
                commonIssues: [
                    'Memory allocation too low',
                    'Memory leaks in long-running functions',
                    'Processing large datasets without streaming'
                ]
            },
            'lambda-permissions': {
                title: 'AWS Lambda IAM Permissions',
                summary: 'Lambda functions need proper IAM permissions to access AWS services and resources.',
                bestPractices: [
                    'Follow principle of least privilege',
                    'Use resource-based policies when possible',
                    'Regularly audit permissions',
                    'Use separate execution roles for different functions'
                ],
                commonIssues: [
                    'Missing required permissions',
                    'Overly broad permissions',
                    'Resource ARN mismatches'
                ]
            }
        };

        return mockDocs[topic] || {
            title: `AWS Lambda ${topic.replace('-', ' ')}`,
            summary: 'AWS documentation for this topic',
            bestPractices: ['Follow AWS best practices'],
            commonIssues: ['Common issues with this configuration']
        };
    }

    /**
     * Get specific fix recommendations based on error analysis
     */
    async getFixRecommendations(errorType, errorLogs) {
        const pattern = this.errorPatterns[errorType];
        if (!pattern) return [];

        const recommendations = [];
        
        for (const fixType of pattern.commonFixes) {
            const recommendation = await this.getSpecificRecommendation(fixType, errorLogs);
            if (recommendation) {
                recommendations.push(recommendation);
            }
        }
        
        return recommendations.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Get specific recommendation for a fix type
     */
    async getSpecificRecommendation(fixType, errorLogs) {
        const recommendations = {
            'increase-timeout': {
                type: 'configuration',
                title: 'Increase Function Timeout',
                description: 'The function is timing out due to insufficient timeout configuration.',
                priority: 9,
                action: {
                    type: 'updateTimeout',
                    suggestedValue: 300, // 5 minutes
                    maxValue: 900 // 15 minutes
                },
                impact: 'low',
                risk: 'low'
            },
            'increase-memory': {
                type: 'configuration',
                title: 'Increase Memory Allocation',
                description: 'The function is running out of memory during execution.',
                priority: 8,
                action: {
                    type: 'updateMemory',
                    suggestedValue: 1024, // 1GB
                    maxValue: 10240 // 10GB
                },
                impact: 'medium',
                risk: 'low'
            },
            'add-missing-dependencies': {
                type: 'code',
                title: 'Add Missing Dependencies',
                description: 'The function is missing required npm packages.',
                priority: 10,
                action: {
                    type: 'updateDependencies',
                    suggestedPackages: this.extractMissingPackages(errorLogs)
                },
                impact: 'high',
                risk: 'medium'
            },
            'fix-syntax-errors': {
                type: 'code',
                title: 'Fix Syntax Errors',
                description: 'The function contains syntax errors preventing execution.',
                priority: 10,
                action: {
                    type: 'fixSyntax',
                    errorLocations: this.extractSyntaxErrors(errorLogs)
                },
                impact: 'high',
                risk: 'low'
            },
            'add-error-handling': {
                type: 'code',
                title: 'Improve Error Handling',
                description: 'The function needs better error handling and null checks.',
                priority: 7,
                action: {
                    type: 'addErrorHandling',
                    areas: this.identifyErrorProneAreas(errorLogs)
                },
                impact: 'high',
                risk: 'low'
            }
        };

        return recommendations[fixType] || null;
    }

    /**
     * Generate code fixes for common issues
     */
    async generateCodeFixes(errorType, errorLogs) {
        const codeFixes = [];
        
        switch (errorType) {
            case 'import':
                codeFixes.push(this.generateDependencyFix(errorLogs));
                break;
                
            case 'syntax':
                codeFixes.push(this.generateSyntaxFix(errorLogs));
                break;
                
            case 'runtime':
                codeFixes.push(this.generateRuntimeFix(errorLogs));
                break;
                
            case 'timeout':
                codeFixes.push(this.generateTimeoutOptimization(errorLogs));
                break;
                
            case 'memory':
                codeFixes.push(this.generateMemoryOptimization(errorLogs));
                break;
        }
        
        return codeFixes.filter(fix => fix !== null);
    }

    /**
     * Generate dependency fix code
     */
    generateDependencyFix(errorLogs) {
        const missingPackages = this.extractMissingPackages(errorLogs);
        
        if (missingPackages.length === 0) return null;
        
        return {
            type: 'package.json',
            description: 'Add missing dependencies to package.json',
            code: {
                'package.json': {
                    dependencies: missingPackages.reduce((deps, pkg) => {
                        deps[pkg] = 'latest';
                        return deps;
                    }, {})
                }
            },
            instructions: [
                'Add the missing dependencies to package.json',
                'Run npm install to install the packages',
                'Update the Lambda function code'
            ]
        };
    }

    /**
     * Generate syntax fix code
     */
    generateSyntaxFix(errorLogs) {
        const syntaxErrors = this.extractSyntaxErrors(errorLogs);
        
        if (syntaxErrors.length === 0) return null;
        
        return {
            type: 'javascript',
            description: 'Fix syntax errors in the code',
            code: {
                fixes: syntaxErrors.map(error => ({
                    line: error.line,
                    issue: error.issue,
                    fix: error.suggestedFix,
                    before: error.before,
                    after: error.after
                }))
            },
            instructions: [
                'Review each syntax error',
                'Apply the suggested fixes',
                'Test the function locally before deploying'
            ]
        };
    }

    /**
     * Generate runtime error handling fix
     */
    generateRuntimeFix(errorLogs) {
        return {
            type: 'javascript',
            description: 'Add comprehensive error handling',
            code: {
                'error-handling-template.js': `
// Add this error handling wrapper to your function
exports.handler = async (event, context) => {
    try {
        // Your existing function logic here
        const result = await yourMainFunction(event);
        
        return {
            statusCode: 200,
            body: JSON.stringify(result)
        };
        
    } catch (error) {
        console.error('Function error:', error);
        
        // Log detailed error information
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            event: JSON.stringify(event, null, 2)
        });
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Internal server error',
                requestId: context.awsRequestId
            })
        };
    }
};

// Add null checks for common issues
function safeGetProperty(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : null;
    }, obj);
}

// Add validation for required fields
function validateEvent(event, requiredFields) {
    const missing = requiredFields.filter(field => !event[field]);
    if (missing.length > 0) {
        throw new Error(\`Missing required fields: \${missing.join(', ')}\`);
    }
}
                `
            },
            instructions: [
                'Wrap your main function logic in try-catch blocks',
                'Add null checks for object properties',
                'Validate input parameters',
                'Log detailed error information',
                'Return appropriate error responses'
            ]
        };
    }

    /**
     * Generate timeout optimization code
     */
    generateTimeoutOptimization(errorLogs) {
        return {
            type: 'javascript',
            description: 'Optimize function for better performance',
            code: {
                'optimization-template.js': `
// Use async/await patterns for better performance
async function processDataAsync(data) {
    // Process data in chunks to avoid timeout
    const chunkSize = 100;
    const results = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        const result = await processChunk(chunk);
        results.push(result);
        
        // Allow other operations to run
        await new Promise(resolve => setImmediate(resolve));
    }
    
    return results;
}

// Use Promise.all for parallel operations
async function parallelProcessing(items) {
    const promises = items.map(item => processItem(item));
    return Promise.all(promises);
}

// Implement early returns for quick failures
function validateAndProcess(event) {
    // Quick validation first
    if (!event || !event.data) {
        throw new Error('Invalid event structure');
    }
    
    // Early return for simple cases
    if (event.data.length === 0) {
        return { processed: 0, skipped: 0 };
    }
    
    // Process complex cases
    return processComplexData(event.data);
}
                `
            },
            instructions: [
                'Break down large operations into smaller chunks',
                'Use async/await patterns effectively',
                'Implement early returns for quick failures',
                'Use Promise.all for parallel operations',
                'Consider using Step Functions for complex workflows'
            ]
        };
    }

    /**
     * Generate memory optimization code
     */
    generateMemoryOptimization(errorLogs) {
        return {
            type: 'javascript',
            description: 'Optimize memory usage in the function',
            code: {
                'memory-optimization-template.js': `
// Process large datasets in streams
const { Transform } = require('stream');

function createProcessingStream() {
    return new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            try {
                const processed = processChunk(chunk);
                callback(null, processed);
            } catch (error) {
                callback(error);
            }
        }
    });
}

// Use generators for memory-efficient iteration
function* processLargeDataset(data) {
    for (const item of data) {
        yield processItem(item);
    }
}

// Clear large variables when done
function processData(data) {
    const result = performProcessing(data);
    
    // Clear the input data to free memory
    data = null;
    
    return result;
}

// Use WeakMap for temporary caching
const tempCache = new WeakMap();

function getCachedResult(obj) {
    if (tempCache.has(obj)) {
        return tempCache.get(obj);
    }
    
    const result = expensiveOperation(obj);
    tempCache.set(obj, result);
    return result;
}
                `
            },
            instructions: [
                'Process large datasets in streams or chunks',
                'Use generators for memory-efficient iteration',
                'Clear large variables when no longer needed',
                'Use WeakMap for temporary caching',
                'Avoid keeping references to large objects',
                'Consider using Lambda layers for large dependencies'
            ]
        };
    }

    /**
     * Extract missing packages from error logs
     */
    extractMissingPackages(errorLogs) {
        const packages = new Set();
        
        errorLogs.forEach(log => {
            const message = log.message;
            const match = message.match(/Cannot find module ['"]([^'"]+)['"]/);
            if (match) {
                packages.add(match[1]);
            }
        });
        
        return Array.from(packages);
    }

    /**
     * Extract syntax errors from error logs
     */
    extractSyntaxErrors(errorLogs) {
        const errors = [];
        
        errorLogs.forEach(log => {
            const message = log.message;
            
            // Common syntax error patterns
            const patterns = [
                {
                    regex: /SyntaxError: Unexpected token (.+) at line (\d+)/,
                    issue: 'unexpected-token',
                    fix: 'Remove or correct the unexpected token'
                },
                {
                    regex: /SyntaxError: Missing (.+) at line (\d+)/,
                    issue: 'missing-syntax',
                    fix: 'Add the missing syntax element'
                },
                {
                    regex: /ReferenceError: (.+) is not defined/,
                    issue: 'undefined-variable',
                    fix: 'Define the variable or import the module'
                }
            ];
            
            patterns.forEach(pattern => {
                const match = message.match(pattern.regex);
                if (match) {
                    errors.push({
                        line: parseInt(match[2]) || 0,
                        issue: pattern.issue,
                        suggestedFix: pattern.fix,
                        details: match[0]
                    });
                }
            });
        });
        
        return errors;
    }

    /**
     * Identify error-prone areas in the code
     */
    identifyErrorProneAreas(errorLogs) {
        const areas = new Set();
        
        errorLogs.forEach(log => {
            const message = log.message;
            
            if (message.includes('Cannot read property')) {
                areas.add('object-property-access');
            }
            if (message.includes('Cannot read properties')) {
                areas.add('object-property-access');
            }
            if (message.includes('undefined is not a function')) {
                areas.add('function-calls');
            }
            if (message.includes('null is not an object')) {
                areas.add('null-checks');
            }
        });
        
        return Array.from(areas);
    }

    /**
     * Calculate confidence score for recommendations
     */
    calculateConfidence(totalErrors, specificErrors) {
        if (totalErrors < 3) return 'low';
        if (totalErrors < 10) return 'medium';
        if (specificErrors / totalErrors > 0.8) return 'high';
        return 'medium';
    }

    /**
     * Determine if auto-fix should be applied
     */
    shouldAutoFix(errorType, totalErrors) {
        const autoFixableTypes = ['timeout', 'memory', 'import', 'syntax'];
        const highConfidenceThreshold = 10;
        
        return autoFixableTypes.includes(errorType) && totalErrors >= highConfidenceThreshold;
    }

    /**
     * Get fix priority (1-10, higher is more urgent)
     */
    getFixPriority(errorType, totalErrors) {
        const priorities = {
            'syntax': 10,      // Critical - prevents execution
            'import': 9,       // High - missing dependencies
            'permission': 8,   // High - but requires manual review
            'runtime': 7,      // Medium - needs code fixes
            'timeout': 6,      // Medium - configuration fix
            'memory': 5        // Low - configuration fix
        };
        
        const basePriority = priorities[errorType] || 5;
        const errorMultiplier = Math.min(totalErrors / 5, 2); // Cap at 2x
        
        return Math.min(Math.round(basePriority * errorMultiplier), 10);
    }

    /**
     * Fallback recommendation when Knowledge MCP is unavailable
     */
    getFallbackRecommendation(errorType, totalErrors) {
        return {
            errorType,
            errorCount: totalErrors,
            confidence: 'low',
            awsDocs: [],
            recommendations: [{
                type: 'manual',
                title: 'Manual Investigation Required',
                description: 'Unable to automatically analyze errors. Manual investigation recommended.',
                priority: 5,
                action: {
                    type: 'manualReview',
                    message: 'Review CloudWatch logs and AWS documentation'
                },
                impact: 'unknown',
                risk: 'unknown'
            }],
            codeFixes: [],
            shouldFix: false,
            fixPriority: 5
        };
    }
}

module.exports = AWSKnowledgeIntegration;
