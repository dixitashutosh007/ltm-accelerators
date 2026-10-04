# Resilience IQ — Phase 1 Knowledge Foundation

Resilience IQ is the Enterprise Resilience & Continuity Advisory Suite for CIO/CTO offices.

## Product intent

Assess an enterprise's ability to sustain critical business services through disruption; identify resilience gaps; recommend BCP, DR, cyber-recovery, operational-resilience and third-party-resilience patterns; map the selected strategy to on-premises, AWS, Azure and GCP implementation options; and produce a target-state blueprint and roadmap.

## Phase 1 assets

- `knowledge/decision-matrix.json` — pattern shortlist/elimination/ranking logic
- `knowledge/implementation-mappings.json` — AWS/Azure/GCP/on-prem implementation mappings
- `knowledge/question-bank.json` — executive and dynamic advisory questions
- `knowledge/decision-tree.json` — assessment branching and evidence triggers
- `knowledge/recommendation-model.json` — pattern recommendation engine
- `knowledge/blueprint-engine.json` — target-state, gap-analysis and roadmap generation logic

- `knowledge/frameworks.json` — framework and standards catalog
- `knowledge/patterns.json` — initial resilience pattern library
- `knowledge/blueprints.json` — blueprint catalog
- `knowledge/assessment-model.json` — assessment domains, evidence model and question taxonomy
- `knowledge/scoring-model.json` — scoring and recommendation principles

## Design principles

1. Business-service first, infrastructure second.
2. Vendor-neutral strategy; vendor-specific implementation mapping.
3. RTO/RPO are inputs, not the complete definition of resilience.
4. Separate impact tolerance from RTO/RPO where operational-resilience concepts apply.
5. Recommendations must be explainable and evidence-backed.
6. Content is data, not application code.
7. Frameworks and cloud-service mappings are versioned.
8. Prefer patterns and blueprints over one-off recommendations.
9. Treat cyber recovery and third-party dependencies as first-class resilience concerns.
10. Never recommend a recovery architecture solely from a questionnaire score; validate business criticality, dependencies, recovery objectives and constraints.

## Phase 1 status

**Knowledge architecture v1.0 — initial baseline**

This is advisory IP and a starting catalog. It must be reviewed by subject-matter experts before being used as a formal regulatory/compliance assessment.

## Primary source families

- ISO 22301 — Business Continuity Management Systems
- ISO/IEC 27031:2025 — ICT readiness for business continuity
- NIST SP 800-34 Rev. 1 — Contingency Planning
- NIST CSF 2.0 — Cybersecurity risk outcomes
- Basel Committee Principles for Operational Resilience
- EU DORA — ICT risk, continuity, response/recovery and testing
- FCA/PRA operational resilience — important business services, impact tolerances and severe-but-plausible scenarios
- AWS Well-Architected / Prescriptive Guidance
- Microsoft Azure Well-Architected
- Google Cloud Architecture Center

Source URLs and version notes are maintained in `frameworks.json`.
