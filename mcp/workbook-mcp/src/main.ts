/**
 * Entry point for MCP clients (`.mcp.json`, MCP Inspector): connects `workbook-mcp` to stdio (MCP-SRV-001).
 * stdout carries the protocol, so nothing else may write to it.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./index";

await createServer().connect(new StdioServerTransport());
