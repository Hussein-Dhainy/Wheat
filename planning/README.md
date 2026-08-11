# Wheat WebGL Practice Project — Planning Index

## Purpose

This folder is the source of truth for building a front-end-only React and Three.js practice project inspired by **Pioneer — Corn. Revolutionized.** The goal is to map the reference experience closely at the level of structure, pacing, interaction, and technical challenge, while using original wheat-themed content and assets.

This is not a source-code port. The reference used a proprietary Web3D pipeline and branded assets. We will reproduce the learning problems with our own implementation and artwork.

## Documents

1. [Reference experience map](./01-reference-experience-map.md) — page structure, chapters, sections, interactions, and wheat equivalents.
2. [Technical architecture](./02-technical-architecture.md) — libraries, application structure, rendering strategy, state, performance, testing, and deployment.
3. [Asset and content plan](./03-assets-and-content-plan.md) — required models, textures, animation, copy, audio, and ownership rules.
4. [AI implementation brief](./04-ai-implementation-brief.md) — the context and constraints an AI coding agent must know before changing the project.
5. [Roadmap and acceptance criteria](./05-roadmap-and-acceptance.md) — build order, milestones, definitions of done, risks, and estimates.

6. [Infinite diagonal transition decision](./06-infinite-diagonal-transitions.md) — the approved five-scene virtual-navigation override and compositor architecture.

## Product definition

- A single-page, scroll-directed 3D story.
- Front-end only; no API, database, account system, CMS, or server-side form handling.
- Desktop and mobile layouts with deliberate quality tiers for weaker devices.
- A fixed WebGL canvas beneath accessible HTML content and controls.
- Seven narrative beats plus a landing scene, grouped into three menu chapters.
- Two optional interactive detail experiences: environmental testing and a final grain inspection.
- Static deployment.

## Primary reference findings

The archived public experience exposes the following confirmed structure:

- Landing: “Corn. Revolutionized.”
- Chapter 1 — Science
  - Section 1: germplasm foundation
  - Section 2: computer prediction
  - Section 3: breeder selection
- Chapter 2 — Real World Testing
  - Section 4: field stress testing, with five selectable conditions
  - Section 5: a second year of broader testing
- Chapter 3 — Result
  - Section 6: the successful kernel and three result categories
- Section 7: calls to action, references, and external links

Published case studies confirm that the organizing idea was a vertical journey in which genetic code transforms into seeds, crops, and harvests. The experience combines scroll-driven 3D, HTML copy, interactive hotspots, and mobile-specific behavior.

## Sources used for planning

- Live archived experience: <https://cornrevolution.resn.global/>
- Resn showcase video: <https://vimeo.com/376927275>
- Communication Arts case study: <https://www.commarts.com/project/32502/pioneer-corn-revolution>
- Project design write-up: <https://www.shawnholpfer.com/pioneer-corn-revolutionized>
- Award overview: <https://lbbonline.com/news/resn-and-bader-rutter-win-awwwards-site-of-the-year-for-pioneer-corn-revolutionized>

## Status legend

- **Confirmed** — visible in the live public application copy, menu, or published case study.
- **Observed** — visible in showcase imagery/video or public asset naming.
- **Proposed** — our wheat adaptation or our technical solution.

## Decisions still needed before production

These decisions do not block the first technical prototype:

- Final project/brand name and logo.
- Whether the narrative teaches wheat breeding specifically or uses fictionalized copy.
- Photorealistic versus stylized art direction.
- Whether audio is included.
- Whether the practice build is private/portfolio-only or publicly released.
- Whether mobile receives the complete experience or a simplified version.
