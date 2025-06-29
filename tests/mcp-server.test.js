#!/usr/bin/env node

// Combined MCP Server Test Suite
// This file merges the quick and comprehensive test scripts for the MCP server.

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Quick MCP Server Test
async function runQuickTest() {
    console.log('🚀 Quick MCP Server Test\n');
    const required = ['WINDOWS_USERNAME', 'WINDOWS_PASSWORD', 'WINDOWS_DOMAIN', 'MSSQL_CONNECTION_STRING'];
    const missing = required.filter(env => !process.env[env]);
    if (missing.length > 0) {
        console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
        console.error('Please create a .env file with your database credentials.');
        console.error('See .env.example for the required format.');
        process.exit(1);
    }
    const serverPath = join(__dirname, '../dist/index.js');
    const serverProcess = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
            ...process.env,
            WINDOWS_USERNAME: process.env.WINDOWS_USERNAME,
            WINDOWS_PASSWORD: process.env.WINDOWS_PASSWORD,
            WINDOWS_DOMAIN: process.env.WINDOWS_DOMAIN,
            MSSQL_CONNECTION_STRING: process.env.MSSQL_CONNECTION_STRING
        }
    });
    setTimeout(() => {
        console.log('📋 Testing tools/list...');
        const request = {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/list',
            params: {}
        };
        serverProcess.stdin.write(JSON.stringify(request) + '\n');
    }, 1000);
    setTimeout(() => {
        console.log('🔌 Testing test_connection...');
        const request = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
                name: 'test_connection',
                arguments: {}
            }
        };
        serverProcess.stdin.write(JSON.stringify(request) + '\n');
    }, 3000);
    let responseData = '';
    serverProcess.stdout.on('data', (data) => {
        responseData += data.toString();
        const lines = responseData.split('\n').filter(line => line.trim());
        lines.forEach(line => {
            try {
                const response = JSON.parse(line);
                if (response.id === 1) {
                    console.log(`✅ Found ${response.result.tools.length} tools available`);
                    console.log('   Core tools:', response.result.tools.slice(0, 8).map(t => t.name).join(', '));
                    console.log('   Additional tools:', response.result.tools.slice(8).length, 'additional tools');
                }
                if (response.id === 2) {
                    if (response.error) {
                        console.log(`❌ Connection failed: ${response.error.message}`);
                    } else {
                        console.log('✅ Database connection successful');
                        console.log(`   Server: ${response.result.content[0].text}`);
                    }
                }
            } catch (e) {
                // Ignore parsing errors
            }
        });
    });
    serverProcess.stderr.on('data', (data) => {
        console.log('Server error:', data.toString());
    });
    setTimeout(() => {
        console.log('\n🏁 Quick test complete');
        serverProcess.kill();
    }, 10000);
}

// Comprehensive MCP Server Test
class MCPTester {
    constructor() {
        this.testResults = [];
        this.serverProcess = null;
        this.requestId = 1;
    }
    async runTests() {
        console.log('🧪 Starting MSSQL MCP Server Tests\n');
        try {
            await this.startServer();
            await this.runToolTests();
            this.printResults();
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
        } finally {
            this.cleanup();
        }
    }
    async startServer() {
        console.log('🚀 Starting MCP server...');
        const required = ['WINDOWS_USERNAME', 'WINDOWS_PASSWORD', 'WINDOWS_DOMAIN', 'MSSQL_CONNECTION_STRING'];
        const missing = required.filter(env => !process.env[env]);
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}\nPlease check your .env file.`);
        }
        const serverPath = join(__dirname, '../dist/index.js');
        this.serverProcess = spawn('node', [serverPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                WINDOWS_USERNAME: process.env.WINDOWS_USERNAME,
                WINDOWS_PASSWORD: process.env.WINDOWS_PASSWORD,
                WINDOWS_DOMAIN: process.env.WINDOWS_DOMAIN,
                MSSQL_CONNECTION_STRING: process.env.MSSQL_CONNECTION_STRING
            }
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✅ Server started\n');
    }
    async sendRequest(method, params = {}) {
        const request = {
            jsonrpc: '2.0',
            id: this.requestId++,
            method,
            params
        };
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Request timeout for ${method}`));
            }, 10000);
            let responseData = '';
            const onData = (data) => {
                responseData += data.toString();
                try {
                    const lines = responseData.split('\n').filter(line => line.trim());
                    for (const line of lines) {
                        const response = JSON.parse(line);
                        if (response.id === request.id) {
                            clearTimeout(timeout);
                            this.serverProcess.stdout.off('data', onData);
                            resolve(response);
                            return;
                        }
                    }
                } catch (e) {
                    // Continue collecting data
                }
            };
            this.serverProcess.stdout.on('data', onData);
            this.serverProcess.stdin.write(JSON.stringify(request) + '\n');
        });
    }
    async testTool(toolName, params = {}, description = '') {
        const displayName = description || toolName;
        try {
            console.log(`  Testing: ${displayName}...`);
            const response = await this.sendRequest('tools/call', {
                name: toolName,
                arguments: params
            });
            if (response.error) {
                console.log(`    ❌ Error: ${response.error.message}`);
                this.testResults.push({ tool: displayName, status: 'error', error: response.error.message });
            } else {
                console.log(`    ✅ Success`);
                this.testResults.push({ tool: displayName, status: 'success', response: response.result });
            }
        } catch (error) {
            console.log(`    ❌ Failed: ${error.message}`);
            this.testResults.push({ tool: displayName, status: 'failed', error: error.message });
        }
    }
    async runToolTests() {
        console.log('🧪 Running Core Tool Tests:\n');
        await this.testTool('tools/list', {}, 'List Tools');
        await this.testTool('test_connection', {}, 'Test Connection');
        await this.testTool('list_databases', {}, 'List Databases');
        await this.testTool('list_tables', { schema: 'dbo' }, 'List Tables (dbo schema)');
        await this.testTool('describe_table', { tableName: 'Users' }, 'Describe Users Table');
        await this.testTool('sample_data', { tableName: 'Users', limit: 5 }, 'Sample Users Data');
        await this.testTool('get_relationships', { schema: 'dbo' }, 'Get Table Relationships');
        await this.testTool('list_stored_procedures', { schema: 'dbo' }, 'List Stored Procedures');
        await this.testTool('list_indexes', { schema: 'dbo' }, 'List Indexes');
        await this.testTool('analyze_table_stats', { schema: 'dbo' }, 'Analyze Table Statistics');
        await this.testTool('find_lookup_tables', { schema: 'dbo', maxRows: 100 }, 'Find Lookup Tables');
        await this.testTool('execute_query', { 
            query: 'SELECT COUNT(*) as TableCount FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = \'BASE TABLE\'' 
        }, 'Execute Query (Count Tables)');
    }
    printResults() {
        console.log('\n📊 Test Results Summary:\n');
        const successful = this.testResults.filter(r => r.status === 'success').length;
        const errors = this.testResults.filter(r => r.status === 'error').length;
        const failed = this.testResults.filter(r => r.status === 'failed').length;
        console.log(`✅ Successful: ${successful}`);
        console.log(`❌ Errors: ${errors}`);
        console.log(`🔥 Failed: ${failed}`);
        console.log(`📊 Total: ${this.testResults.length}\n`);
        if (errors > 0 || failed > 0) {
            console.log('❌ Failed Tests:');
            this.testResults
                .filter(r => r.status !== 'success')
                .forEach(result => {
                    console.log(`  • ${result.tool}: ${result.error}`);
                });
        }
        const successRate = Math.round((successful / this.testResults.length) * 100);
        console.log(`\n🎯 Success Rate: ${successRate}%`);
        if (successRate >= 80) {
            console.log('🎉 Server is functioning well!');
        } else if (successRate >= 60) {
            console.log('⚠️  Server has some issues but core functionality works');
        } else {
            console.log('🚨 Server has significant issues');
        }
    }
    cleanup() {
        if (this.serverProcess) {
            this.serverProcess.kill();
        }
    }
}

// Entrypoint: run both quick and comprehensive tests
async function main() {
    await runQuickTest();
    const tester = new MCPTester();
    await tester.runTests();
}

main().catch(console.error);
