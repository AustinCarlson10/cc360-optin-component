/**
 * AWS Lambda Error Detection & Auto-Fix Orchestrator
 * 
 * This is the main orchestrator that coordinates the entire workflow:
 * 1. CloudWatch MCP - Monitor functions for errors using getMetricData
 * 2. CloudWatch MCP - Analyze error logs using getLogEvents  
 * 3. Knowledge MCP - Diagnose issues and get fix recommendations
 * 4. Lambda MCP - Apply fixes using updateFunctionCode, publishVersion, updateAlias
 * 
 * The orchestrator ensures proper error handling, rollback capability, and logging.
 */

const LambdaErrorMonitor = require('./error-monitor');
const AWSKnowledgeIntegration = require('./knowledge-integration');
const LambdaAutoFixer = require('./lambda-auto-fixer');

class LambdaErrorOrchestrator {
    constructor() {
        this.monitor = new LambdaErrorMonitor();
        this.knowledge = new AWSKnowledgeIntegration();
        this.fixer = new LambdaAutoFixer();
        
        // Configuration
        this.config = {
            maxConcurrentFixes: parseInt(process.env.MAX_CONCURRENT_FIXES) || 3,
            fixCooldown: parseInt(process.env.FIX_COOLDOWN) || 300000, // 5 minutes
            enableAutoFix: process.env.ENABLE_AUTO_FIX === 'true',
            enableRollback: process.env.ENABLE_ROLLBACK === 'true',
            logLevel: process.env.LOG_LEVEL || 'info'
        };
        
        // Track fix attempts to prevent spam
        this.fixAttempts = new Map();
        
        // Statistics
        this.stats = {
            totalMonitored: 0,
            totalErrors: 0,
            totalFixes: 0,
            successfulFixes: 0,
            failedFixes: 0,
            rollbacks: 0,
            startTime: new Date()
        };
    }

    /**
     * Main entry point - orchestrate the entire error detection and fixing process
     */
    async orchestrateErrorDetectionAndFixing() {
        console.log('🚀 Starting Lambda Error Detection & Auto-Fix Orchestrator...');
        console.log('📋 Configuration:', JSON.stringify(this.config, null, 2));
        
        try {
            // Step 1: Monitor all configured Lambda functions for errors
            console.log('📊 Step 1: Monitoring Lambda functions for errors...');
            const monitoringResults = await this.monitor.monitorFunctions();
            
            this.stats.totalMonitored = monitoringResults.length;
            this.stats.totalErrors = monitoringResults.filter(r => r.errorCount > 0).length;
            
            // Step 2: Process functions with errors
            const functionsWithErrors = monitoringResults.filter(r => r.errorCount > 0);
            console.log(`⚠️  Found ${functionsWithErrors.length} functions with errors`);
            
            if (functionsWithErrors.length === 0) {
                console.log('✅ All functions are healthy!');
                return this.generateSummary(monitoringResults);
            }
            
            // Step 3: Analyze errors and get fix recommendations
            console.log('🧠 Step 2: Analyzing errors with AWS Knowledge MCP...');
            const analysisResults = await this.analyzeErrors(functionsWithErrors);
            
            // Step 4: Apply fixes if auto-fix is enabled
            let fixResults = [];
            if (this.config.enableAutoFix) {
                console.log('🔧 Step 3: Applying automatic fixes...');
                fixResults = await this.applyFixes(analysisResults);
            } else {
                console.log('🔧 Step 3: Auto-fix disabled, generating recommendations only');
                fixResults = analysisResults.map(result => ({
                    functionName: result.functionName,
                    status: 'recommendation_only',
                    recommendation: result.recommendation,
                    autoFixDisabled: true
                }));
            }
            
            // Step 5: Generate comprehensive summary
            const summary = this.generateSummary(monitoringResults, analysisResults, fixResults);
            
            console.log('📊 Orchestration Complete!');
            console.log('📈 Summary:', JSON.stringify(summary.stats, null, 2));
            
            return summary;
            
        } catch (error) {
            console.error('❌ Orchestration failed:', error);
            
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
                stats: this.stats
            };
        }
    }

    /**
     * Analyze errors for functions that have issues
     */
    async analyzeErrors(functionsWithErrors) {
        const analysisResults = [];
        
        for (const functionResult of functionsWithErrors) {
            try {
                console.log(`🔍 Analyzing errors for ${functionResult.functionName}...`);
                
                // Get detailed error logs
                const errorDetails = await this.monitor.getErrorLogs(functionResult.functionName);
                
                if (!errorDetails.hasErrors) {
                    console.log(`✅ No recent errors found for ${functionResult.functionName}`);
                    continue;
                }
                
                // Extract error patterns
                const errorPatterns = this.monitor.extractErrorPatterns(errorDetails.errorLogs);
                
                // Use Knowledge MCP to analyze and get recommendations
                const knowledgeAnalysis = await this.knowledge.analyzeErrors(errorPatterns, errorDetails.errorLogs);
                
                analysisResults.push({
                    functionName: functionResult.functionName,
                    errorCount: functionResult.errorCount,
                    errorDetails,
                    errorPatterns,
                    knowledgeAnalysis,
                    recommendation: knowledgeAnalysis,
                    shouldFix: knowledgeAnalysis.shouldFix && this.shouldAttemptFix(functionResult.functionName),
                    analysisTimestamp: new Date().toISOString()
                });
                
                console.log(`📋 Analysis complete for ${functionResult.functionName}: ${knowledgeAnalysis.errorType} (confidence: ${knowledgeAnalysis.confidence})`);
                
            } catch (error) {
                console.error(`❌ Analysis failed for ${functionResult.functionName}:`, error);
                analysisResults.push({
                    functionName: functionResult.functionName,
                    errorCount: functionResult.errorCount,
                    analysisError: error.message,
                    shouldFix: false
                });
            }
        }
        
        return analysisResults;
    }

    /**
     * Apply fixes to functions that need them
     */
    async applyFixes(analysisResults) {
        const functionsToFix = analysisResults.filter(result => result.shouldFix);
        
        if (functionsToFix.length === 0) {
            console.log('ℹ️  No functions require automatic fixes');
            return [];
        }
        
        console.log(`🔧 Applying fixes to ${functionsToFix.length} functions...`);
        
        // Limit concurrent fixes to prevent overwhelming the system
        const fixPromises = [];
        const fixBatches = this.chunkArray(functionsToFix, this.config.maxConcurrentFixes);
        
        for (const batch of fixBatches) {
            const batchPromises = batch.map(async (analysisResult) => {
                return await this.applyFixToFunction(analysisResult);
            });
            
            // Wait for current batch to complete before starting next batch
            const batchResults = await Promise.allSettled(batchPromises);
            fixPromises.push(...batchResults);
            
            // Small delay between batches
            if (fixBatches.indexOf(batch) < fixBatches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // Process results
        const fixResults = [];
        for (const result of fixPromises) {
            if (result.status === 'fulfilled') {
                fixResults.push(result.value);
                this.stats.totalFixes++;
                if (result.value.success) {
                    this.stats.successfulFixes++;
                } else {
                    this.stats.failedFixes++;
                    if (result.value.rolledBack) {
                        this.stats.rollbacks++;
                    }
                }
            } else {
                console.error('Fix promise rejected:', result.reason);
                this.stats.failedFixes++;
            }
        }
        
        return fixResults;
    }

    /**
     * Apply fix to a single function
     */
    async applyFixToFunction(analysisResult) {
        const { functionName, knowledgeAnalysis } = analysisResult;
        
        try {
            console.log(`🔧 Applying fix to ${functionName}: ${knowledgeAnalysis.recommendations[0]?.title || 'Unknown fix'}`);
            
            // Record fix attempt
            this.recordFixAttempt(functionName);
            
            // Apply the fix using Lambda MCP
            const fixResult = await this.fixer.applyFix(functionName, knowledgeAnalysis);
            
            console.log(`${fixResult.success ? '✅' : '❌'} Fix result for ${functionName}:`, fixResult);
            
            return {
                functionName,
                fixType: knowledgeAnalysis.errorType,
                fixResult,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error(`❌ Fix failed for ${functionName}:`, error);
            
            return {
                functionName,
                fixType: knowledgeAnalysis.errorType,
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Check if we should attempt a fix for this function (cooldown logic)
     */
    shouldAttemptFix(functionName) {
        const lastAttempt = this.fixAttempts.get(functionName);
        
        if (!lastAttempt) {
            return true;
        }
        
        const timeSinceLastAttempt = Date.now() - lastAttempt.timestamp;
        
        if (timeSinceLastAttempt < this.config.fixCooldown) {
            console.log(`⏳ Skipping ${functionName} - still in cooldown period`);
            return false;
        }
        
        // Reset attempt count if enough time has passed
        if (timeSinceLastAttempt > this.config.fixCooldown * 2) {
            this.fixAttempts.delete(functionName);
            return true;
        }
        
        // Don't attempt if we've had too many recent failures
        if (lastAttempt.consecutiveFailures >= 3) {
            console.log(`🚫 Skipping ${functionName} - too many consecutive failures`);
            return false;
        }
        
        return true;
    }

    /**
     * Record a fix attempt for cooldown tracking
     */
    recordFixAttempt(functionName) {
        const existing = this.fixAttempts.get(functionName) || { attempts: 0, consecutiveFailures: 0 };
        
        this.fixAttempts.set(functionName, {
            attempts: existing.attempts + 1,
            consecutiveFailures: existing.consecutiveFailures,
            timestamp: Date.now()
        });
    }

    /**
     * Record fix result for tracking
     */
    recordFixResult(functionName, success) {
        const existing = this.fixAttempts.get(functionName);
        
        if (existing) {
            if (success) {
                // Reset consecutive failures on success
                existing.consecutiveFailures = 0;
            } else {
                // Increment consecutive failures
                existing.consecutiveFailures++;
            }
            
            this.fixAttempts.set(functionName, existing);
        }
    }

    /**
     * Utility function to chunk array into smaller batches
     */
    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * Generate comprehensive summary of the orchestration process
     */
    generateSummary(monitoringResults, analysisResults = [], fixResults = []) {
        const summary = {
            timestamp: new Date().toISOString(),
            success: true,
            stats: {
                ...this.stats,
                uptime: Date.now() - this.stats.startTime.getTime(),
                functionsMonitored: monitoringResults.length,
                functionsWithErrors: monitoringResults.filter(r => r.errorCount > 0).length,
                functionsAnalyzed: analysisResults.length,
                functionsFixed: fixResults.length,
                successfulFixes: fixResults.filter(r => r.fixResult?.success).length,
                failedFixes: fixResults.filter(r => !r.fixResult?.success).length,
                rollbacks: fixResults.filter(r => r.fixResult?.rolledBack).length
            },
            configuration: this.config,
            monitoring: {
                healthy: monitoringResults.filter(r => r.status === 'healthy'),
                withErrors: monitoringResults.filter(r => r.errorCount > 0),
                errors: monitoringResults.filter(r => r.status === 'error')
            },
            analysis: analysisResults.map(result => ({
                functionName: result.functionName,
                errorType: result.knowledgeAnalysis?.errorType,
                confidence: result.knowledgeAnalysis?.confidence,
                shouldFix: result.shouldFix,
                errorCount: result.errorCount
            })),
            fixes: fixResults.map(result => ({
                functionName: result.functionName,
                fixType: result.fixType,
                success: result.fixResult?.success,
                version: result.fixResult?.version,
                rolledBack: result.fixResult?.rolledBack,
                error: result.error
            })),
            recommendations: analysisResults
                .filter(result => !result.shouldFix && result.knowledgeAnalysis)
                .map(result => ({
                    functionName: result.functionName,
                    errorType: result.knowledgeAnalysis.errorType,
                    recommendation: result.knowledgeAnalysis.recommendations[0]?.title,
                    reason: 'Manual intervention required or auto-fix not recommended'
                }))
        };
        
        return summary;
    }

    /**
     * Get current statistics
     */
    getStats() {
        return {
            ...this.stats,
            uptime: Date.now() - this.stats.startTime.getTime(),
            activeFixAttempts: this.fixAttempts.size
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalMonitored: 0,
            totalErrors: 0,
            totalFixes: 0,
            successfulFixes: 0,
            failedFixes: 0,
            rollbacks: 0,
            startTime: new Date()
        };
        
        this.fixAttempts.clear();
    }

    /**
     * Get fix attempt history for a function
     */
    getFixHistory(functionName) {
        return this.fixAttempts.get(functionName) || null;
    }

    /**
     * Clear fix history for a function
     */
    clearFixHistory(functionName) {
        this.fixAttempts.delete(functionName);
    }
}

/**
 * Lambda handler function - this is the main entry point
 */
exports.handler = async (event, context) => {
    console.log('🚀 Lambda Error Detection & Auto-Fix Orchestrator starting...');
    console.log('📝 Event:', JSON.stringify(event, null, 2));
    
    try {
        const orchestrator = new LambdaErrorOrchestrator();
        const result = await orchestrator.orchestrateErrorDetectionAndFixing();
        
        console.log('✅ Orchestration completed successfully');
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(result, null, 2)
        };
        
    } catch (error) {
        console.error('❌ Orchestration failed:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            }, null, 2)
        };
    }
};

// For local testing
if (require.main === module) {
    const orchestrator = new LambdaErrorOrchestrator();
    orchestrator.orchestrateErrorDetectionAndFixing()
        .then(result => {
            console.log('Orchestration Result:', JSON.stringify(result, null, 2));
        })
        .catch(console.error);
}

module.exports = LambdaErrorOrchestrator;
