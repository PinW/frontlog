# Gemini CLI Integration Guide for Claude Code

This document outlines how to integrate and use the Gemini CLI as a sub-agent within Claude Code workflows.

## Overview

Gemini CLI is an open-source AI agent that brings Google's Gemini 2.5 Pro model directly into your terminal. It's designed for developers working with codebases and provides a 1 million token context window for handling large projects.

## Current Installation Status

- **Version**: 0.1.7
- **Location**: `/home/pin/.nvm/versions/node/v22.16.0/bin/gemini`
- **Status**: ✅ Installed and functional
- **Test Result**: Basic functionality works (`echo "What is 2+2?" | gemini` returns `4`)

## Command Line Interface

### Basic Usage Options

```bash
gemini [options]
```

### Key Options for Integration

| Option | Description | Default | Use Case |
|--------|-------------|---------|----------|
| `-m, --model` | Specify model | `gemini-2.5-pro` | Choose different model variants |
| `-p, --prompt` | Direct prompt input | - | Single-shot queries |
| `-s, --sandbox` | Run in sandbox mode | false | Safe code execution |
| `-d, --debug` | Enable debug mode | false | Troubleshooting integration |
| `-a, --all_files` | Include all files in context | false | Full codebase analysis |
| `-y, --yolo` | Auto-accept all actions | false | **⚠️ Use with caution** |
| `-c, --checkpointing` | Enable file edit checkpointing | false | Track changes safely |

## Integration Patterns for Claude Code

### 1. Simple Sub-Agent Calls

**Basic Pattern:**
```bash
echo "Your prompt here" | gemini -p "Additional context"
```

**With Model Selection:**
```bash
echo "Analyze this code" | gemini -m gemini-2.5-pro -p "Focus on security vulnerabilities"
```

### 2. File-Aware Analysis

**Include All Files:**
```bash
gemini -a -p "Analyze the architecture of this codebase"
```

**Safer Approach (Recommended):**
```bash
gemini -p "Review the main components in src/ directory"
```

### 3. Sandbox Mode for Code Execution

**Safe Code Testing:**
```bash
gemini -s -p "Generate and test a sorting algorithm"
```

### 4. Integration with Claude Code Bash Tool

**Example Integration:**
```bash
# Claude Code can call this via Bash tool
echo "Refactor this function for better performance" | gemini -p "Context: Vue.js application with Pinia store"
```

## Sub-Agent Use Cases

### 1. Code Review and Analysis
- **Prompt**: "Review this pull request for potential issues"
- **Command**: `gemini -p "Focus on security, performance, and maintainability"`

### 2. Architecture Analysis
- **Prompt**: "Explain the system architecture"
- **Command**: `gemini -a -p "Create a high-level overview"`

### 3. Bug Investigation
- **Prompt**: "Debug this error: [error message]"
- **Command**: `gemini -d -p "Include stack trace analysis"`

### 4. Documentation Generation
- **Prompt**: "Generate README documentation"
- **Command**: `gemini -p "Focus on installation and usage"`

### 5. Test Generation
- **Prompt**: "Create unit tests for this module"
- **Command**: `gemini -p "Use the existing test framework"`

## Safety and Best Practices

### ⚠️ Important Safety Notes

1. **Never use `-y, --yolo` flag** in production or with untrusted code
2. **Always review generated code** before executing
3. **Use sandbox mode** (`-s`) for code execution tasks
4. **Enable checkpointing** (`-c`) for file modification tasks

### Error Handling

The CLI may show network timeout errors in logs (to telemetry endpoints), but these don't affect functionality:
```
Error flushing log events: AggregateError [ETIMEDOUT]
```
These can be safely ignored or suppressed with `2>/dev/null`.

## Integration Architecture

### Current Setup
```
Claude Code (Bash tool) → Gemini CLI → Gemini 2.5 Pro
```

### Recommended Workflow
1. **Claude Code** identifies need for additional analysis
2. **Constructs appropriate prompt** with context
3. **Calls Gemini CLI** via Bash tool with proper flags
4. **Processes response** and incorporates findings
5. **Presents results** to user with attribution

## Performance Considerations

### Rate Limits (Free Tier)
- **60 requests per minute**
- **1,000 requests per day**
- **1M token context window**

### Best Practices for Claude Code Integration
1. **Batch related queries** to minimize API calls
2. **Use specific prompts** to get focused responses
3. **Cache results** when possible
4. **Monitor usage** to stay within limits

## Example Integration Scripts

### 1. Code Review Helper
```bash
#!/bin/bash
# code-review.sh
echo "Review this code for issues: $1" | gemini -p "Focus on: security, performance, bugs"
```

### 2. Architecture Analyzer
```bash
#!/bin/bash
# analyze-architecture.sh
gemini -a -p "Analyze system architecture and suggest improvements"
```

### 3. Safe Code Generator
```bash
#!/bin/bash
# generate-code.sh
echo "$1" | gemini -s -c -p "Generate production-ready code with tests"
```

## MCP Integration Potential

Gemini CLI supports **Model Context Protocol (MCP)** for:
- **Tool integration** with external systems
- **Memory persistence** across sessions
- **Custom server integration**

This opens possibilities for:
- **Custom Claude Code tools**
- **Project-specific integrations**
- **Enhanced context management**

## Authentication and Setup

### Current Status
- Uses personal Google account authentication
- Free tier provides generous usage limits
- No additional setup required

### For Production Use
- Consider Google Cloud integration for higher limits
- Implement usage tracking and monitoring
- Set up proper error handling and logging

## Troubleshooting

### Common Issues
1. **Network timeouts**: Telemetry errors can be ignored
2. **Authentication failures**: Re-authenticate with Google account
3. **Model unavailable**: Check model name spelling
4. **Context too large**: Use file filtering or chunking

### Debug Mode
```bash
gemini -d -p "Your prompt here"
```

## Future Enhancements

### Potential Integrations
1. **Custom MCP servers** for project-specific tools
2. **Integration with VS Code** via Gemini Code Assist
3. **Automated workflow triggers**
4. **Enhanced context management**

### Development Opportunities
- Fork the open-source project for custom modifications
- Contribute to the Google Gemini CLI project
- Build custom MCP servers for specialized use cases

## Conclusion

Gemini CLI provides a powerful sub-agent capability for Claude Code with:
- **Easy integration** via existing Bash tool
- **Generous free tier** for development use
- **Strong safety features** with sandbox mode
- **Extensible architecture** via MCP protocol

The CLI is production-ready and can significantly enhance Claude Code's capabilities for code analysis, generation, and review tasks.

---

*Last updated: 2025-07-17*
*Gemini CLI version: 0.1.7*