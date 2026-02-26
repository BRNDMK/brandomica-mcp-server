# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in the Brandomica MCP server, please report it privately.

- Email: `security@brandomica.com`
- Fallback: `support@brandomica.com`
- GitHub issues: do **not** post unpatched vulnerabilities publicly

Please include:

- Affected package version and configuration
- Steps to reproduce
- Expected vs actual behavior
- Impact assessment (if known)
- Proof-of-concept or logs/screenshots (if safe to share)

## Response Expectations

We aim to:

- Acknowledge receipt within **72 hours**
- Triage and assess severity within **7 days**
- Provide remediation status updates for confirmed issues

Response times may vary based on severity and reproducibility.

## Scope

This policy covers:

- The `brandomica-mcp-server` npm package
- The remote MCP endpoint at `https://www.brandomica.com/mcp`
- Tool handlers and their interactions with the Brandomica API

Out of scope (unless they directly impact this package):

- Third-party services and APIs used by Brandomica
- Issues requiring physical access to user devices
- The Brandomica website UI (report those via the [main security policy](https://github.com/BRNDMK/Brandomica/blob/main/SECURITY.md))

## Safe Harbor (Good-Faith Research)

If you act in good faith, avoid privacy violations/data destruction/service disruption, and give us reasonable time to remediate before public disclosure, we will not pursue legal action for your research.

## Disclosure

Please allow reasonable time for investigation and remediation before public disclosure. We may request additional details to reproduce and validate the issue.
