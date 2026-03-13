# Compliance - Multi-Agent Building Code System

## Overview
Production AI system for building code compliance using Claude AI, Microsoft Agent Framework, MCP servers, and multi-agent orchestration. Real-time SSE streaming, Azure B2C auth, comprehensive OTEL telemetry.

**Stack**: Python 3.12, Flask, Azure Blob Storage, Claude AI

## Environment Operations

See [deployment/infrastructure/AGENTS.md](deployment/infrastructure/AGENTS.md) for:
- Switch environment / validate partition
- Provision new environment
- Re-run deployment scripts (troubleshooting)
- Launch services (Docker or native)

**Ports:** 5003 (webapp), 8005 (permit), 8010 (document-index)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐

│ Web Application (Flask)           http://localhost:8002    │
│ - POST /api/chat/stream/v2 (SSE endpoint)                  │
│ - Azure AD token validation                                 │
│ - Coordinator orchestration                                 │
└─────┬───────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ Compliance Coordinator (Magentic Workflow)                  │
│ - Analyzes user question                                    │
│ - Delegates to specialist agents                            │
│ - Synthesizes final answer                                  │
└─────┬───────────────────────────────────────────────────────┘
      │
      ├──► Permit Agent ────────┐
      ├──► Electrical Agent ────┤
      ├──► Plumbing Agent ──────┤ Specialist Agents
      └──► IBC Agent ────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│ MCP Servers                                                  │
│ - Document Index MCP (8004): Code documents                 │
│ - Permit Set MCP (8005): Permit processing + analysis       │
│                                                              │
│ Data Sources:                                                │
│ - Azure Blob Storage (permits, documents)                   │
│ - Local indexes (article/chapter metadata)                  │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

**See individual `Claude.md` files in each directory for detailed documentation.**

```
Compliance/
├── Claude.md                     # THIS FILE