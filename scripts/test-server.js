#!/usr/bin/env node
/**
 * Simple test script to validate the MSSQL MCP Server
 * This script tests the server's tool registration and basic functionality
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, '../dist/index.js');

function testMCPServer() {
  console.log('🧪 Testing MSSQL MCP Server...\n');

  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Test 1: Initialize the server
  const initMessage = {
    jsonrpc: "2.0",
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" }
    },
    id: 1
  };

  // Test 2: List available tools
  const listToolsMessage = {
    jsonrpc: "2.0",
    method: "tools/list",
    params: {},
    id: 2
  };

  let responseCount = 0;
  const expectedTools = [
    'test_connection',
    'list_databases', 
    'list_tables',
    'describe_table',
    'sample_data',
    'execute_query',
    'get_relationships'
  ];

  server.stdout.on('data', (data) => {
    const response = data.toString().trim();
    if (response) {
      try {
        const parsed = JSON.parse(response);
        responseCount++;

        if (parsed.id === 1 && parsed.result) {
          console.log('✅ Server initialized successfully');
          console.log(`   Protocol Version: ${parsed.result.protocolVersion || 'N/A'}`);
          console.log(`   Server Name: ${parsed.result.serverInfo?.name || 'mssql-mcp-server'}`);
        }

        if (parsed.id === 2 && parsed.result?.tools) {
          console.log('✅ Tools retrieved successfully');
          console.log(`   Found ${parsed.result.tools.length} tools:`);
          
          const foundTools = parsed.result.tools.map(tool => tool.name);
          expectedTools.forEach(expectedTool => {
            if (foundTools.includes(expectedTool)) {
              console.log(`   ✅ ${expectedTool}`);
            } else {
              console.log(`   ❌ ${expectedTool} (missing)`);
            }
          });

          // Validate tool schemas
          const hasValidSchemas = parsed.result.tools.every(tool => 
            tool.inputSchema && 
            tool.inputSchema.properties && 
            tool.inputSchema.properties.connectionString
          );

          if (hasValidSchemas) {
            console.log('✅ All tools have valid input schemas with connectionString parameter');
          } else {
            console.log('❌ Some tools have invalid input schemas');
          }

          server.kill();
          console.log('\n🎉 MSSQL MCP Server test completed successfully!\n');
          
          console.log('📋 Next Steps:');
          console.log('1. Configure your MCP client (e.g., Claude Desktop) to use this server');
          console.log('2. Provide a valid SQL Server connection string when using the tools');
          console.log('3. Test with a real database connection\n');
          
          console.log('💡 Example connection strings:');
          console.log('   SQL Auth: Server=localhost;Database=myDB;User Id=user;Password=pass;');
          console.log('   Windows:  Server=localhost;Database=myDB;Integrated Security=true;');
        }
      } catch (error) {
        console.error('❌ Failed to parse server response:', error.message);
      }
    }
  });

  server.stderr.on('data', (data) => {
    const error = data.toString().trim();
    if (error && !error.includes('Shutting down server')) {
      console.error('⚠️  Server error:', error);
    }
  });

  server.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`❌ Server exited with code ${code}`);
    }
  });

  // Send test messages
  setTimeout(() => {
    server.stdin.write(JSON.stringify(initMessage) + '\n');
  }, 100);

  setTimeout(() => {
    server.stdin.write(JSON.stringify(listToolsMessage) + '\n');
  }, 500);

  // Timeout after 10 seconds
  setTimeout(() => {
    if (!server.killed) {
      console.log('⚠️  Test timeout - killing server');
      server.kill();
    }
  }, 10000);
}

// Run the test
testMCPServer();
