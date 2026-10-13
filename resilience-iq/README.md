# Resilience IQ — Phase 1 Knowledge Foundation

Resilience IQ is the Enterprise Resilience & Continuity Advisory Suite for CIO/CTO offices.

## Product intent

Assess an enterprise's ability to sustain critical business services through disruption; identify resilience gaps; recommend BCP, DR, cyber-recovery, operational-resilience and third-party-resilience patterns; map the selected strategy to on-premises, AWS, Azure and GCP implementation options; and produce a target-state blueprint and roadmap.

## Knowledge the engine reads (`knowledge/`)

- `question-bank.json` — executive and dynamic advisory questions
- `decision-tree.json` — assessment branching and evidence triggers
- `scoring-model.json` — domain weights, question scoring and advisory adjustments (LTM heuristics, not a benchmark)
- `patterns.json` — resilience pattern library
- `implementation-mappings.json` — AWS/Azure/GCP/on-prem implementation mappings (indicative; SME review per engagement)
- `blueprint-engine.json` — target-state, gap-analysis and roadmap generation logic
- `executive-report.json` — executive report structure
- `assessment-persistence.json` — stored assessment contract (read by the persistence validation and tests)

## Design references (`design/`)

The engine does not read these. They record the intended model and are inputs to the practice-lead review (roadmap R9); anything adopted moves into `knowledge/` together with the engine change and tests.

- `recommendation-model.json` — intended recommendation pipeline
- `decision-matrix.json` — intended strategy ladder, shortlist and ranking rules
- `assessment-model.json` — assessment domains, evidence model and question taxonomy
- `frameworks.json` — framework and standards catalogue
- `blueprints.json` — blueprint catalogue

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


## Question Bank Studio Contract

The question bank is the contract between assessment content and the renderer. Each question can define its interaction through `ui.interaction`, while scoring, evidence and decision logic remain separate concerns. The planned Question Bank Studio will support draft → validate → publish → deprecate governance without changing runtime code.

Required editor fields: id, domain, taxonomy, text, type, options, required, evidence, ui, scoring, branching, framework mappings, version and status.

Supported interaction patterns include single-select, multi-select, slider choice, matrix, ranking, scenario, numeric, text, yes/no and evidence-select.
