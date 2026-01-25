---
name: Update
description: Update personal TELOS files with proper backups and version control.
---

# TELOS Update Workflow

## Purpose
Safely update TELOS files with automatic backups and change logging.

## Supported Files
- BELIEFS.md, BOOKS.md, GOALS.md, MISSION.md, WISDOM.md
- LEARNED.md, WRONG.md, MOVIES.md
- FRAMES.md, MODELS.md, NARRATIVES.md, STRATEGIES.md
- PROJECTS.md, PROBLEMS.md, CHALLENGES.md, PREDICTIONS.md

## Update Process

### Step 1: Identify Target
Parse the user's request to determine:
- Which file to update (e.g., "add a goal" → GOALS.md)
- What content to add or modify

### Step 2: Create Backup
Before any modification:
```bash
cp USER/[FILE].md USER/backups/[FILE]_$(date +%Y%m%d_%H%M%S).md
```

### Step 3: Apply Update
- For additions: Append new content with timestamp
- For modifications: Update specific sections
- Maintain existing formatting

### Step 4: Log Change
Append to USER/updates.md:
```
## [DATE] - Updated [FILE]
- [Description of change]
```

### Step 5: Confirm
Show the user what was changed and where.

## Content Formatting

### Books (BOOKS.md)
```markdown
## [Book Title]
**Author:** [Name]
**Key Insight:** [Main takeaway]
**Date Read:** [Date]
```

### Goals (GOALS.md)
```markdown
## [Goal Title]
**Status:** [Active/Completed/On Hold]
**Timeline:** [Target date]
**Why:** [Motivation]
```

### Beliefs (BELIEFS.md)
```markdown
## [Belief Statement]
**Confidence:** [High/Medium/Low]
**Evidence:** [Supporting evidence]
**Last Updated:** [Date]
```

## Safety Rules
1. ALWAYS create backup before modification
2. NEVER delete content without explicit confirmation
3. ALWAYS log changes in updates.md
4. Validate file name against approved list
