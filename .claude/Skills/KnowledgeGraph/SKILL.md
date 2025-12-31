---
name: KnowledgeGraph
description: Persistent knowledge graph using Memory MCP for entities, relations, and observations. Enables semantic querying of PAI knowledge across sessions. USE WHEN user says 'remember this', 'what do I know about', 'create entity', 'link concepts', 'knowledge graph', 'store knowledge', OR user wants to persist learnings, track relationships, or query past knowledge.
---

# KnowledgeGraph - Persistent Knowledge System

Wraps the Memory MCP (`mcp__memory__*`) tools to provide a semantic knowledge layer for PAI.

## Why Knowledge Graph?

**Current PAI History System:**
- Flat markdown files in `${PAI_DIR}/History/`
- Great for chronological records
- Hard to query relationships

**KnowledgeGraph Enhancement:**
- Entities with types and observations
- Relations between entities
- Semantic queries across all knowledge
- Persistent across sessions

---

## Core Concepts

### Entities
Things we want to remember: people, projects, concepts, tools, decisions.

```json
{
  "name": "Koper-Rezervacije",
  "entityType": "Project",
  "observations": [
    "Next.js 15 reservation system for ZMKT Koper",
    "Uses Turso LibSQL database",
    "Deployed on Vercel",
    "Handles venue and equipment bookings"
  ]
}
```

### Relations
Connections between entities (always in active voice).

```json
{
  "from": "Koper-Rezervacije",
  "relationType": "uses",
  "to": "Turso"
}
```

### Observations
Facts and notes attached to entities.

```
Entity: "TDD"
Observations:
- "Red-Green-Refactor cycle"
- "Aligns with PAI Constitution Principle #6"
- "Integrated as PAI skill on 2025-01-15"
```

---

## Workflow Routing

| Workflow | Trigger | Action |
|----------|---------|--------|
| **Remember** | "remember this", "store this" | Create entity with observations |
| **Recall** | "what do I know about X" | Search and return knowledge |
| **Link** | "connect X to Y", "X relates to Y" | Create relation between entities |
| **Explore** | "show knowledge graph", "all entities" | Read entire graph |
| **Forget** | "forget about X", "remove X" | Delete entity or observation |

---

## Memory MCP Tools Reference

### Creating Knowledge

**Create Entities:**
```
mcp__memory__create_entities
```
```json
{
  "entities": [
    {
      "name": "Entity Name",
      "entityType": "Type",
      "observations": ["Fact 1", "Fact 2"]
    }
  ]
}
```

**Create Relations:**
```
mcp__memory__create_relations
```
```json
{
  "relations": [
    {
      "from": "Entity A",
      "relationType": "relates_to",
      "to": "Entity B"
    }
  ]
}
```

**Add Observations:**
```
mcp__memory__add_observations
```
```json
{
  "observations": [
    {
      "entityName": "Entity Name",
      "contents": ["New fact 1", "New fact 2"]
    }
  ]
}
```

### Querying Knowledge

**Search Nodes:**
```
mcp__memory__search_nodes
```
```json
{
  "query": "search term"
}
```

**Open Specific Nodes:**
```
mcp__memory__open_nodes
```
```json
{
  "names": ["Entity 1", "Entity 2"]
}
```

**Read Entire Graph:**
```
mcp__memory__read_graph
```
(No parameters - returns everything)

### Removing Knowledge

**Delete Entities:**
```
mcp__memory__delete_entities
```
```json
{
  "entityNames": ["Entity to delete"]
}
```

**Delete Observations:**
```
mcp__memory__delete_observations
```
```json
{
  "deletions": [
    {
      "entityName": "Entity Name",
      "observations": ["Observation to remove"]
    }
  ]
}
```

**Delete Relations:**
```
mcp__memory__delete_relations
```
```json
{
  "relations": [
    {
      "from": "Entity A",
      "relationType": "relates_to",
      "to": "Entity B"
    }
  ]
}
```

---

## Entity Type Taxonomy

Use consistent entity types for better querying:

| Type | Use For | Examples |
|------|---------|----------|
| **Project** | Codebases, initiatives | Koper-Rezervacije, PAI |
| **Person** | People mentioned | User contacts, collaborators |
| **Technology** | Tools, frameworks, languages | Next.js, Turso, TypeScript |
| **Concept** | Ideas, patterns, principles | TDD, CLI-First, Progressive Disclosure |
| **Decision** | Architectural choices | "Chose Turso over Supabase" |
| **Problem** | Issues encountered | "Prisma doesn't support LibSQL" |
| **Solution** | How problems were solved | "Used @prisma/adapter-libsql" |
| **Learning** | Insights gained | "Turso requires special connection handling" |
| **Skill** | PAI skills | TDD, Research, KnowledgeGraph |
| **Agent** | PAI agents | Engineer, Debugger, Architect |

---

## Relation Types

Use consistent relation types:

| Relation | Meaning | Example |
|----------|---------|---------|
| **uses** | A uses B | Project uses Technology |
| **created** | A created B | Person created Project |
| **solved** | A solved B | Solution solved Problem |
| **learned_from** | A learned from B | Learning learned_from Problem |
| **related_to** | General association | Concept related_to Concept |
| **depends_on** | A depends on B | Project depends_on Technology |
| **part_of** | A is part of B | Skill part_of PAI |
| **implements** | A implements B | Project implements Concept |
| **documented_in** | A documented in B | Decision documented_in History |

---

## Examples

**Example 1: Remember a new project**
```
User: "Remember that I'm working on Koper-Rezervacije - a venue booking system"

-> Create entity:
{
  "entities": [{
    "name": "Koper-Rezervacije",
    "entityType": "Project",
    "observations": [
      "Venue booking system",
      "Currently working on this project",
      "Added to knowledge graph on 2025-01-15"
    ]
  }]
}
```

**Example 2: Query existing knowledge**
```
User: "What do I know about Turso?"

-> Search: mcp__memory__search_nodes({ "query": "Turso" })
-> Return: All entities and observations mentioning Turso
```

**Example 3: Link related concepts**
```
User: "Connect the TDD skill to the Engineer agent"

-> Create relation:
{
  "relations": [{
    "from": "TDD",
    "relationType": "used_by",
    "to": "Engineer"
  }]
}
```

**Example 4: Add observation to existing entity**
```
User: "Add a note that Koper uses Prisma with the LibSQL adapter"

-> Add observation:
{
  "observations": [{
    "entityName": "Koper-Rezervacije",
    "contents": ["Uses Prisma ORM with @prisma/adapter-libsql for Turso"]
  }]
}
```

---

## Integration with PAI History

**Synergy Pattern:**
- **History/** stores chronological session logs, learnings, research
- **KnowledgeGraph** stores entities, relationships, queryable facts

**When to use which:**

| Need | Use |
|------|-----|
| Record what happened in a session | History/sessions/ |
| Remember a fact about a project | KnowledgeGraph entity |
| Document a learning narrative | History/learnings/ |
| Track relationships between things | KnowledgeGraph relations |
| Search by date/time | History/ (file dates) |
| Search by concept/relationship | KnowledgeGraph |

---

## Auto-Capture Patterns

Consider auto-capturing to KnowledgeGraph:

1. **New projects** encountered in sessions
2. **Technologies** used in implementations
3. **Decisions** made during planning
4. **Problems** encountered and solved
5. **Learnings** extracted from sessions

**Capture Trigger (manual for now):**
After significant work, ask: "Should I add this to the knowledge graph?"

---

## Quick Reference

### Create New Knowledge
```
Remember [X] as a [Type]:
-> mcp__memory__create_entities

Add note to [X]:
-> mcp__memory__add_observations

Link [X] to [Y]:
-> mcp__memory__create_relations
```

### Query Knowledge
```
What do I know about [X]?
-> mcp__memory__search_nodes

Show me everything about [X]:
-> mcp__memory__open_nodes

Show entire knowledge graph:
-> mcp__memory__read_graph
```

### Remove Knowledge
```
Forget [X]:
-> mcp__memory__delete_entities

Remove note from [X]:
-> mcp__memory__delete_observations

Unlink [X] from [Y]:
-> mcp__memory__delete_relations
```
