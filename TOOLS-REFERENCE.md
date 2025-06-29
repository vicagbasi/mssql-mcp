# MSSQL MCP Server - Complete Tool Reference

## 📊 Overview
- **Original Version**: 8 core tools
- **Enhanced Version**: 29 comprehensive tools
- **Improvement**: 263% more capabilities
- **Focus**: Classic ASP to .NET/Angular modernization

---

## 🔧 Core Database Tools (8 tools)
*Essential connectivity and basic database operations*

| Tool Name | Description | Use Case |
|-----------|-------------|----------|
| `list_connections` | List all available named database connections | Connection management |
| `test_connection` | Test database connectivity and get server info | Connection validation |
| `list_databases` | List all databases on SQL Server instance | Database discovery |
| `list_tables` | List all tables in connected database | Schema overview |
| `describe_table` | Get detailed table schema with columns/constraints | Table analysis |
| `sample_data` | Retrieve sample data from tables (top 10 rows) | Data exploration |
| `execute_query` | Execute custom SELECT queries (read-only) | Custom analysis |
| `get_relationships` | Get foreign key relationships between tables | Relationship mapping |

---

## 🏗️ Schema Discovery Tools (7 tools)
*Extract business logic from database objects*

| Tool Name | Description | Business Value |
|-----------|-------------|----------------|
| `list_stored_procedures` | List all stored procedures and functions | Find business logic to convert |
| `describe_stored_procedure` | Get procedure parameters and definition | Extract business rules |
| `list_views` | List all views with creation info | Identify data abstractions |
| `describe_view` | Get view definition and dependencies | Understand data transformations |
| `list_triggers` | List triggers and associated tables | Find event-driven logic |
| `describe_trigger` | Get trigger definition and events | Extract trigger business rules |
| `list_functions` | List user-defined functions by type | Catalog reusable logic |

**🎯 Modernization Value**: Extract business logic embedded in database objects for conversion to .NET services

---

## ⚡ Index & Performance Tools (5 tools)
*Optimize database performance and identify bottlenecks*

| Tool Name | Description | Performance Impact |
|-----------|-------------|-------------------|
| `list_indexes` | List indexes with detailed usage statistics | Identify index effectiveness |
| `analyze_table_stats` | Get table sizes, row counts, space usage | Plan for scaling |
| `find_missing_indexes` | Identify missing indexes from query patterns | Improve query performance |
| `analyze_index_usage` | Find unused/underutilized indexes | Reduce maintenance overhead |
| `analyze_database_size` | Complete database storage analysis | Capacity planning |

**🎯 Modernization Value**: Optimize database performance before and after modernization

---

## 🔒 Constraint Analysis Tools (5 tools)
*Extract business rules from database constraints*

| Tool Name | Description | Business Rules |
|-----------|-------------|----------------|
| `list_constraints` | List all constraints across tables | Catalog all business rules |
| `analyze_check_constraints` | Extract business rules from check constraints | Convert to validation logic |
| `list_user_defined_types` | List custom data types and definitions | Understand domain models |
| `find_computed_columns` | List computed columns and formulas | Extract calculation logic |
| `list_default_constraints` | List default value constraints | Understand default behaviors |

**🎯 Modernization Value**: Convert database business rules to application-layer validation

---

## 📊 Data Pattern Analysis Tools (4 tools)
*Understand data usage and quality patterns*

| Tool Name | Description | Analysis Value |
|-----------|-------------|----------------|
| `analyze_data_distribution` | Get data distribution and quality patterns | Assess data quality |
| `find_lookup_tables` | Automatically identify reference/lookup tables | Plan for normalized design |
| `analyze_null_patterns` | Find columns with high null percentages | Identify optional fields |
| `detect_audit_columns` | Identify audit trail patterns | Plan tracking requirements |

**🎯 Modernization Value**: Understand data patterns for modern application design

---

## 🚀 Usage Examples

### Business Logic Discovery
```javascript
// Find all stored procedures containing business logic
await mcp.call("list_stored_procedures", { 
  schema: "MyApp", 
  includeSystemObjects: false 
});

// Extract specific business rule
await mcp.call("describe_stored_procedure", {
  procedureName: "CalculateOrderTotal",
  includeDefinition: true
});

// Find business rules in constraints
await mcp.call("analyze_check_constraints", { schema: "MyApp" });
```

### Performance Analysis
```javascript
// Identify performance optimization opportunities
await mcp.call("find_missing_indexes", { 
  schema: "MyApp", 
  minImpact: 1000 
});

// Find unused indexes to remove
await mcp.call("analyze_index_usage", { 
  schema: "MyApp", 
  showUnusedOnly: true 
});
```

### Data Architecture Planning
```javascript
// Identify lookup tables for reference data
await mcp.call("find_lookup_tables", { 
  schema: "MyApp", 
  maxRows: 1000 
});

// Find audit patterns for modern tracking
await mcp.call("detect_audit_columns", { schema: "MyApp" });
```

---

## 🛡️ Security Features

- **Read-Only Operations**: All tools use SELECT-only queries
- **Query Validation**: Blocks dangerous SQL operations (INSERT, UPDATE, DELETE, etc.)
- **Parameter Sanitization**: Safe handling of all input parameters
- **Connection Security**: Secure connection string management
- **Result Limiting**: Automatic limits on query results

---

## 🎯 Classic ASP Modernization Workflow

### Phase 1: Discovery
1. `list_databases` → Identify application databases
2. `list_tables` → Map data structure
3. `get_relationships` → Understand data relationships
4. `find_lookup_tables` → Identify reference data

### Phase 2: Business Logic Extraction
1. `list_stored_procedures` → Find business logic
2. `describe_stored_procedure` → Extract specific rules
3. `analyze_check_constraints` → Find validation rules
4. `list_triggers` → Identify event handling

### Phase 3: Performance Assessment
1. `analyze_table_stats` → Assess current performance
2. `find_missing_indexes` → Optimize queries
3. `analyze_index_usage` → Remove unused indexes
4. `analyze_database_size` → Plan capacity

### Phase 4: Data Quality Analysis
1. `analyze_data_distribution` → Assess data quality
2. `analyze_null_patterns` → Identify data issues
3. `detect_audit_columns` → Plan tracking features

---

## 📈 Benefits for Modernization

### Business Logic Discovery
- **Extract 100% of database business rules**
- **Identify hidden validation logic**
- **Find event-driven processes**
- **Catalog reusable functions**

### Performance Optimization
- **Identify performance bottlenecks**
- **Optimize before migration**
- **Plan for modern workloads**
- **Reduce technical debt**

### Architecture Planning
- **Design Entity Framework models**
- **Plan microservices boundaries**
- **Identify shared reference data**
- **Design audit/logging systems**

### Risk Mitigation
- **Ensure no business logic is lost**
- **Maintain data integrity**
- **Preserve performance characteristics**
- **Plan for scalability**

---

## 🔧 Technical Specifications

- **Language**: TypeScript/Node.js
- **Database**: Microsoft SQL Server (all versions)
- **Protocol**: Model Context Protocol (MCP)
- **Architecture**: Modular, extensible design
- **Security**: Read-only, validated queries
- **Performance**: Optimized for large databases

This enhanced MCP server provides everything needed to analyze and modernize Classic ASP applications with confidence and completeness.
