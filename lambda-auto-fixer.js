/**
 * AWS Lambda Auto-Fixer using Lambda MCP
 * 
 * This module integrates with the Lambda MCP server to:
 * 1. Update function code with fixes
 * 2. Update function configuration (timeout, memory)
 * 3. Publish new versions
 * 4. Update aliases to point to new versions
 * 5. Rollback on failure
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class LambdaAutoFixer {
    constructor() {
        this.lambdaApiUrl = 'https://lambda-mcp.global.api.aws';
        this.apiKey = process.env.AWS_LAMBDA_API_KEY;
        this.region = process.env.AWS_REGION || 'us-east-1';
        
        // Track deployments for rollback capability
        this.deploymentHistory = new Map();
    }

    /**
     * Apply a fix to a Lambda function using Lambda MCP
     */
    async applyFix(functionName, fixRecommendation) {
        console.log(`🔧 Applying fix to ${functionName}: ${fixRecommendation.description}`);
        
        try {
            // Store current state for potential rollback
            const currentState = await this.getCurrentFunctionState(functionName);
            this.deploymentHistory.set(functionName, currentState);
            
            const fixResult = await this.executeFix(functionName, fixRecommendation);
            
            // Verify the fix was applied successfully
            const verification = await this.verifyFix(functionName, fixResult);
            
            if (verification.success) {
                console.log(`✅ Fix applied successfully to ${functionName}`);
                return {
                    success: true,
                    functionName,
                    fixType: fixRecommendation.fixType,
                    version: fixResult.version,
                    appliedAt: new Date().toISOString(),
                    verification
                };
            } else {
                console.log(`❌ Fix verification failed for ${functionName}, rolling back...`);
                await this.rollbackFix(functionName, currentState);
                return {
                    success: false,
                    functionName,
                    error: 'Fix verification failed',
                    rolledBack: true
                };
            }
            
        } catch (error) {
            console.error(`❌ Failed to apply fix to ${functionName}:`, error);
            
            // Attempt rollback
            try {
                const currentState = this.deploymentHistory.get(functionName);
                if (currentState) {
                    await this.rollbackFix(functionName, currentState);
                }
            } catch (rollbackError) {
                console.error('Rollback also failed:', rollbackError);
            }
            
            return {
                success: false,
                functionName,
                error: error.message,
                rolledBack: true
            };
        }
    }

    /**
     * Execute the specific fix based on recommendation
     */
    async executeFix(functionName, fixRecommendation) {
        const { solution, fixType } = fixRecommendation;
        
        switch (solution.type) {
            case 'updateTimeout':
                return await this.updateFunctionTimeout(functionName, solution.newTimeout);
                
            case 'updateMemory':
                return await this.updateFunctionMemory(functionName, solution.newMemory);
                
            case 'updateDependencies':
                return await this.updateFunctionDependencies(functionName, solution.suggestedPackages);
                
            case 'fixSyntax':
                return await this.fixFunctionSyntax(functionName, solution.errorLocations);
                
            case 'addErrorHandling':
                return await this.addErrorHandling(functionName, solution.areas);
                
            default:
                throw new Error(`Unknown fix type: ${solution.type}`);
        }
    }

    /**
     * Update function timeout using Lambda MCP
     */
    async updateFunctionTimeout(functionName, newTimeout) {
        console.log(`⏱️  Updating timeout for ${functionName} to ${newTimeout}s`);
        
        try {
            // Step 1: Update function configuration
            const configUpdate = await this.callLambdaMCP('updateFunctionConfiguration', {
                FunctionName: functionName,
                Timeout: newTimeout
            });
            
            // Step 2: Publish new version
            const version = await this.callLambdaMCP('publishVersion', {
                FunctionName: functionName,
                Description: `Auto-fix: Updated timeout to ${newTimeout}s`
            });
            
            // Step 3: Update PROD alias
            const aliasUpdate = await this.callLambdaMCP('updateAlias', {
                FunctionName: functionName,
                Name: 'PROD',
                FunctionVersion: version.Version
            });
            
            return {
                type: 'timeout',
                newTimeout,
                version: version.Version,
                configUpdate,
                aliasUpdate
            };
            
        } catch (error) {
            console.error('Failed to update timeout:', error);
            throw error;
        }
    }

    /**
     * Update function memory using Lambda MCP
     */
    async updateFunctionMemory(functionName, newMemory) {
        console.log(`💾 Updating memory for ${functionName} to ${newMemory}MB`);
        
        try {
            // Step 1: Update function configuration
            const configUpdate = await this.callLambdaMCP('updateFunctionConfiguration', {
                FunctionName: functionName,
                MemorySize: newMemory
            });
            
            // Step 2: Publish new version
            const version = await this.callLambdaMCP('publishVersion', {
                FunctionName: functionName,
                Description: `Auto-fix: Updated memory to ${newMemory}MB`
            });
            
            // Step 3: Update PROD alias
            const aliasUpdate = await this.callLambdaMCP('updateAlias', {
                FunctionName: functionName,
                Name: 'PROD',
                FunctionVersion: version.Version
            });
            
            return {
                type: 'memory',
                newMemory,
                version: version.Version,
                configUpdate,
                aliasUpdate
            };
            
        } catch (error) {
            console.error('Failed to update memory:', error);
            throw error;
        }
    }

    /**
     * Update function dependencies using Lambda MCP
     */
    async updateFunctionDependencies(functionName, missingPackages) {
        console.log(`📦 Adding dependencies for ${functionName}:`, missingPackages);
        
        try {
            // Step 1: Get current function code
            const currentCode = await this.callLambdaMCP('getFunction', {
                FunctionName: functionName
            });
            
            // Step 2: Create updated package.json
            const updatedPackageJson = await this.updatePackageJson(
                currentCode.Code, 
                missingPackages
            );
            
            // Step 3: Create deployment package
            const deploymentPackage = await this.createDeploymentPackage(
                currentCode.Code,
                updatedPackageJson
            );
            
            // Step 4: Update function code
            const codeUpdate = await this.callLambdaMCP('updateFunctionCode', {
                FunctionName: functionName,
                ZipFile: deploymentPackage
            });
            
            // Step 5: Publish new version
            const version = await this.callLambdaMCP('publishVersion', {
                FunctionName: functionName,
                Description: `Auto-fix: Added dependencies: ${missingPackages.join(', ')}`
            });
            
            // Step 6: Update PROD alias
            const aliasUpdate = await this.callLambdaMCP('updateAlias', {
                FunctionName: functionName,
                Name: 'PROD',
                FunctionVersion: version.Version
            });
            
            return {
                type: 'dependencies',
                addedPackages: missingPackages,
                version: version.Version,
                codeUpdate,
                aliasUpdate
            };
            
        } catch (error) {
            console.error('Failed to update dependencies:', error);
            throw error;
        }
    }

    /**
     * Fix function syntax errors using Lambda MCP
     */
    async fixFunctionSyntax(functionName, errorLocations) {
        console.log(`🔧 Fixing syntax errors for ${functionName}`);
        
        try {
            // Step 1: Get current function code
            const currentCode = await this.callLambdaMCP('getFunction', {
                FunctionName: functionName
            });
            
            // Step 2: Apply syntax fixes
            const fixedCode = await this.applySyntaxFixes(currentCode.Code, errorLocations);
            
            // Step 3: Update function code
            const codeUpdate = await this.callLambdaMCP('updateFunctionCode', {
                FunctionName: functionName,
                ZipFile: fixedCode
            });
            
            // Step 4: Publish new version
            const version = await this.callLambdaMCP('publishVersion', {
                FunctionName: functionName,
                Description: `Auto-fix: Fixed ${errorLocations.length} syntax errors`
            });
            
            // Step 5: Update PROD alias
            const aliasUpdate = await this.callLambdaMCP('updateAlias', {
                FunctionName: functionName,
                Name: 'PROD',
                FunctionVersion: version.Version
            });
            
            return {
                type: 'syntax',
                fixedErrors: errorLocations.length,
                version: version.Version,
                codeUpdate,
                aliasUpdate
            };
            
        } catch (error) {
            console.error('Failed to fix syntax errors:', error);
            throw error;
        }
    }

    /**
     * Add error handling to function using Lambda MCP
     */
    async addErrorHandling(functionName, errorProneAreas) {
        console.log(`🛡️  Adding error handling for ${functionName}`);
        
        try {
            // Step 1: Get current function code
            const currentCode = await this.callLambdaMCP('getFunction', {
                FunctionName: functionName
            });
            
            // Step 2: Apply error handling improvements
            const improvedCode = await this.applyErrorHandling(currentCode.Code, errorProneAreas);
            
            // Step 3: Update function code
            const codeUpdate = await this.callLambdaMCP('updateFunctionCode', {
                FunctionName: functionName,
                ZipFile: improvedCode
            });
            
            // Step 4: Publish new version
            const version = await this.callLambdaMCP('publishVersion', {
                FunctionName: functionName,
                Description: `Auto-fix: Added error handling for ${errorProneAreas.join(', ')}`
            });
            
            // Step 5: Update PROD alias
            const aliasUpdate = await this.callLambdaMCP('updateAlias', {
                FunctionName: functionName,
                Name: 'PROD',
                FunctionVersion: version.Version
            });
            
            return {
                type: 'errorHandling',
                improvedAreas: errorProneAreas,
                version: version.Version,
                codeUpdate,
                aliasUpdate
            };
            
        } catch (error) {
            console.error('Failed to add error handling:', error);
            throw error;
        }
    }

    /**
     * Call Lambda MCP API
     */
    async callLambdaMCP(operation, parameters) {
        try {
            const response = await axios.post(`${this.lambdaApiUrl}/lambda`, {
                operation,
                parameters,
                region: this.region
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });
            
            return response.data;
            
        } catch (error) {
            console.error(`Lambda MCP call failed for ${operation}:`, error.response?.data || error.message);
            throw new Error(`Lambda MCP ${operation} failed: ${error.message}`);
        }
    }

    /**
     * Get current function state for rollback
     */
    async getCurrentFunctionState(functionName) {
        try {
            const functionInfo = await this.callLambdaMCP('getFunction', {
                FunctionName: functionName
            });
            
            const aliasInfo = await this.callLambdaMCP('getAlias', {
                FunctionName: functionName,
                Name: 'PROD'
            });
            
            return {
                functionName,
                currentVersion: aliasInfo.FunctionVersion,
                configuration: functionInfo.Configuration,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Failed to get current function state:', error);
            throw error;
        }
    }

    /**
     * Update package.json with missing dependencies
     */
    async updatePackageJson(currentCode, missingPackages) {
        // This would extract and update the package.json from the current code
        // For simulation, we'll create a basic package.json
        const packageJson = {
            name: "lambda-function",
            version: "1.0.0",
            description: "Auto-fixed Lambda function",
            main: "index.js",
            dependencies: missingPackages.reduce((deps, pkg) => {
                deps[pkg] = "latest";
                return deps;
            }, {
                "aws-sdk": "^2.1000.0"
            }),
            engines: {
                node: ">=14.0.0"
            }
        };
        
        return JSON.stringify(packageJson, null, 2);
    }

    /**
     * Create deployment package with updated dependencies
     */
    async createDeploymentPackage(currentCode, packageJson) {
        // This would create a proper ZIP file with the updated code and dependencies
        // For simulation, we'll return a mock deployment package
        return Buffer.from('mock-deployment-package');
    }

    /**
     * Apply syntax fixes to code
     */
    async applySyntaxFixes(currentCode, errorLocations) {
        // This would apply actual syntax fixes based on error locations
        // For simulation, we'll return mock fixed code
        return Buffer.from('fixed-code-package');
    }

    /**
     * Apply error handling improvements to code
     */
    async applyErrorHandling(currentCode, errorProneAreas) {
        // This would add comprehensive error handling to the code
        // For simulation, we'll return mock improved code
        return Buffer.from('error-handling-improved-code');
    }

    /**
     * Verify that the fix was applied successfully
     */
    async verifyFix(functionName, fixResult) {
        try {
            // Wait a moment for the deployment to propagate
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Get the updated function configuration
            const updatedFunction = await this.callLambdaMCP('getFunction', {
                FunctionName: functionName
            });
            
            // Get the current PROD alias
            const prodAlias = await this.callLambdaMCP('getAlias', {
                FunctionName: functionName,
                Name: 'PROD'
            });
            
            // Verify the fix was applied
            let verificationPassed = false;
            
            switch (fixResult.type) {
                case 'timeout':
                    verificationPassed = updatedFunction.Configuration.Timeout === fixResult.newTimeout;
                    break;
                    
                case 'memory':
                    verificationPassed = updatedFunction.Configuration.MemorySize === fixResult.newMemory;
                    break;
                    
                case 'dependencies':
                case 'syntax':
                case 'errorHandling':
                    // For code changes, verify the version was updated
                    verificationPassed = prodAlias.FunctionVersion === fixResult.version;
                    break;
            }
            
            return {
                success: verificationPassed,
                functionVersion: prodAlias.FunctionVersion,
                configuration: updatedFunction.Configuration,
                verifiedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Fix verification failed:', error);
            return {
                success: false,
                error: error.message,
                verifiedAt: new Date().toISOString()
            };
        }
    }

    /**
     * Rollback a failed fix
     */
    async rollbackFix(functionName, previousState) {
        console.log(`🔄 Rolling back ${functionName} to version ${previousState.currentVersion}`);
        
        try {
            // Update PROD alias to point back to the previous version
            const rollbackResult = await this.callLambdaMCP('updateAlias', {
                FunctionName: functionName,
                Name: 'PROD',
                FunctionVersion: previousState.currentVersion
            });
            
            console.log(`✅ Successfully rolled back ${functionName}`);
            
            return {
                success: true,
                rolledBackTo: previousState.currentVersion,
                rolledBackAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Rollback failed:', error);
            throw error;
        }
    }

    /**
     * Get deployment history for a function
     */
    getDeploymentHistory(functionName) {
        return this.deploymentHistory.get(functionName) || null;
    }

    /**
     * Clear deployment history for a function
     */
    clearDeploymentHistory(functionName) {
        this.deploymentHistory.delete(functionName);
    }
}

module.exports = LambdaAutoFixer;
