# MSSQL MCP Configuration Guide

## 🔐 Understanding Windows Authentication Requirements

**Why Environment Variables Are Essential for NTLM:**

When using Windows Authentication with SQL Server, the MCP server operates as a background process that lacks access to the current user's Windows session. This creates specific requirements:

1. **NTLM Protocol Limitations**: Windows Authentication requires explicit domain credentials to establish the NTLM handshake
2. **Service Context**: MCP servers run outside the user's interactive session and cannot inherit Windows credentials automatically
3. **Security Delegation**: The tedious library must explicitly authenticate as a domain user to access SQL Server
4. **Cross-Process Authentication**: Unlike GUI applications, background services need explicit credential provision

**This is why `WINDOWS_USERNAME`, `WINDOWS_PASSWORD`, and `WINDOWS_DOMAIN` must be set in environment variables - it's a technical requirement of NTLM authentication in service contexts, not just a configuration preference.**

## 🎯 Configuration Approaches (Best to Legacy)

### 1. ⭐ **Individual Variables** (Recommended - Cleanest)

```json
{
  "servers": {
    "mssql-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["C:\\path\\to\\mssql-mcp\\dist\\index.js"],
      "env": {
        "WINDOWS_USERNAME": "myuser",
        "WINDOWS_PASSWORD": "mypass", 
        "WINDOWS_DOMAIN": "MYDOMAIN",
        
        "CONNECTION_CRM": "Data Source=crm-server; Initial Catalog=CRM;",
        "CONNECTION_ERP": "Data Source=erp-server; Initial Catalog=ERP;",
        "CONNECTION_HR": "Data Source=hr-server; Initial Catalog=HR;"
      }
    }
  }
}
```

**✅ Pros:**
- No JSON strings to escape
- Clearest, most readable
- Standard industry practice
- No parsing errors possible
- Easy to edit and maintain

### 2. 🔄 **Clean JSON Variables**

```json
{
  "servers": {
    "mssql-mcp": {
      "type": "stdio",
      "command": "node", 
      "args": ["C:\\path\\to\\mssql-mcp\\dist\\index.js"],
      "env": {
        "windows_credentials": "{\"username\": \"myuser\", \"password\": \"mypass\", \"domain\": \"MYDOMAIN\"}",
        "connections": "{\"crm\": \"Data Source=crm-server;\", \"erp\": \"Data Source=erp-server;\"}"
      }
    }
  }
}
```

**✅ Pros:**
- Shorter variable names
- Grouped related settings
- Cleaner than legacy approach

**⚠️ Cons:**
- Requires JSON string escaping
- Potential parsing errors

### 3. 📜 **Legacy Prefixed Variables**

```json
{
  "servers": {
    "mssql-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["C:\\path\\to\\mssql-mcp\\dist\\index.js"],
      "env": {
        "MSSQL_WINDOWS_CREDENTIALS": "{\"username\": \"myuser\", \"password\": \"mypass\", \"domain\": \"MYDOMAIN\"}",
        "MSSQL_CONNECTIONS": "{\"crm\": \"Data Source=crm-server;\", \"erp\": \"Data Source=erp-server;\"}"
      }
    }
  }
}
```

**✅ Pros:**
- Backward compatible
- Still functional

**⚠️ Cons:**
- Longer variable names
- Requires JSON string escaping

## 🔄 Migration Path

**Current Users:** All approaches work! You can migrate at your own pace.

**New Users:** Start with **Individual Variables** (Method 1) for the cleanest experience.

## 🎯 Connection Name Mapping

When using `CONNECTION_*` variables, the connection names are automatically mapped:

| Environment Variable | Connection Name |
|---------------------|----------------|
| `CONNECTION_CRM_APP` | `crm_app` |
| `CONNECTION_FINANCE_ERP` | `finance_erp` |
| `CONNECTION_HR_SYSTEM` | `hr_system` |
| `CONNECTION_ANALYTICS_DW` | `analytics_dw` |

The prefix `CONNECTION_` is removed and the name is converted to lowercase.

## 🏢 Multi-Application Database Setup

The MSSQL MCP Server supports storing connection strings for **multiple different database servers and applications** in a single MCP configuration. This allows you to easily switch between completely different systems, applications, and database servers during conversations.

### Use Cases
- Different application databases (CRM, E-commerce, HR, etc.)
- Customer/client database systems
- Legacy system databases  
- Third-party/partner databases
- Analytics and reporting databases
- Archive and backup systems

### Example Multi-Application Configuration

```json
{
  "servers": {
    "mssql-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["C:\\path\\to\\mssql-mcp\\dist\\index.js"],
      "env": {
        "WINDOWS_USERNAME": "domain-user",
        "WINDOWS_PASSWORD": "secure-password", 
        "WINDOWS_DOMAIN": "COMPANY",
        
        "MSSQL_CONNECTION_STRING": "Data Source=DefaultServer; Initial Catalog=DefaultDB; Integrated Security=SSPI; TrustServerCertificate=True;",
        
        "CONNECTION_CRM_APP": "Data Source=crm-server.company.com; Initial Catalog=CRM_Database; Integrated Security=SSPI; TrustServerCertificate=True;",
        "CONNECTION_ECOMMERCE_APP": "Data Source=ecommerce-db.company.com; Initial Catalog=OnlineStore; Integrated Security=SSPI; TrustServerCertificate=True;",
      "args": ["C:\\path\\to\\mssql-mcp\\dist\\index.js"],
```

### Connection Priority

The server resolves connections in this order:
1. **Explicit `connectionString`** parameter (highest priority)
2. **Named `connectionName`** parameter 
3. **Default connection** from `MSSQL_CONNECTION_STRING`
4. **Error** if none available

## 💬 Conversational Usage

You can use natural language to switch between completely different database systems:

```
User: "What database connections do I have available?"
Assistant: I'll list all your configured database connections...
[Shows: crm_app, ecommerce_app, customer_system, etc.]

User: "I want to work with the CRM application database"
Assistant: I'll connect to the CRM application database...
[Uses connectionName: "crm_app"]

User: "Show me the customer tables"
Assistant: I'll list the tables in the CRM database...
[Executes with connectionName: "crm_app"]
```

## 🛡️ Security Best Practices

1. **Environment Variables**: Store sensitive credentials in environment variables, not configuration files
2. **Minimal Permissions**: Use database accounts with only necessary read permissions
3. **Connection Encryption**: Always use `TrustServerCertificate=True` or proper SSL certificates
4. **Domain Accounts**: Use dedicated domain accounts for MCP server authentication
5. **Network Security**: Ensure proper firewall and network segmentation

## 🔧 Troubleshooting

### Common Issues

**"Login failed for user" errors:**
- Verify Windows credentials are correct
- Ensure the domain account has access to the database
- Check that the domain is reachable from the MCP server

**"Server not found" errors:**
- Verify server names and network connectivity
- Check that SQL Server is configured to accept connections
- Ensure SQL Server Browser service is running (for named instances)

**JSON parsing errors:**
- Validate JSON string format in environment variables
- Escape quotes properly in JSON strings
- Consider switching to Individual Variables approach to avoid JSON

### Testing Configuration

Use the `test_connection` tool to verify your configuration:

```javascript
// Test default connection
await mcp.call("test_connection", {});

// Test specific named connection
await mcp.call("test_connection", {
  connectionName: "crm_app"
});
```
