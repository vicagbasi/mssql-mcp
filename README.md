# MSSQL MCP Server

A Model Context Protocol (MCP) server that provides secure access to Microsoft SQL Server databases. This server enables LLM applications to explore database schemas and execute read-only queries through standardized MCP tools.

## Quick Start

1. **Install**: `npm install && npm run build`
2. **Configure**: Add server to your MCP client (Claude Desktop)
3. **Connect**: Provide SQL Server connection string when prompted
4. **Explore**: Use natural language to query and explore your database

## Available Tools

- **test_connection** - Test database connectivity and get server information
- **list_databases** - List all available databases on the SQL Server instance
- **list_tables** - List all tables in a specific schema
- **describe_table** - Get detailed schema information for a table
- **sample_data** - Retrieve sample data from a table (top 10 rows by default)
- **execute_query** - Execute custom SELECT queries (read-only, limited to 20 rows)
- **get_relationships** - Get foreign key relationships between tables

## Features

- **Schema Discovery**: List databases, tables, columns, data types, and relationships
- **Data Sampling**: Retrieve sample data from tables with configurable limits
- **Read-Only Queries**: Execute SELECT queries with automatic safety restrictions
- **Connection Management**: Efficient connection pooling for multiple database connections
- **Security**: Built-in query validation to prevent unauthorized operations

## Installation

```bash
npm install
npm run build
```

## Usage

The server communicates via stdio transport, making it compatible with MCP clients like Claude Desktop.

### Connection String Format

The server accepts standard SQL Server connection strings:

```
Server=localhost;Database=myDB;User Id=username;Password=password;
```

Or with Windows Authentication:
```
Server=localhost;Database=myDB;Integrated Security=true;
```

### Safety Features

- **Read-Only Access**: Only SELECT statements are allowed
- **Query Limits**: Automatic TOP clause insertion (20 rows for custom queries, 10 for samples)
- **Keyword Blocking**: Prevents execution of INSERT, UPDATE, DELETE, DROP, etc.
- **Error Handling**: Returns full SQL Server error messages for debugging

## How to Use

### Step 1: Setup & Configuration

1. **Install and Build**
   ```bash
   npm install
   npm run build
   ```

2. **Configure MCP Client (Claude Desktop)**
   
   **Windows**: Edit `%APPDATA%\Claude\claude_desktop_config.json`
   
   **macOS**: Edit `~/Library/Application Support/Claude/claude_desktop_config.json`
   
   Add the server configuration:
   ```json
   {
     "mcpServers": {
       "mssql": {
         "command": "node",
         "args": ["C:\\full\\path\\to\\mssql-mcp\\dist\\index.js"]
       }
     }
   }
   ```

### Step 2: Connection Strings

Choose the appropriate connection format for your SQL Server:

**SQL Server Authentication:**
```
Server=localhost,1433;Database=AdventureWorks;User Id=sa;Password=YourPassword123!;Encrypt=true;TrustServerCertificate=true;
```

**Windows Authentication:**
```
Server=localhost;Database=AdventureWorks;Integrated Security=true;Encrypt=true;TrustServerCertificate=true;
```

**Azure SQL Database:**
```
Server=your-server.database.windows.net;Database=your-database;User Id=your-username;Password=your-password;Encrypt=true;
```

**Named Instance:**
```
Server=localhost\\SQLEXPRESS;Database=TestDB;Integrated Security=true;
```

### Step 3: Using the Tools

**Quick Start Workflow:**
1. **Test Connection**: `test_connection` - Verify your connection string works
2. **Explore Databases**: `list_databases` - See available databases  
3. **Browse Tables**: `list_tables` - List tables in your database
4. **Understand Structure**: `describe_table` - Get column details and data types
5. **Preview Data**: `sample_data` - See sample rows from tables
6. **Run Queries**: `execute_query` - Execute custom SELECT statements
7. **Map Relationships**: `get_relationships` - Understand foreign key connections

**Example Usage:**
```
You: "Can you connect to my SQL Server and show me the tables?"
Assistant: I'll use the test_connection tool first, then list_tables...

You: "Show me the structure of the Users table"
Assistant: I'll use describe_table to get the column details...

You: "Can you show me some sample data from the Orders table?"
Assistant: I'll use sample_data to retrieve the first 10 rows...
```

## Integration with VS Code & GitHub Copilot Chat

You can use this MCP server directly with VS Code extensions that support the Model Context Protocol, such as **GitHub Copilot Chat** (when MCP support is enabled or available in your environment).

**How to Integrate:**
1. Start the MCP server (`npm start` or via your MCP client configuration).
2. In VS Code, open Copilot Chat or any compatible extension.
3. When prompted for a data source or MCP server, provide the path to your running MCP server (or configure as per the extension’s documentation).
4. Use natural language to:
   - Explore your SQL Server schema
   - Run safe, read-only queries
   - Preview table data and relationships

> **Tip:** If your extension supports custom MCP server configuration, point it to the built `dist/index.js` entry point and provide your SQL Server connection string when prompted.

## Integration with CLI Tools (Claude Code, Codex, Gemini CLI, Cursor IDE, etc.)

This server is compatible with any CLI, desktop, or IDE tool that supports the Model Context Protocol, including:

- **Cursor IDE**
- **Claude Code**
- **Codex CLI**
- **Gemini CLI**

 Any LLM-powered tool with MCP support

**How to Integrate:**
1. Add the MCP server to your tool’s configuration (see the example in the How to Use section).
2. Start your tool and select the MSSQL MCP server as the backend.
3. When prompted, enter your SQL Server connection string.
4. Use natural language or tool commands to:
   - List tables, columns, and relationships
   - Run SELECT queries (with built-in safety)
   - Retrieve sample data for analysis

**Example (Claude Code config):**
```json
{
  "mcpServers": {
    "mssql": {
      "command": "node",
      "args": ["/full/path/to/mssql-mcp/dist/index.js"]
    }
  }
}
```

> **Note:** The integration process is similar for Cursor IDE and other CLI tools—refer to your tool’s documentation for details on adding custom MCP servers.

## Using This MCP Server in GitHub Copilot Chat (VS Code)

You can supercharge your database workflows in VS Code by connecting GitHub Copilot Chat to this MSSQL MCP server. This enables conversational, context-aware access to your SQL Server data directly from your editor.

### How to Connect:
1. **Build the MCP server**
   ```bash
   npm install
   npm run build
   ```
2. **Start the MCP server**
   ```bash
   npm start
   ```
   Or configure your Copilot Chat extension to launch the server automatically (see below).
3. **Configure Copilot Chat**
   - Open the Copilot Chat settings in VS Code.
   - Look for a section like "Custom Data Sources" or "MCP Servers" (naming may vary as MCP support evolves).
   - Add a new MCP server entry, pointing to the built `dist/index.js` file:
     ```json
     {
       "mcpServers": {
         "mssql": {
           "command": "node",
           "args": ["/full/path/to/mssql-mcp/dist/index.js"]
         }
       }
     }
     ```
   - Save your settings and reload Copilot Chat if needed.
4. **Connect and Query**
   - In Copilot Chat, select the MSSQL MCP server as your data source.
   - When prompted, enter your SQL Server connection string.
   - Ask questions or issue commands in natural language, such as:
     - "List all tables in the current database."
     - "Show me the schema for the Orders table."
     - "Get 10 sample rows from the Users table."
     - "What are the relationships between Customers and Orders?"

### Tips for Copilot Chat Integration
- You can use all the MCP tools (schema discovery, sample data, safe queries) directly from the chat interface.
- Copilot Chat will automatically use the MCP protocol to invoke the right tool for your request.
- For best results, use clear, specific questions about your database structure or data.
- If you encounter connection issues, double-check your connection string and server logs.

> **Note:** MCP support in Copilot Chat is evolving. If you do not see a way to add a custom MCP server, check for extension updates or consult the Copilot Chat documentation for the latest integration options.

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Test the server
npm test

# Development mode (watch)
npm run dev

# Clean build directory
npm run clean
```

## Security Considerations

- Only SELECT queries are permitted
- Connection strings should be provided by the MCP client at runtime
- No persistent storage of credentials in the server
- Query results are limited to prevent excessive data transfer
- Dangerous SQL keywords are blocked

## Requirements

- Node.js 20 or higher
- Access to Microsoft SQL Server database
- Valid SQL Server connection string

## License

MIT License
