# 🗄️ Enhanced MSSQL MCP Server

A comprehensive Model Context Protocol (MCP) server for Microsoft SQL Server database analysis and modernizatFor complete configuration details, file locations, and troubleshooting, see the [**Configuration Guide**](CONFIGURATION_GUIDE.md).

## 💬 Conversational Usage

With multiple connections configured, you can switch between databases naturally:This enhanced server provides extensive tools for analyzing Classic ASP applications, exploring database schemas, and planning modernization to .NET/Angular architectures.

Built using the [tedious](https://github.com/tediousjs/tedious) library for pure JavaScript SQL Server connectivity with support for Windows Authentication (NTLM).

## � Why Windows Credentials in Environment Variables?

**NTLM Pass-Through Authentication Requirement:** When connecting to SQL Server using Windows Authentication (`Integrated Security=SSPI`), the MSSQL MCP server must provide explicit domain credentials because:

1. **No Interactive Session**: MCP servers run as background processes without access to the current user's Windows session
2. **NTLM Protocol**: Windows Authentication requires explicit username, password, and domain to establish the NTLM handshake
3. **Security Context**: The tedious library needs these credentials to impersonate the domain user for database access
4. **Cross-Process Authentication**: Unlike applications running in the user's context, MCP servers need explicit credential delegation

**Environment variables are the secure, standard way to provide these credentials without hardcoding them in configuration files.**

## �🚀 Quick Start

1. **📦 Install**: `npm install && npm run build`
2. **⚙️ Configure**: Set up individual environment variables (see configuration below)
3. **🔗 Connect**: Tools automatically use your configured connections
4. **🔍 Explore**: Use natural language to query and explore your databases conversationally

## 🛠️ Available Tools (28 Comprehensive Database Analysis Tools)

### 🔧 Core Database Tools (8 tools)
- **🔌 test_connection** - Test database connectivity and get server information
- **📋 list_connections** - List all available named database connections
- **📚 list_databases** - List all available databases on the SQL Server instance
- **📊 list_tables** - List all tables in a specific schema (default: dbo)
- **📝 describe_table** - Get detailed schema information including columns, data types, and constraints
- **🎯 sample_data** - Retrieve sample data from a table (default: 10 rows, max: 100)
- **💻 execute_query** - Execute custom SELECT queries (read-only, limited to 20 rows)
- **🔗 get_relationships** - Get foreign key relationships between tables

### 🏗️ Schema Discovery Tools (6 tools)
- **📋 list_stored_procedures** - List and analyze stored procedures with parameters and definitions
- **🔍 describe_stored_procedure** - Get procedure parameters and definition
- **📋 list_views** - Analyze views, their definitions, and dependencies
- **🔍 describe_view** - Get view definition and dependencies
- **⚡ list_triggers** - Identify triggers and their business logic
- **🔍 describe_trigger** - Extract trigger logic and events

### ⚡ Index & Performance Tools (5 tools)
- **📊 list_indexes** - Comprehensive index usage statistics and recommendations
- **🎯 find_missing_indexes** - Identify potentially missing indexes based on query patterns
- **📈 analyze_table_stats** - Analyze table sizes, row counts, and space usage
- **💾 analyze_database_size** - Complete database storage analysis
- **🔍 analyze_index_usage** - Identify unused and underutilized indexes

### 🔒 Constraint Analysis Tools (5 tools)
- **📋 list_constraints** - List all constraints (check, unique, foreign key, etc.)
- **✅ analyze_check_constraints** - Extract business rules from check constraints
- **🔧 list_default_constraints** - Analyze default value patterns
- **📝 list_user_defined_types** - Catalog custom data types
- **🧮 find_computed_columns** - Identify calculated fields and business logic

### 📊 Data Pattern Tools (4 tools)
- **📈 analyze_data_distribution** - Analyze data patterns and quality
- **🔍 find_lookup_tables** - Automatically identify reference/lookup tables
- **❓ analyze_null_patterns** - Find columns with high null percentages
- **🔍 detect_audit_columns** - Identify audit columns and tracking patterns

All tools accept an optional `connectionName` parameter to switch between different databases conversationally.

## ✨ Features

- **🎯 Individual Environment Variables**: Cleanest configuration approach - no JSON strings needed
- **🔄 Multi-Database Support**: Switch between different databases conversationally
- **🔐 Windows Authentication Support**: Full NTLM authentication with domain credentials
- **🏗️ Deep Schema Analysis**: Comprehensive database object exploration including stored procedures, views, triggers
- **⚡ Performance Tools**: Index analysis, missing index detection, table statistics
- **🔒 Business Logic Extraction**: Extract business rules from constraints, computed columns, and database objects
- **📊 Data Pattern Analysis**: Identify lookup tables, audit columns, and data quality patterns
- **🔍 Legacy System Analysis**: Specialized tools for Classic ASP to modern stack migration planning
- **📊 Data Sampling**: Safe data retrieval with configurable limits
- **🛡️ Read-Only Security**: Built-in query validation and safety restrictions
- **🔄 Connection Pooling**: Efficient connection reuse using tedious
- **🎛️ Multiple Config Formats**: Support for various configuration approaches

## 📦 Installation

```bash
npm install
npm run build
```

## 🔐 Environment Setup

**Note:** The `.env` file is for local testing/development only. For production use, configure your MCP client directly with environment variables.

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Update `.env` with your credentials:**
   ```bash
   # Windows Authentication credentials for NTLM
   MSSQL_USERNAME=your-domain-username
   MSSQL_PASSWORD=your-secure-password
   MSSQL_DOMAIN=your-domain
   
   # Default connection string for your database
   MSSQL_CONNECTION_STRING=Data Source=your-server; Initial Catalog=your-database; Integrated Security=SSPI; TrustServerCertificate=True;
   ```

3. **Security Note:** The `.env` file is automatically ignored by Git to prevent committing credentials.

## ⚙️ Configuration

### 🎯 **Recommended Approach: Individual Environment Variables**

The cleanest, most professional approach using individual environment variables (no JSON strings required):

```jsonc
{
    "servers": {
        "mssql-mcp": {
            "type": "stdio",
            "command": "node",
            "args": ["C:\\path\\to\\mssql-mcp\\dist\\index.js"],
            "env": {
                // Windows credentials (individual variables - cleanest)
                "WINDOWS_USERNAME": "your-domain-username",
                "WINDOWS_PASSWORD": "your-secure-password",
                "WINDOWS_DOMAIN": "YOUR-DOMAIN",
                
                // Optional default connection
                "MSSQL_CONNECTION_STRING": "Data Source=main-server; Initial Catalog=MainDB; Integrated Security=SSPI; TrustServerCertificate=True;",
                
                // Multiple database connections (individual variables)
                "CONNECTION_CRM": "Data Source=crm-server; Initial Catalog=CRM_Database; Integrated Security=SSPI; TrustServerCertificate=True;",
                "CONNECTION_ERP": "Data Source=erp-server; Initial Catalog=ERP_System; Integrated Security=SSPI; TrustServerCertificate=True;",
                "CONNECTION_ANALYTICS": "Data Source=analytics-server; Initial Catalog=DataWarehouse; Integrated Security=SSPI; TrustServerCertificate=True;",
                "CONNECTION_HR": "Data Source=hr-server; Initial Catalog=HumanResources; Integrated Security=SSPI; TrustServerCertificate=True;"
            }
        }
    }
}
```

### 🎯 **Connection Name Mapping**

When using `CONNECTION_*` variables, connection names are automatically generated:

| Environment Variable | Connection Name (for tools) |
|---------------------|------------------------------|
| `CONNECTION_CRM` | `crm` |
| `CONNECTION_ERP` | `erp` |
| `CONNECTION_ANALYTICS` | `analytics` |
| `CONNECTION_HR_SYSTEM` | `hr_system` |

**Usage in conversational queries:**
- *"Show me tables in the CRM database"* → uses `crm` connection
- *"What's in the analytics warehouse?"* → uses `analytics` connection
- *"Query the HR system for employee data"* → uses `hr_system` connection

### 🔧 **Alternative Configuration Methods**

The server supports multiple configuration approaches for backward compatibility:
- **JSON String Variables**: `windows_credentials`, `connections` 
- **Legacy Variables**: `MSSQL_WINDOWS_CREDENTIALS`, `MSSQL_CONNECTIONS`
- **Individual Legacy**: `MSSQL_USERNAME`, `MSSQL_PASSWORD`, `MSSQL_DOMAIN`

For complete configuration details, file locations, and troubleshooting, see the [**Configuration Guide**](CONFIGURATION_GUIDE.md).

## � Security Features

#### **Global/User Level** (Recommended for personal development)
- **Location**: `%APPDATA%\Claude\claude_desktop_config.json` (Windows)
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`
- **Scope**: Available in ALL Claude Desktop conversations
- **Use Case**: Personal development setup, local databases

**Note**: Claude Desktop only supports global configuration (no project-level config)

### 📝 **VS Code**

#### **Global/User Level** (Available in all workspaces)
- **Location**: User Settings JSON
  - **Windows**: `%APPDATA%\Code\User\settings.json`
  - **macOS**: `~/Library/Application Support/Code/User/settings.json`
  - **Linux**: `~/.config/Code/User/settings.json`
- **Access**: `Ctrl+Shift+P` → "Preferences: Open User Settings (JSON)"
- **Scope**: ALL VS Code workspaces
- **Use Case**: Consistent development environment across all projects

#### **Workspace Level** (Specific workspace)
- **Location**: `.vscode/settings.json` in workspace root
- **Scope**: Specific workspace only
- **Use Case**: Workspace-specific database connections

#### **Project/Repository Level** (Recommended for teams)
- **Location**: `.vscode/mcp.json` in project root
- **Scope**: Specific project/repository only
- **Use Case**: Project-specific databases, team collaboration, version control

### 🎯 **Cursor**

#### **Global/User Level**
- **Location**: `%APPDATA%\Cursor\User\settings.json` (Windows)
- **macOS**: `~/Library/Application Support/Cursor/User/settings.json`
- **Linux**: `~/.config/Cursor/User/settings.json`
- **Scope**: ALL Cursor workspaces

#### **Workspace/Project Level**
- **Location**: `.vscode/settings.json` or `.vscode/mcp.json` in project root
- **Scope**: Specific workspace/project (Cursor uses VS Code format)

### 🏢 **Visual Studio Professional**

#### **System Level**
- **Location**: Windows System Environment Variables
- **Use Case**: System-wide credentials and connections
- **Note**: VS Professional doesn't have native MCP support yet

#### **Project Level**
- **Location**: `.vs/mcp.json` or similar (extension-dependent)
- **Status**: Depends on MCP extension implementation

### 🎯 **Configuration Priority Hierarchy**

**Override Order** (highest to lowest priority):
1. **Project/Repository Level**: `.vscode/mcp.json`
2. **Workspace Level**: `.vscode/settings.json`
3. **User/Global Level**: `User/settings.json` or Claude config
4. **System Level**: Windows Environment Variables

**Example**: If you have `WINDOWS_USERNAME` set both globally and in a project config, the project value will be used for that specific project.

### 💡 **Best Practices for File Locations**

#### **For Individual Developers:**
- **Global credentials**: Set Windows authentication in system environment variables
- **Global default connection**: Configure in Claude Desktop global config or VS Code user settings
- **Project connections**: Use `.vscode/mcp.json` for project-specific databases

#### **For Teams:**
- **Shared setup**: Document configuration in project README
- **Version control**: Include `.vscode/mcp.json` in repository for team consistency
- **Security**: Never commit actual passwords - use environment variable references

#### **For Different Use Cases:**
- **Personal projects**: Global configuration in Claude Desktop or VS Code user settings
- **Team projects**: Project-level `.vscode/mcp.json` with environment variable references
- **Enterprise**: Combination of system environment variables + project-specific configs

### 🔗 Connection String Examples

**🔐 Windows Authentication (Recommended):**
```
Data Source=ServerName; Initial Catalog=DatabaseName; Integrated Security=SSPI; TrustServerCertificate=True;
```

**🔑 SQL Server Authentication:**
```
Server=localhost,1433;Database=AdventureWorks;User Id=sa;Password=YourPassword123!;Encrypt=true;TrustServerCertificate=true;
```

**☁️ Azure SQL Database:**
```
Server=your-server.database.windows.net;Database=your-database;User Id=your-username;Password=your-password;Encrypt=true;
```

**🏷️ Named Instance:**
```
Server=localhost\\SQLEXPRESS;Database=TestDB;Integrated Security=true;TrustServerCertificate=true;
```

### 🎛️ Configuration Options

**🎯 Individual Variables (Recommended - Cleanest):**
- **`WINDOWS_USERNAME`**: Windows domain username
- **`WINDOWS_PASSWORD`**: Windows domain password  
- **`WINDOWS_DOMAIN`**: Windows domain name
- **`CONNECTION_*`**: Individual connection strings (e.g., `CONNECTION_CRM`, `CONNECTION_ANALYTICS`)
- **`MSSQL_CONNECTION_STRING`**: Optional default connection string

**Connection Mapping**: `CONNECTION_CRM` → `crm`, `CONNECTION_HR_SYSTEM` → `hr_system`

**� Technical Note: Windows Authentication Requirements**

The Windows credentials (`WINDOWS_USERNAME`, `WINDOWS_PASSWORD`, `WINDOWS_DOMAIN`) are **required** for Windows Authentication because:

1. **MCP Service Context**: The server runs as a background process without access to your Windows session
2. **NTLM Authentication**: SQL Server Windows Authentication requires explicit credentials for the NTLM handshake  
3. **Credential Delegation**: The tedious library must authenticate as your domain user to access SQL Server
4. **Security Protocol**: This is how NTLM works for service-to-service authentication - credentials must be explicitly provided

**This isn't a configuration preference - it's a technical requirement of Windows Authentication in service contexts.**

**�🔄 Alternative Approaches (Backward Compatible):**
- **JSON String Variables**: `windows_credentials`, `connections` 
- **Legacy Variables**: `MSSQL_WINDOWS_CREDENTIALS`, `MSSQL_CONNECTIONS`
- **Individual Legacy**: `MSSQL_USERNAME`, `MSSQL_PASSWORD`, `MSSQL_DOMAIN`

**💡 Why Individual Variables?**
- **🚀 Cleanest**: No JSON strings to escape or parse
- **📋 Clearest**: Each setting immediately visible  
- **🔧 Standard**: Industry-standard environment variable approach
- **✅ Error-free**: No JSON syntax issues possible
- **🔄 Compatible**: All existing configurations continue to work

## 💬 Conversational Usage

With multiple connections configured, you can switch between databases naturally in conversation:

```
User: "What database connections do I have available?"
Assistant: I'll list all your configured database connections...
[Shows: crm, erp, analytics, hr, etc.]

User: "Show me the customer tables in the CRM system"
Assistant: I'll explore the CRM database for customer-related tables...
[Uses connectionName: "crm"]

User: "Now check the analytics warehouse for sales data"
Assistant: Switching to the analytics database to look for sales data...
[Uses connectionName: "analytics"]

User: "Compare employee counts between HR system and ERP"
Assistant: I'll check both databases for employee information...
[Uses connectionName: "hr", then connectionName: "erp"]
```

## 🔒 Security Features

- **Read-Only Access**: Only SELECT statements allowed
- **Query Validation**: Automatic blocking of dangerous operations
- **Result Limiting**: Automatic TOP clauses to prevent large data dumps
- **Connection Validation**: Secure credential handling
- **Schema-Level Security**: Respects database permissions

## 🚀 Usage Examples

### Basic Database Exploration
```
User: "What tables are in my database?"
Assistant: [Lists all tables with descriptions]

User: "Describe the customers table"
Assistant: [Shows column details, data types, constraints]

User: "Show me a sample of customer data"
Assistant: [Returns first 10 rows safely]
```

### Multi-Database Scenarios
```
User: "List my available connections"
Assistant: [Shows all configured database connections]

User: "Switch to the analytics database and show me the sales tables"
Assistant: [Connects to analytics DB and lists sales-related tables]

User: "Query both CRM and ERP systems for customer overlap"
Assistant: [Queries both systems and compares results]
```

## 🏗️ Classic ASP Modernization Workflow

This MCP server provides specialized tools for analyzing Classic ASP applications and planning modernization:

### Phase 1: Discovery & Assessment
```javascript
// 1. Analyze stored procedures containing business logic
await mcp.call("list_stored_procedures", {
  schema: "MyApp",
  includeSystemObjects: false
});

// 2. Extract business rules from database constraints
await mcp.call("analyze_check_constraints", {
  schema: "MyApp"
});

// 3. Identify lookup tables and reference data
await mcp.call("find_lookup_tables", {
  schema: "MyApp"
});

// 4. Analyze performance bottlenecks
await mcp.call("find_missing_indexes", {
  schema: "MyApp"
});
```

### Phase 2: Business Logic Extraction
```javascript
// Extract detailed stored procedure logic
await mcp.call("describe_stored_procedure", {
  procedureName: "CalculateOrderTotal",
  schema: "MyApp",
  includeDefinition: true
});

// Find computed columns with business rules
await mcp.call("find_computed_columns", {
  schema: "MyApp"
});

// Analyze data validation rules
await mcp.call("analyze_check_constraints", {
  schema: "MyApp"
});
```

### Phase 3: Migration Planning
```javascript
// Identify audit trails and tracking patterns
await mcp.call("detect_audit_columns", {
  schema: "MyApp"
});

// Analyze data patterns for normalization
await mcp.call("analyze_data_distribution", {
  tableName: "Orders",
  schema: "MyApp"
});

// Plan index strategy for new application
await mcp.call("analyze_index_usage", {
  schema: "MyApp"
});
```

## 💬 Advanced Usage Examples

### Schema Discovery
```
User: "I need to understand the business logic in my legacy application database"
Assistant: I'll analyze your database for business logic patterns...

[Uses list_stored_procedures, analyze_check_constraints, find_computed_columns]

User: "What stored procedures handle order processing?"
Assistant: Let me search for order-related procedures...

[Uses list_stored_procedures with filtering, then describe_stored_procedure for detailed analysis]
```

### Performance Analysis
```
User: "Find performance issues in my database"
Assistant: I'll analyze indexes and table performance...

[Uses find_missing_indexes, analyze_table_stats, analyze_index_usage]

User: "Which tables are growing too fast?"
Assistant: Let me check table sizes and growth patterns...

[Uses analyze_table_stats, analyze_database_size]
```

### Multi-Database Analysis
```
User: "Compare customer data between our CRM and ERP systems"
Assistant: I'll analyze customer tables in both systems...

[Switches between connectionName: "crm" and connectionName: "erp"]

User: "Find data quality issues across all our databases"
Assistant: Let me check data patterns across your systems...

[Uses analyze_null_patterns, analyze_data_distribution across multiple connections]
```

## 🔧 Development

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

Contributions welcome! Please read CONTRIBUTING.md for guidelines.

## 📚 Additional Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Tedious SQL Server Driver](https://github.com/tediousjs/tedious)
- [Microsoft SQL Server Documentation](https://docs.microsoft.com/en-us/sql/)
