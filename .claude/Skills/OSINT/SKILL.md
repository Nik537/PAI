---
name: OSINT
description: Open Source Intelligence gathering and analysis. USE WHEN user wants to research a person, company, or entity using public sources, OR needs "background check", "due diligence", "threat intelligence", "investigate", or OSINT analysis.
agent: researcher
---

# OSINT - Open Source Intelligence

Ethical open source intelligence gathering using publicly available information to research people, companies, and entities.

## Ethical Framework

**CRITICAL: All OSINT activities must be:**
- Legal in the jurisdiction
- Ethical and proportionate
- Using only public information
- Not involving hacking, social engineering, or deception
- Compliant with data protection regulations

## Workflow Routing

| Action | Trigger | Workflow |
|--------|---------|----------|
| **People Lookup** | "research person", "who is", "background on" | Workflows/PeopleLookup.md |
| **Company Lookup** | "research company", "company intel", "who owns" | Workflows/CompanyLookup.md |
| **Entity Lookup** | "threat intel on", "IOC research", "domain intel" | Workflows/EntityLookup.md |

## Tool Categories

### People Research (30+ sources)
- Social media platforms (LinkedIn, Twitter/X, Facebook, Instagram)
- Professional databases (Crunchbase, AngelList)
- Public records (court records, property records)
- Academic sources (Google Scholar, ResearchGate)
- News archives and media mentions

### Company Research (25+ sources)
- Business registries (SEC, state filings)
- Financial databases (Bloomberg, Yahoo Finance)
- Review platforms (Glassdoor, G2)
- Tech stacks (BuiltWith, Wappalyzer)
- Domain/DNS information

### Threat Intelligence (35+ sources)
- Threat feeds (VirusTotal, AlienVault OTX)
- Reputation services (AbuseIPDB, Shodan)
- Passive DNS databases
- Certificate transparency logs
- Dark web monitoring (ethical sources only)

## Confidence Assessment

All findings are rated:
- **HIGH** - Multiple corroborating sources
- **MEDIUM** - Single authoritative source
- **LOW** - Single source, unverified
- **SPECULATION** - Inference, not direct evidence

## Output Format

```markdown
# OSINT Report: [Subject]

## Executive Summary
[1-2 paragraph overview]

## Key Findings
1. [Finding] - Confidence: HIGH/MEDIUM/LOW
2. [Finding] - Confidence: HIGH/MEDIUM/LOW

## Detailed Analysis

### [Category 1]
[Findings with sources]

### [Category 2]
[Findings with sources]

## Sources
- [Source 1] - [URL/Reference]
- [Source 2] - [URL/Reference]

## Gaps & Limitations
- [What we couldn't find]
- [What requires further investigation]
```

## Legal Disclaimer

OSINT activities should only use publicly available information. Never:
- Access private systems without authorization
- Use social engineering or deception
- Violate terms of service
- Collect data in violation of GDPR/CCPA
- Stalk, harass, or enable harm
