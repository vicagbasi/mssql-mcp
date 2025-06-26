# GEMINI.md

## Project Objective

Develop an MCP (Model Context Protocol) server in TypeScript that enables querying and exploration of Microsoft SQL Server databases.
The server should allow access to the database using a connection string configured on the MCP client.
When a client connects, it supplies the connection string at runtime, enabling the server to establish a secure connection to the target Microsoft SQL Server database and expose schema discovery and data access tools via the MCP protocol.

## How the MCP Client Should Interact with the MCP Server

The MCP client (e.g., Copilot Chat) connects to this MCP server using a user-supplied connection string. Through the MCP protocol, the client can invoke tools to:

- **Discover the database schema:**
  List all available tables, retrieve detailed schema information for any table (including column names and their associated data types), and understand relationships between tables.
- **Retrieve sample data:**
  Optionally preview sample rows from tables to help the LLM or user understand the structure and contents of the data.
- **Execute queries:**
  Submit queries generated from natural language or explicit SQL, tailored to the actual database schema, and receive structured results.
- **Iterative exploration:**
  The LLM can iteratively request more schema details, refine queries, or retrieve additional data, all via the standardized tools exposed by the MCP server.

This enables LLM-powered apps to offer conversational, context-aware access to Microsoft SQL Server data, supporting both schema exploration (with full data type awareness) and data retrieval in a secure, modular, and user-friendly manner.

## Key Requirements

- **MCP Tools, Not REST API:**
  The server must expose tools following the MCP protocol, not traditional REST or HTTP APIs. These tools should be discoverable and invocable by MCP-compatible clients and LLMs.

- **Schema Discovery:**
  Provide tools that allow clients to inspect database schemas, including listing tables, columns, data types, and relationships. This enables LLMs and users to understand the structure and constraints of the connected Microsoft SQL Server databases.

- **Data Access:**
  Expose tools that allow querying and retrieving data from the connected Microsoft SQL Server, supporting exploratory analysis and comprehension.

- **Authentication:**
  Users authenticate with the Microsoft SQL Server by supplying a connection string configured on the MCP client. No additional authentication mechanisms are required.

- **TypeScript SDK:**
  Build the server using the Model Context Protocol TypeScript SDK ([https://github.com/modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)), ensuring full compatibility with the MCP ecosystem. Refer to the [SDK README](https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/main/README.md) for detailed information.

- **Security:**
  Handle all connection strings and credentials securely, following best practices to protect sensitive information.

- **Integration:**
  Design the server for easy integration with other MCP-compatible tools, IDEs, and LLM-powered assistants.

- **Error Handling:**
  The server should handle invalid connection strings, connection failures, and query errors gracefully, providing clear and actionable feedback to the client.

## MCP Server Configuration Focus

To achieve the project objective, the MCP server will primarily be configured to expose a set of robust **tools** for Microsoft SQL Server schema discovery and data access. While the Model Context Protocol supports prompts and resources, our main focus will be on defining and implementing tools that encapsulate the database interaction logic. These tools will be discoverable and invokable by MCP clients to facilitate conversational, context-aware access to the database.

## Additional Notes

- All tool responses must comply with MCP's JSON-RPC conventions.
- Maintain clear, well-documented, and idiomatic TypeScript code.
- Prioritize extensibility and maintainability to support future enhancements.

---

**This GEMINI.md provides system-level instructions for Gemini CLI to ensure all actions and suggestions align with the project's core objective: building an MCP server that exposes tools for Microsoft SQL Server schema discovery (including data types) and data access, with authentication handled solely via a connection string configured on the MCP client.**

## Git Workflow

For version control and progress tracking, the project should be initialized with Git and regularly checkpointed. When working on distinct features or fixes, utilize branches to isolate changes and maintain a clean history.
