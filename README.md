# 🗄️ MSSQL MCP Server

A Model Context Protocol (MCP) server that provides secure access to Microsoft SQL Server databases. This server enables LLM applications to explore database schemas and execute read-only queries through standardized MCP tools.

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

## 🛠️ Available Tools

All tools accept an optional `connectionName` parameter to switch between different databases conversationally.

- **🔌 test_connection** - Test database connectivity and get server information
- **📋 list_connections** - List all available named database connections
- **📚 list_databases** - List all available databases on the SQL Server instance
- **📊 list_tables** - List all tables in a specific schema (default: dbo)
- **📝 describe_table** - Get detailed schema information including columns, data types, and constraints
- **🎯 sample_data** - Retrieve sample data from a table (default: 10 rows, max: 100)
- **💻 execute_query** - Execute custom SELECT queries (read-only, limited to 20 rows)
- **🔗 get_relationships** - Get foreign key relationships between tables

## ✨ Features

- **🎯 Individual Environment Variables**: Cleanest configuration approach - no JSON strings needed
- **🔄 Multi-Database Support**: Switch between different databases conversationally
- **🔐 Windows Authentication Support**: Full NTLM authentication with domain credentials
- **🔍 Schema Discovery**: Comprehensive database exploration capabilities
- **📊 Data Sampling**: Safe data retrieval with configurable limits
- **🛡️ Read-Only Security**: Built-in query validation and safety restrictions
- **🔄 Connection Pooling**: Efficient connection reuse using tedious
- **🎛️ Multiple Config Formats**: Support for various configuration approaches

## 📦 Installation

```bash
npm install
npm run build
```

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

<details>
<summary>Click to see alternative configuration approaches (backward compatibility)</summary>

#### **JSON String Variables**
```jsonc
{
    "env": {
        // Grouped Windows credentials (JSON string)
        "windows_credentials": "{\"username\": \"your-domain-username\", \"password\": \"your-password\", \"domain\": \"your-domain\"}",
        
        // Multiple named connections (JSON string)
        "connections": "{\"production\": \"Data Source=prod-server; Initial Catalog=ProdDB; Integrated Security=SSPI;\", \"development\": \"Data Source=dev-server; Initial Catalog=DevDB; Integrated Security=SSPI;\"}"
    }
}
```

#### **Legacy Variables**
```jsonc
{
    "env": {
        // Individual legacy variables
        "MSSQL_USERNAME": "your-username",
        "MSSQL_PASSWORD": "your-password", 
        "MSSQL_DOMAIN": "your-domain"
    }
}
```

</details>

### 📁 **Complete Configuration Examples**

See the `examples/` folder for real-world configuration examples:
- **`individual-variables-example.json`** ⭐ - **Recommended cleanest approach**
- **`enterprise-config.json`** - Large enterprise with multiple systems
- **`cleanest-config-example.json`** - Simple clean configuration

For comprehensive multi-connection setup, see:
- **`MULTI_CONNECTION_GUIDE.md`** - Detailed multi-connection guide
- **`CONFIG_EVOLUTION_GUIDE.md`** - Comparison of all configuration approaches

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

## 🛡️ Best Practices

- **Use Windows Authentication** when possible for better security
- **Configure read-only database users** for additional safety
- **Use descriptive connection names** (e.g., `CONNECTION_SALES_CRM` vs `CONNECTION_DB1`)
- **Test connections** before deploying to production
- **Monitor query performance** and adjust limits as needed

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
