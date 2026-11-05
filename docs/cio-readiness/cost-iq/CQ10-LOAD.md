# Cost IQ load check (CQ10)

Run 2026-11-05, in process on the development machine (compute only: no network, no database, no Lambda cold start).

| Step | Median | 95th percentile | Slowest |
|---|---|---|---|
| Score one fully answered assessment (300 runs, 15 inputs) | 0.0 ms | 0.1 ms | 2.0 ms |
| (body 239 KB, status 200) | | | |
| Scoring endpoint at the body limit (50 runs) | 0.3 ms | 0.4 ms | 1.1 ms |
| Build, check and render the consultant PDF (10 cases) | 287.1 ms | 443.6 ms | 443.6 ms |

Report PDF size: 144 to 259 KB. Process memory after rendering: 440 MB (the report Lambda has 1,024 MB and a 30 s limit; scoring keeps the Amplify defaults of 3 s and 512 MB).
