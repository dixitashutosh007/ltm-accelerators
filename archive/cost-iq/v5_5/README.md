# Cost IQ v5.5 — Methodology Governance

Owner: Infrastructure Technology Advisory
Approval model: single methodology approver
Git target: `chatGPT-branch`

Workflow: edit canonical methodology → inspect dependencies/impact → validate → approve → build release → review and commit in Git.

A change-set workflow is intentionally not required at this stage. The Master Configuration Studio is the methodology editor; generated JSON files are release artifacts consumed by the runtime.

This directory is the Git governance anchor for the local v5.5 package. The full working package is maintained as a local build until the next stabilization checkpoint.
