<!--
SYNC IMPACT REPORT
==================
Constitution Update: v1.0.0 → v1.1.0
Date: 2026-05-19

VERSION CHANGE:
- v1.0.0 → v1.1.0 (MINOR: Added Git Workflow section with direct main-branch policy)

MODIFIED PRINCIPLES:
- None (core principles unchanged)

ADDED SECTIONS:
- VI. Git Workflow (NEW): All commits must target main branch directly. Feature branches are not permitted.

ADDED GUIDANCE:
- Git Workflow section specifies:
  * All work commits directly to main branch
  * No feature/secondary branches should be created
  * Simplifies workflow and reduces branch management overhead
  * Aligns with rapid iteration and continuous deployment philosophy

REMOVED SECTIONS:
- None

TEMPLATES REQUIRING REVIEW:
- .specify/templates/tasks-template.md — May reference feature branches; should clarify main-branch-only policy
- .specify/extensions.yml — Contains speckit.git.feature hook that creates branches; should be disabled per new policy

FOLLOW-UP TODOS:
- Disable speckit.git.feature hook in extensions.yml to prevent feature branch creation
- Update speckit templates to reflect main-branch-only workflow if they reference branching

NOTE: Git workflow change simplifies the development process and aligns with the principle of keeping processes straightforward and minimal.
-->

# AporTamos Constitution

## Core Principles

### I. Clean Code (NON-NEGOTIABLE)

All code must prioritize clarity and maintainability. Variable names must be self-documenting; functions must be single-purpose; complexity must be justified through documentation. Code is read far more often than written; readability supersedes brevity.

### II. Simple UX (NON-NEGOTIABLE)

UI/UX must be straightforward and intuitive. Features must serve user needs directly without unnecessary intermediation. Avoid feature creep and unnecessary UI complexity. Every UI decision must justify its presence through user value.

### III. Responsive Design (NON-NEGOTIABLE)

All interfaces must function seamlessly across devices and screen sizes. Mobile-first approach is required. Test viewports: mobile (<600px), tablet (600px-1024px), desktop (>1024px). Responsive design is non-negotiable for cross-platform compatibility.

### IV. Minimal Dependencies (NON-NEGOTIABLE)

Dependencies must be justified and kept to a minimum. Before adding a dependency, evaluate: Can this be solved with existing stdlib or built-in React Native? Is the maintenance burden justified? Unused dependencies must be removed. Security and maintenance burden weigh as heavily as feature completeness.

### V. No Testing Required (SUPERSEDES ALL OTHER GUIDANCE)

Unit tests, integration tests, and end-to-end tests are explicitly NOT required. This principle supersedes any other guidance, tooling, or templates that may suggest test-driven development or automated testing. Manual verification and code review are the primary quality gates.

### VI. Direct Main Branch Commits (NON-NEGOTIABLE)

All work commits directly to the main branch. Feature branches and secondary branches are NOT permitted. This simplifies the workflow, reduces branch management overhead, and aligns with rapid iteration and continuous deployment philosophy. Each commit should be self-contained, well-tested manually, and ready to deploy immediately.

## Technology Stack

### Frontend
- React: 19.1.0
- React Native: 0.81.5
- Expo: ~54.0.33
- Expo Router: ~6.0.23
- React Navigation: bottom-tabs 7.4.0, native 7.1.8
- React Native Web: ~0.21.0

### Backend
- FastAPI
- Supabase

These versions and technologies are locked and must be respected for all development.

## Development Workflow

**Code Review**: Focus on principle compliance—clean code standards, UX simplicity, responsive design verification, and dependency rationality.

**Manual Testing**: Verification across target devices is the primary quality assurance mechanism.

**No Automated Testing**: Not required at any stage of development.

**Complexity Justification**: All feature additions must justify their complexity and dependency footprint against the six core principles.

**Git Workflow**: All commits are made directly to main branch. No feature branches. Each commit should be atomic, well-tested manually, and ready to deploy immediately.

## Governance

This constitution is the source of truth for AporTamos development practices. All decisions must align with the six core principles. The "No Testing Required" principle explicitly supersedes any tooling, template, or guidance suggesting test-driven development or automated testing. The "Direct Main Branch Commits" principle explicitly supersedes any workflows that create feature branches.

Constitution amendments require documented rationale and explicit approval. Version increments follow semantic versioning: MAJOR for principle redefinition, MINOR for new principle or substantial section addition, PATCH for clarifications and wording improvements.

**Version**: 1.1.0 | **Ratified**: 2026-05-07 | **Last Amended**: 2026-05-19
