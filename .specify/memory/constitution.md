<!--
SYNC IMPACT REPORT
==================
Constitution Update: Template → v1.0.0
Date: 2026-05-07

VERSION CHANGE:
- Template → 1.0.0 (MAJOR: Full constitutional framework ratified with 5 core principles)

MODIFIED PRINCIPLES:
- I. Clean Code (NON-NEGOTIABLE) — filled in with clarity, maintainability, and readability guidance
- II. Simple UX (NON-NEGOTIABLE) — filled in with feature justification and no feature creep rule
- III. Responsive Design (NON-NEGOTIABLE) — filled in with viewport testing requirements
- IV. Minimal Dependencies (NON-NEGOTIABLE) — filled in with evaluation criteria and security considerations
- V. No Testing Required (SUPERSEDES ALL OTHER GUIDANCE) — new principle: tests explicitly not required

ADDED SECTIONS:
- Technology Stack (Frontend: React, React Native, Expo, Expo Router, React Navigation, React Native Web; Backend: FastAPI, Supabase)
- Development Workflow (Code Review, Manual Testing, No Automated Testing, Complexity Justification)
- Governance (Amendment procedures, versioning policy, principle supremacy)

REMOVED SECTIONS:
- None (template placeholders removed and replaced with concrete content)

TEMPLATES UPDATED:
- ✅ .specify/templates/tasks-template.md — Updated to reflect "No Testing Required" principle

TEMPLATES REQUIRING REVIEW:
- .specify/templates/plan-template.md — Advisory only; no breaking changes detected
- .specify/templates/spec-template.md — Advisory only; no breaking changes detected

FOLLOW-UP TODOS:
- None

NOTE: The "No Testing Required" principle supersedes all testing-related guidance in templates and tools.
This is a non-negotiable governance decision for the AporTamos project.
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

**Complexity Justification**: All feature additions must justify their complexity and dependency footprint against the five core principles.

## Governance

This constitution is the source of truth for AporTamos development practices. All decisions must align with the five core principles. The "No Testing Required" principle explicitly supersedes any tooling, template, or guidance suggesting test-driven development or automated testing.

Constitution amendments require documented rationale and explicit approval. Version increments follow semantic versioning: MAJOR for principle redefinition, MINOR for new principle or substantial section addition, PATCH for clarifications and wording improvements.

**Version**: 1.0.0 | **Ratified**: 2026-05-07 | **Last Amended**: 2026-05-07
