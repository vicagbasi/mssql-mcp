# MSSQL MCP Configuration Examples

## 🔐 Windows Authentication Requirements

**Important for NTLM Authentication:** MCP servers run as background processes and require explicit Windows credentials because:

- **No Session Access**: MCP servers cannot access your current Windows login session
- **NTLM Protocol**: Windows Authentication requires explicit domain credentials for the NTLM handshake
- **Service Context**: Background processes need explicit credential delegation to authenticate with SQL Server
- **Security Model**: The tedious library must impersonate your domain user account

**This is why `WINDOWS_USERNAME`, `WINDOWS_PASSWORD`, and `WINDOWS_DOMAIN` must be set - it's a technical requirement, not optional.**

This folder contains real-world configuration examples showcasing different approaches to configuring the MSSQL MCP Server.

## 🎯 Recommended Approach

### `individual-variables-example.json` ⭐
**The cleanest, most professional approach** using individual environment variables.

**Example:**
```json
{
  "mcpServers": {
    "mssql-mcp": {
      "command": "npx",
      "args": ["mssql-mcp-server"],
      "env": {
        "WINDOWS_USERNAME": "myuser",
        "WINDOWS_PASSWORD": "mypassword",
        "WINDOWS_DOMAIN": "MYDOMAIN",
        "CONNECTION_CRM": "Data Source=crm-server; Initial Catalog=CRM; Integrated Security=SSPI; TrustServerCertificate=True;",
        "CONNECTION_ERP": "Data Source=erp-server; Initial Catalog=ERP; Integrated Security=SSPI; TrustServerCertificate=True;"
      }
    }
  }
}
```

**Benefits:**
- No JSON strings to escape
- Each setting is clearly visible
- Industry-standard environment variable approach
- Error-proof (no JSON syntax issues)

## 📁 Available Examples

### `simple-sql-auth.json`
Minimal configuration for SQL Server Authentication (no Windows Auth required).

### `simple-config.json`
Basic configuration with essential connections using individual variables.

### `enterprise-config.json`
Comprehensive enterprise example with multiple database systems.

### `json-string-config.json`
Alternative approach using JSON strings (backward compatibility).
- **✅ Error-Proof**: No JSON syntax issues possible
- **✅ Standard**: Industry-standard environment variable approach

```json
"env": {
  "WINDOWS_USERNAME": "myuser",
  "WINDOWS_PASSWORD": "mypass",
  "WINDOWS_DOMAIN": "MYDOMAIN",
  "CONNECTION_CRM": "Data Source=crm-server; Initial Catalog=CRM;",
  "CONNECTION_ERP": "Data Source=erp-server; Initial Catalog=ERP;"
}
```

### 🔄 **JSON String Variables** (Alternative)
**Files:** `claude-desktop-config.json`, `vscode-config.json`
- **✅ Grouped**: Related settings bundled together
- **✅ Compact**: Fewer environment variables
- **⚠️ JSON Escaping**: Requires careful escaping of quotes

```json
"env": {
  "windows_credentials": "{\"username\": \"user\", \"password\": \"pass\"}",
  "connections": "{\"crm\": \"connection_string\", \"erp\": \"connection_string\"}"
}
```

## 📁 Available Examples

### 🎯 **individual-variables-example.json** ⭐ **RECOMMENDED**
**Cleanest approach using individual environment variables**
- **Configuration**: Individual environment variables (no JSON strings)
- **Use Case**: Any scenario - recommended starting point
- **Authentication**: Windows Authentication with individual credential variables
- **Databases**: Multiple enterprise systems with clear, separate connection variables

### 🖥️ **claude-desktop-config.json**
**Claude Desktop configuration using JSON string approach**
- **Configuration**: JSON string environment variables
- **Use Case**: Claude Desktop integration
- **Authentication**: Windows Authentication (JSON string format)
- **Databases**: Mixed authentication methods, multiple connection types

### � **vscode-config.json**
**VS Code MCP configuration**
- **Configuration**: JSON string environment variables  
- **Use Case**: VS Code development environment
- **Authentication**: Windows Authentication (JSON string format)
- **Databases**: Enterprise systems with various authentication methods

### 🏢 **enterprise-config.json**
**Large enterprise configuration**
- **Configuration**: Individual environment variables (cleanest approach)
- **Use Case**: Large organization with many business systems
- **Authentication**: Enterprise Windows Authentication
- **Databases**: Corporate, HR, Finance, Sales, Inventory, Analytics, Audit, Legacy, DR

### ☁️ **azure-mixed-config.json**
**Hybrid cloud environment**
- **Configuration**: JSON string environment variables
- **Use Case**: Azure SQL + on-premise databases
- **Authentication**: Mixed (Azure SQL Auth + Windows Auth)
- **Databases**: Azure Production/Staging/Analytics + On-premise Legacy + Partner systems

### 👥 **consultant-multi-client-config.json**
**Multi-client consultant configuration**
- **Configuration**: JSON string environment variables
- **Use Case**: Consultants accessing multiple client databases
- **Authentication**: Mixed authentication methods for different clients
- **Databases**: Multiple client systems, internal tools, various access patterns

## 🚀 How to Use These Examples

### 1. **Choose Your Configuration Approach**

#### ⭐ **For New Projects** (Recommended)
Start with `individual-variables-example.json` - it's the cleanest and most maintainable approach:
- No JSON strings to escape
- Each setting is clearly visible
- Industry-standard environment variable pattern
- Error-proof configuration

#### 🔄 **For Existing Projects**
If you already have JSON string configurations, they continue to work perfectly. You can migrate gradually or keep using them.

### 2. **Select Your Use Case**
- **General purpose**: `individual-variables-example.json`
- **Claude Desktop**: `claude-desktop-config.json`
- **VS Code**: `vscode-config.json`
- **Large enterprise**: `enterprise-config.json`
- **Cloud + on-premise**: `azure-mixed-config.json`
- **Multiple clients**: `consultant-multi-client-config.json`

### 3. **Customize the Configuration**
1. **Copy the entire JSON** from your chosen example
2. **Update the file path** to point to your actual `dist/index.js` location
3. **Replace placeholder values**:
   - Usernames and passwords with your actual credentials
   - Server names and connection strings with your actual database details

### 4. **Place the Configuration**

#### For Claude Desktop:
- **File location**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Recommended example**: `individual-variables-example.json` or `claude-desktop-config.json`

#### For VS Code MCP:
- **File location**: `.vscode/mcp.json` (in your workspace)
- **Recommended example**: `individual-variables-example.json` or `vscode-config.json`

## 🔄 Migration Guide

### From Legacy Configurations
All existing configurations continue to work! The server supports:

1. **Individual Legacy Variables**: `MSSQL_USERNAME`, `MSSQL_PASSWORD`, `MSSQL_DOMAIN`
2. **Prefixed JSON Variables**: `MSSQL_WINDOWS_CREDENTIALS`, `MSSQL_CONNECTIONS`  
3. **Clean JSON Variables**: `windows_credentials`, `connections`
4. **Individual Variables**: `WINDOWS_USERNAME`, `CONNECTION_*` (newest, cleanest)

### Recommended Migration Path
1. **Keep your current config working** (no rush to change)
2. **For new projects**: Use individual variables approach
3. **For updates**: Consider migrating to individual variables for cleaner maintenance

## 🔒 Security Best Practices

### Environment Variables
All examples use environment variables for credentials:
```json
"env": {
  "MSSQL_USERNAME": "your-username",
  "MSSQL_PASSWORD": "your-password", 
  "MSSQL_DOMAIN": "YOUR-DOMAIN"
}
```

### Connection String Security
- **Windows Authentication**: Use `Integrated Security=SSPI` when possible
- **SQL Authentication**: Store credentials in environment variables, not in connection strings
- **Azure SQL**: Use strong passwords and consider managed identities
- **TrustServerCertificate**: Only set to `True` for trusted internal servers

### Access Control
- Use **read-only database accounts** when possible
- Grant **minimum necessary permissions** to each connection
- Consider **separate credentials** for different environments

## 🛠️ Customizing Connection Strings

### Windows Authentication (Recommended)
```
Data Source=server-name; Initial Catalog=database-name; Integrated Security=SSPI; TrustServerCertificate=True;
```

### SQL Server Authentication
```
Server=server-name,1433; Database=database-name; User Id=username; Password=password; TrustServerCertificate=true;
```

### Azure SQL Database
```
Server=yourserver.database.windows.net; Database=database-name; User Id=username@domain.com; Password=password; Encrypt=true;
```

### Named Instance
```
Data Source=server-name\\INSTANCE-NAME; Initial Catalog=database-name; Integrated Security=SSPI; TrustServerCertificate=True;
```

## 📋 Connection Naming Conventions

Use descriptive names that clearly indicate the system:

### ✅ Good Examples:
- `crm_production`
- `ecommerce_staging` 
- `hr_system`
- `customer_portal`
- `analytics_warehouse`
- `legacy_inventory`

### ❌ Avoid:
- `db1`, `db2`, `db3`
- `server1`, `server2`
- `test`, `prod` (too generic)

## 🧪 Testing Your Configuration

After setting up your configuration:

1. **Test the MCP server starts**: Check that the server initializes without errors
2. **Test default connection**: Use `test_connection()` without parameters
3. **List available connections**: Use `list_connections()` to see all configured connections
4. **Test named connections**: Use `test_connection(connectionName: "your-connection-name")` for each connection
5. **Verify authentication**: Ensure you can connect to each database system

## 🚨 Troubleshooting

### Common Issues:

**"Error parsing MSSQL_CONNECTIONS"**
- Check JSON syntax in the connections string
- Ensure proper escaping of backslashes (`\\` for SQL Server instances)
- Validate JSON using an online JSON validator

**"Named connection not found"**
- Verify connection name spelling
- Check that the connection is included in `MSSQL_CONNECTIONS`
- Use `list_connections()` to see available connections

**"Login failed"**
- Verify credentials in environment variables
- Check network connectivity to database server
- Ensure the database user has appropriate permissions
- For Windows Auth, verify domain, username, and password

**"Server not found"**
- Check server name spelling and network connectivity
- Verify SQL Server is running and accepting connections
- Check firewall settings
- For named instances, ensure SQL Server Browser service is running

## 💡 Tips

1. **Start small**: Begin with 2-3 connections and add more as needed
2. **Test incrementally**: Add one connection at a time and test each one
3. **Use consistent naming**: Establish a naming convention and stick to it
4. **Document your connections**: Keep notes about what each connection is for
5. **Regular validation**: Periodically test all connections to ensure they're still working
