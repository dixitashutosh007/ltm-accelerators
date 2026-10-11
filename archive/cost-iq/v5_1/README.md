# Cost IQ v5.1 — Configuration-Driven Architecture

This branch contains the next architecture step for Cost IQ. The goal is to separate the stable assessment runtime from the editable methodology.

## Architecture

- `master/CostIQ_Master_v5_1.html` — browser-based methodology editor and validator
- `master/master-config.json` — canonical master model for the current vertical slice
- `schemas/master.schema.json` — configuration contract
- `config/current/config.json` — runtime configuration artifact
- `runtime/CostIQ.html` — runtime application (to be promoted from the v5 vertical slice during the next integration step)

## Governance flow

Edit in Master Studio → inspect dependencies → validate → build a release → review Git diff → approve/merge → runtime refreshes to the approved configuration.

JSON is treated as machine-readable configuration. Consultants should use the Master Studio rather than editing JSON in a text editor.

## Current scope

The repository slice demonstrates the architecture with CORE-12, CORE-24 and CORE-44 plus their scoring, findings, recommendations and dependencies. A local build package has also been prepared with the full 45 core + 60 adaptive question architecture for the next migration step.

## Important

The standalone HTML does not silently commit to Git. Permanent methodology changes should be reviewed and committed through the repository workflow. Future work can add authenticated Git/API integration or a self-hosted configuration service.
