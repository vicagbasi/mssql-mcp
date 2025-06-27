# MSSQL MCP Configuration Evolution Guide

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
  "env": {
    "WINDOWS_USERNAME": "myuser",
    "WINDOWS_PASSWORD": "mypass", 
    "WINDOWS_DOMAIN": "MYDOMAIN",
    
    "CONNECTION_CRM": "Data Source=crm-server; Initial Catalog=CRM;",
    "CONNECTION_ERP": "Data Source=erp-server; Initial Catalog=ERP;",
    "CONNECTION_HR": "Data Source=hr-server; Initial Catalog=HR;"
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
  "env": {
    "windows_credentials": "{\"username\": \"myuser\", \"password\": \"mypass\", \"domain\": \"MYDOMAIN\"}",
    "connections": "{\"crm\": \"Data Source=crm-server;\", \"erp\": \"Data Source=erp-server;\"}"
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
  "env": {
    "MSSQL_WINDOWS_CREDENTIALS": "{\"username\": \"myuser\", \"password\": \"mypass\", \"domain\": \"MYDOMAIN\"}",
    "MSSQL_CONNECTIONS": "{\"crm\": \"Data Source=crm-server;\", \"erp\": \"Data Source=erp-server;\"}"
  }
}
```

**✅ Pros:**
- Backward compatible
- Still functional

**⚠️ Cons:**
- Longer variable names
- Requires JSON string escaping

### 4. 🔧 **Individual Legacy Variables**
```json
{
  "env": {
    "MSSQL_USERNAME": "myuser",
    "MSSQL_PASSWORD": "mypass",
    "MSSQL_DOMAIN": "MYDOMAIN"
  }
}
```

**✅ Pros:**
- Simple key-value pairs
- No JSON parsing

**⚠️ Cons:**
- Only supports single connection
- Prefixed names
- Limited to basic credentials

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
