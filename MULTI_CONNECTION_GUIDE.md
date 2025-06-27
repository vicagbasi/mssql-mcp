# Multi-Application Database Connection Guide

## 🔐 Windows Authentication in MCP Context

**Critical Understanding for NTLM Authentication:**

MCP servers run as background processes without access to your Windows session. For Windows Authentication to work:

- **NTLM Requirements**: The server must explicitly provide domain credentials to establish the NTLM handshake with SQL Server
- **Service Context**: Unlike interactive applications, MCP servers cannot inherit your Windows login automatically  
- **Security Delegation**: The tedious library needs explicit username, password, and domain to authenticate as your domain user
- **Technical Necessity**: This isn't a configuration choice - it's required by the NTLM protocol for service-to-service authentication

**Environment variables (`WINDOWS_USERNAME`, `WINDOWS_PASSWORD`, `WINDOWS_DOMAIN`) are the secure, standard way to provide these credentials.**

## Overview

The MSSQL MCP Server supports storing connection strings for **multiple different database servers and applications** in a single MCP configuration. This allows you to easily switch between completely different systems, applications, and database servers during conversations without editing configuration files.

**Use Cases:**
- Different application databases (CRM, E-commerce, HR, etc.)
- Customer/client database systems
- Legacy system databases  
- Third-party/partner databases
- Analytics and reporting databases
- Archive and backup systems

## Setup

### 1. Configure Multiple Application Connections

#### 🎯 Method 1: Individual Environment Variables (Cleanest - Recommended)

```jsonc
{
  "servers": {
    "mssql-mcp": {
      "type": "stdio", 
      "command": "node",
      "args": ["./dist/index.js"],
      "env": {
        // Individual credential variables (cleanest approach)
        "WINDOWS_USERNAME": "domain-user",
        "WINDOWS_PASSWORD": "secure-password", 
        "WINDOWS_DOMAIN": "COMPANY",
        
        // Optional: Default connection for backwards compatibility
        "MSSQL_CONNECTION_STRING": "Data Source=DefaultServer; Initial Catalog=DefaultDB; Integrated Security=SSPI; TrustServerCertificate=True;",
        
        // Individual connection variables (no JSON strings needed)
        "CONNECTION_CRM_APP": "Data Source=crm-server.company.com; Initial Catalog=CRM_Database; Integrated Security=SSPI; TrustServerCertificate=True;",
        "CONNECTION_ECOMMERCE_APP": "Data Source=ecommerce-db.company.com; Initial Catalog=OnlineStore; Integrated Security=SSPI; TrustServerCertificate=True;",
        "CONNECTION_CUSTOMER_SYSTEM": "Data Source=customer-db.clientcompany.com; Initial Catalog=CustomerData; User Id=integration_user; Password=SecurePass123!; TrustServerCertificate=True;"
      }
    }
  }
}
```

#### 🔄 Method 2: JSON String Variables (Alternative)

```jsonc
{
  "servers": {
    "mssql-mcp": {
      "type": "stdio", 
      "command": "node",
      "args": ["./dist/index.js"],
      "env": {
        // Windows authentication credentials (JSON string)
        "windows_credentials": "{\"username\": \"domain-user\", \"password\": \"secure-password\", \"domain\": \"COMPANY\"}",
        
        // Optional: Default connection for backwards compatibility
        "MSSQL_CONNECTION_STRING": "Data Source=DefaultServer; Initial Catalog=DefaultDB; Integrated Security=SSPI; TrustServerCertificate=True;",
        
        // Multiple application database connections (JSON string)
        "connections": "{\"crm_app\": \"Data Source=crm-server.company.com; Initial Catalog=CRM_Database; Integrated Security=SSPI; TrustServerCertificate=True;\", \"ecommerce_app\": \"Data Source=ecommerce-db.company.com; Initial Catalog=OnlineStore; Integrated Security=SSPI; TrustServerCertificate=True;\", \"customer_system\": \"Data Source=customer-db.clientcompany.com; Initial Catalog=CustomerData; User Id=integration_user; Password=SecurePass123!; TrustServerCertificate=True;\"}"
      }
    }
  }
}
```

### 2. Configuration Structure

**Environment Variables (Individual Approach - Recommended):**
- **`WINDOWS_USERNAME`**: Windows domain username
- **`WINDOWS_PASSWORD`**: Windows domain password  
- **`WINDOWS_DOMAIN`**: Windows domain name
- **`CONNECTION_*`**: Individual connection strings (e.g., `CONNECTION_CRM_APP`, `CONNECTION_HR_SYSTEM`)

**Environment Variables (JSON String Approach):**
- **`windows_credentials`**: Clean, grouped Windows authentication credentials
  ```json
  {
    "username": "domain-user", 
    "password": "secure-password", 
    "domain": "COMPANY"
  }
  ```
- **`MSSQL_CONNECTION_STRING`**: Default connection string (optional)
- **`connections`**: Named connection strings for multiple databases (clean variable name)
  ```json
  {
    "production_app": "Data Source=prod.company.com; Initial Catalog=ProdDB;",
    "development_app": "Data Source=dev.company.com; Initial Catalog=DevDB;",
    "customer_portal": "Data Source=portal.client.com; Initial Catalog=Portal;"
  }
  ```

**Benefits of Individual Variables (Recommended):**
- **🚀 Cleanest**: No JSON strings to escape or parse
- **📋 Most Readable**: Each setting is clearly visible
- **🔧 Easiest to Edit**: Simple key-value pairs
- **✅ Error-Free**: No JSON syntax issues
- **🎯 Professional**: Industry-standard approach

**Benefits of JSON String Variables:**
- **� Grouped**: Related settings bundled together
- **🔄 Portable**: Easy to copy entire credential blocks
- **🔧 Maintainable**: Less typing, fewer errors
- **🚀 Professional**: Clean, modern configuration style
- **⬅️ Backward Compatible**: Legacy variable names still supported

**Compatibility:** The server supports both clean variable names (`windows_credentials`, `connections`) and legacy prefixed names (`MSSQL_WINDOWS_CREDENTIALS`, `MSSQL_CONNECTIONS`) for backward compatibility.

### 3. Connection Priority

The server resolves connections in this order:
1. **Explicit `connectionString`** parameter (highest priority)
2. **Named `connectionName`** parameter 
3. **Default connection** from `MSSQL_CONNECTION_STRING`
4. **Error** if none available

## Usage Examples

### Conversational Usage

You can now use natural language to switch between completely different database systems:

```
User: "What database connections do I have available?"
Assistant: I'll list all your configured database connections...
[Shows: crm_app, ecommerce_app, customer_system, legacy_inventory, etc.]

User: "I want to work with the CRM application database"
Assistant: I'll connect to the CRM application database...
[Uses connectionName: "crm_app"]

User: "Show me the customer tables"
Assistant: Here are the tables in the CRM database...

User: "Now switch to the e-commerce application database"
Assistant: Switching to the e-commerce application database...
[Uses connectionName: "ecommerce_app"]

User: "Compare the product data between the e-commerce app and the legacy inventory system"
Assistant: I'll check both databases...
[Uses connectionName: "ecommerce_app", then connectionName: "legacy_inventory"]
```

### Direct Tool Usage

#### List Available Connections
```
list_connections()
```
Returns all configured named connections.

#### Test a Specific Connection
```
test_connection(connectionName: "production")
```

#### Query Different Application Databases
```
execute_query(
  connectionName: "crm_app", 
  query: "SELECT COUNT(*) FROM Customers"
)

execute_query(
  connectionName: "ecommerce_app",
  query: "SELECT COUNT(*) FROM Products" 
)

execute_query(
  connectionName: "hr_system",
  query: "SELECT COUNT(*) FROM Employees"
)
```

#### Explore Different Applications
```
list_tables(connectionName: "legacy_inventory")
list_tables(connectionName: "customer_system")

describe_table(connectionName: "analytics_warehouse", tableName: "SalesData")
sample_data(connectionName: "third_party_api_db", tableName: "ExternalData")
```

## Connection Configuration Examples

### Different Application Systems
```json
{
  "crm_app": "Data Source=crm-server.company.com; Initial Catalog=CRM_Database; Integrated Security=SSPI; TrustServerCertificate=True;",
  "ecommerce_app": "Data Source=ecommerce-db.company.com; Initial Catalog=OnlineStore; Integrated Security=SSPI; TrustServerCertificate=True;",
  "hr_system": "Data Source=hr-db.company.com; Initial Catalog=HumanResources; Integrated Security=SSPI; TrustServerCertificate=True;",
  "inventory_system": "Data Source=inventory-server.company.com; Initial Catalog=InventoryDB; Integrated Security=SSPI; TrustServerCertificate=True;"
}
```

### Mixed Internal and External Systems
```json
{
  "internal_crm": "Data Source=internal-crm; Initial Catalog=CRM; Integrated Security=SSPI; TrustServerCertificate=True;",
  "customer_system": "Data Source=customer-db.clientcompany.com; Initial Catalog=CustomerData; User Id=integration_user; Password=SecurePass123!; TrustServerCertificate=True;",
  "partner_api_db": "Server=partner-api.external.com,1433; Database=PartnerData; User Id=api_user; Password=PartnerPass456!; Encrypt=true;",
  "legacy_mainframe": "Data Source=mainframe-bridge\\SQLEXPRESS; Initial Catalog=LegacyData; Integrated Security=SSPI; TrustServerCertificate=True;"
}
```

### Cloud and On-Premise Mix
```json
{
  "onprem_erp": "Data Source=erp-server.company.com; Initial Catalog=ERP_System; Integrated Security=SSPI; TrustServerCertificate=True;",
  "azure_webapp": "Server=myapp.database.windows.net; Database=WebApplication; User Id=admin@company.com; Password=AzurePass789!; Encrypt=true;",
  "aws_analytics": "Server=analytics.company.amazonaws.com,1433; Database=DataWarehouse; User Id=analytics_user; Password=AWSPass123!; Encrypt=true;",
  "local_dev": "Server=localhost\\SQLEXPRESS; Database=LocalDev; Integrated Security=true; TrustServerCertificate=true;"
}
```

## ✨ New Configuration Format

### Complete MCP Configuration Examples

#### For Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "mssql-mcp": {
      "command": "node",
      "args": [
        "C:\\Users\\YourUsername\\source\\repos\\mssql-mcp\\dist\\index.js"
      ],
      "env": {
        "windows_credentials": "{\"username\": \"your-domain-username\", \"password\": \"your-secure-password\", \"domain\": \"YOURDOMAIN\"}",
        
        "MSSQL_CONNECTION_STRING": "Data Source=default-server.company.com; Initial Catalog=DefaultDB; Integrated Security=SSPI; TrustServerCertificate=True;",
        
        "connections": "{\"crm_app\": \"Data Source=crm-server.company.com; Initial Catalog=CRM_Database; Integrated Security=SSPI; TrustServerCertificate=True;\", \"ecommerce_app\": \"Data Source=ecommerce-db.company.com; Initial Catalog=OnlineStore; Integrated Security=SSPI; TrustServerCertificate=True;\", \"customer_system\": \"Data Source=customer-db.clientcompany.com; Initial Catalog=CustomerData; Integrated Security=SSPI; TrustServerCertificate=True;\", \"legacy_inventory\": \"Data Source=legacy-server\\\\SQLEXPRESS; Initial Catalog=InventorySystem; Integrated Security=SSPI; TrustServerCertificate=True;\", \"analytics_warehouse\": \"Data Source=analytics.company.com; Initial Catalog=DataWarehouse; Integrated Security=SSPI; TrustServerCertificate=True;\", \"hr_system\": \"Data Source=hr-db.company.com; Initial Catalog=HumanResources; Integrated Security=SSPI; TrustServerCertificate=True;\", \"azure_app_db\": \"Server=myapp.database.windows.net; Database=CloudApplication; User Id=azure-admin; Password=AzurePass789!; Encrypt=true;\", \"third_party_api\": \"Server=api-partner.external.com,1433; Database=PartnerData; User Id=api_user; Password=PartnerPass456!; Encrypt=true;\"}"
      }
    }
  }
}
```

#### For VS Code (`.vscode/mcp.json`)
```json
{
  "servers": {
    "mssql-mcp": {
      "type": "stdio",
      "command": "node",
      "args": [
        "C:\\Users\\YourUsername\\source\\repos\\mssql-mcp\\dist\\index.js"
      ],
      "env": {
        "windows_credentials": "{\"username\": \"service.account\", \"password\": \"ServicePassword456!\", \"domain\": \"ENTERPRISE\"}",
        
        "MSSQL_CONNECTION_STRING": "Data Source=primary-db.enterprise.com; Initial Catalog=PrimaryApp; Integrated Security=SSPI; TrustServerCertificate=True;",
        
        "connections": "{\"crm_system\": \"Data Source=crm-db.enterprise.com; Initial Catalog=CRM_Production; Integrated Security=SSPI; TrustServerCertificate=True;\", \"erp_system\": \"Data Source=erp-db.enterprise.com; Initial Catalog=ERP_Database; Integrated Security=SSPI; TrustServerCertificate=True;\", \"hr_payroll\": \"Data Source=hr-server.enterprise.com; Initial Catalog=HR_Payroll; Integrated Security=SSPI; TrustServerCertificate=True;\", \"customer_portal\": \"Data Source=portal-db.enterprise.com; Initial Catalog=CustomerPortal; Integrated Security=SSPI; TrustServerCertificate=True;\", \"analytics_warehouse\": \"Data Source=analytics.enterprise.com; Initial Catalog=DataWarehouse; Integrated Security=SSPI; TrustServerCertificate=True;\", \"azure_backup\": \"Server=backup.database.windows.net; Database=BackupDB; User Id=backup_admin; Password=BackupSecure123!; Encrypt=true;\"}"
      }
    }
  }
}
```

### ⚙️ Configuration Structure

The new format uses two main environment variables with clean, intuitive names:

1. **`windows_credentials`** - Grouped Windows authentication credentials (JSON format)
2. **`connections`** - All your named database connections (JSON format)

#### Backwards Compatibility
The server supports multiple formats for gradual migration:
- **Clean names**: `windows_credentials`, `connections` (recommended)
- **Legacy prefixed**: `MSSQL_WINDOWS_CREDENTIALS`, `MSSQL_CONNECTIONS` 
- **Individual variables**: `MSSQL_USERNAME`, `MSSQL_PASSWORD`, `MSSQL_DOMAIN`

## Benefits

✅ **One Central Config**: Store all your database connections in one place  
✅ **No Configuration Switching**: Switch between any application database conversationally  
✅ **Multi-Application Support**: CRM, E-commerce, HR, Legacy, External systems  
✅ **Mixed Authentication**: Windows Auth, SQL Auth, Azure SQL, Third-party systems  
✅ **Connection Pooling**: Efficient connection reuse for each database server  
✅ **Secure Storage**: All connections pre-configured in MCP config  

## Real-World Use Cases

### Application Development & Maintenance
- **Main Application DB**: Your primary application database
- **Legacy System Integration**: Old systems that need occasional access
- **Third-Party Integrations**: Partner/vendor database systems
- **Reporting & Analytics**: Separate data warehouse or reporting databases

### Multi-Client/Multi-Tenant Scenarios  
- **Client A Database**: Customer-specific database system
- **Client B Database**: Different customer's database system
- **Internal Systems**: Your company's internal databases
- **Shared Services**: Common databases used across clients

### Development & Operations
- **Production Monitoring**: Live production database (read-only access)
- **Archive Systems**: Historical data in separate archive databases  
- **Backup Verification**: Backup/DR database systems
- **Integration Testing**: Test databases for different applications

## Troubleshooting

### "Error parsing named connections"
- The JSON string in the environment variable is malformed
- Check for proper escaping of quotes and special characters  
- Test your JSON separately before adding to MCP config

### "Named connection 'xyz' not found"
- Check that the connection name exists in your `connections` configuration
- Verify the JSON syntax is correct (use a JSON validator)
- Use `list_connections()` to see all available connections

### Connection Issues
- Each named connection can have different authentication methods
- Test individual connections with `test_connection(connectionName: "name")`
- Check network access and credentials for each server
