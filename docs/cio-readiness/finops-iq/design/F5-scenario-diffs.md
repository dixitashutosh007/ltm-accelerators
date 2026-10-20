# FinOps IQ v3: F5 reference scenarios RS6 to RS9 against the engine

**Date:** 20 Oct 2026. **Phase:** F5 (M1 of the execution sequence), item 4. **Author:** `finops-cost-lead` (AI practice-lead agent; advises, does not sign off). **Compared:** the v3 engine 3.3.0 with value model 1.1.0 (`packages/engine-core/src/accelerators/finops-iq/v3/`, unchanged in M1) against four new scenarios appended to [`reference-scenarios.json`](reference-scenarios.json). RS1 to RS5 are unchanged (checked against `HEAD` field by field).

The review that uses these results is [F5-review.md](F5-review.md).

## Order of work (expectations first)

1. **Sources.** I picked four published case studies that cover gaps RS1 to RS5 leave, read each one directly on 20 Oct 2026, and used each for the estate's **shape** only (table below).
2. **Expectations by hand.** I wrote the expected outcomes by applying DESIGN.md sections 3, 5, 9 and 10, the F3 and F4 amendments recorded there (10.15) and the F2 registries. The money figures came from a throwaway calculation sheet that does not import or call the engine.
3. **Frozen.** I appended the records to `reference-scenarios.json` at **2026-10-20T04:02:45Z**. Each record carries `expectationsWritten.writtenAt` with that time and `beforeEngineRun: true`, and I kept a copy outside the repository.
4. **Engine run.** I first ran the engine on RS6 to RS9 at **2026-10-20T04:03:29Z**, after step 3. No expectation was edited after the run. Every difference below is recorded rather than corrected.

## Scenarios and the gaps they cover

| ID | Shape from (status, checked 20 Oct 2026) | Mode, currency, tier | What it tests that RS1 to RS5 do not |
|---|---|---|---|
| RS6 | Google Cloud Blog, DZ BANK: Cloud Run-first, GKE for a nightly risk batch, legacy on-premises estate (V) | Workshop, EUR, Tier 3 | A Google Cloud-led **workshop**: resource CUD 55%, Spot 91%, LEV-01 positive on Google Cloud. Hybrid (UN-03 core, UN-02, Sustainability). Non-deduplicated Recommender evidence |
| RS7 | FinOps Foundation session listing, Gerdau: multi-cloud and SaaS allocation, OpenShift, Databricks, unit economics (P: listing read, video not watched) | Executive, **BRL**, Tier 3 | A non-EU, non-USD currency. Three providers, one with no sourced maximum (OCI). **Kubernetes in executive mode.** Seven banded inputs with the upper case capped. The "material" need band |
| RS8 | AWS case study, Forethought: GPU inference on SageMaker multi-model and serverless endpoints, three-person cloud team (V) | Workshop, USD, Tier 2 | An **AI/GPU estate** where GPU spend is most of compute and sits outside Kubernetes. LEV-10 dominant. A lever **not worth pursuing** (M1 rule). LEV-01 at zero with DECISION-02 |
| RS9 | AWS case study, SmartNews: EKS with Karpenter, 70/30 Spot mix, Graviton, Bedrock (V) | Workshop, **JPY**, Tier 2 | **APAC** with large nominal amounts. Usage Optimization at target, so levers carry **their own findings**. A mature Spot practice. AI API spend below the 5% materiality threshold. The **workshop LEV-04 rule** when VB-03's scheduled share is unknown although OP-06 is answered |

No outcome figure from a case study is used as an input, benchmark or prediction. The case-study figures not used are: DZ BANK 90%; Forethought "up to 66%" and "up to 80%"; SmartNews 50% (Spot) and 15% (Graviton). Each record says so in `sources[].usedFor`.

## Results

### What matches exactly

**All four scenarios match on:**
- tier and points;
- every capability rating, target and gap, including:
  - the one-level depth rule (RS6 Allocation and Usage, RS8 Rate and Unit Economics, RS9 Usage);
  - "assessed in the workshop" in RS7;
- the headline and its statement;
- for every top finding: ID, type, current level, target, gap, severity and severity trace, owner role and wave;
- the order of the top findings.

**Scenario by scenario:**
- **RS6.** The finding count is 14, as written.
- **RS7.** The finding count is 6, as written. The need verdict matches: base 33.3, modifiers Tier 3 +20 and value ≥ 5% +10, index 63.3, band `material`, confidence Medium. So does the Kubernetes scope confirmation (`F-FIN-SCOPE-KUBERNETES_SPEND`, Medium, wave 1).
- **RS8.** The finding count is 14, as written. Two new paths behave as expected:
  - DECISION-02 is raised;
  - LEV-02 is excluded as not worth pursuing. The engine's marginal 3-year net is −USD 15,352; my sheet gave −15,522.
- **RS9.**
  - LEV-07 and LEV-02 lever findings are raised on their own, at High and Medium.
  - LEV-04 is not quantified, with a Medium scope confirmation.
  - LEV-01 uses the whole non-production share as `n_u`.
  - The FinOps team cost is JPY 16.8M.

**Money.** Every written figure is within 0.02% of the engine, in each case and for each lever:
- gross run-rate, gross year 1, % of P and P;
- one-off cost, run cost, net year 1, net run-rate and net 3-year.

| Scenario | Gross run-rate, written / engine (C / E / U) | % of P (E) | Cap |
|---|---|---|---|
| RS6 (EUR) | 1.386 / 1.387 · 2.707 / 2.707 · 5.154 / 5.155 M | 11.3 | not binding |
| RS7 (BRL) | 0.665 / 0.665 · 7.202 / 7.202 · 30.450 / 30.450 M | 8.5 | upper capped from 36.41 M at 29% of BRL 105 M |
| RS8 (USD) | 0.421 / 0.421 · 0.826 / 0.826 · 1.218 / 1.218 M | 19.7 | upper capped from 1.59 M |
| RS9 (JPY) | 111.0 / 111.0 · 218.3 / 218.3 · 421.4 / 421.4 M | 9.1 | not binding |

The inflation guard now runs over the nine scenarios plus the 1,000 random questionnaires per mode. It passes for RS6 to RS9: per-lever caps, published maxima, the 29% cap, case ordering, year-1 ≤ run-rate, net ≤ gross, no lever without its base, and blank facts and answers never raising value.

### Differences and which side is wrong

| # | Scenario | Written | Engine | Wrong side | Reasoning |
|---|---|---|---|---|---|
| X1 | RS8 | LEV-02 (not worth pursuing) listed with three case figures (30k / 60k / 120k) | LEV-02 has no `cases`. It is shown in `value.levers[LEV-02].exclusion`: expected run-rate 60,000, one-off 90,000, marginal 3-year net −15,352. It is out of the headline (`inHeadline: false`) | **Expectation** (format) | DESIGN 10.15 says a lever not worth pursuing is "shown ... with its figures". The engine shows the figure that decides the exclusion (expected) with its effort and marginal net, and leaves it out of the totals. That is enough for a CFO. Conservative and upper figures for a lever that is not pursued would only add noise. The headline totals, recomputed without LEV-02 (LEV-06 on the larger base left), match my figures exactly, which confirms the rule |
| X2 | RS7 | Need band label "Material exposure: act this year" | The same | **Neither** (test harness) | The scenario test hard-codes the one band RS1 and RS5 use (`RECORDED.bandLabel.from = 'Establish foundations now'`, `to = 'Targeted improvements needed now'`, the Q14 rewording). Any scenario in another band fails that assertion, although engine and expectation agree |
| X3 | RS9 | 13 findings; no GPU confirmation, because the estate has AI APIs (Bedrock) but no GPU or model-serving scope | 15 findings: `F-FIN-SCOPE-GPU_SPEND` and `F-FIN-SCOPE-GPU_UTILISATION` (both Low, wave 1, lever LEV-10). Both ask the client to "Confirm annual GPU and model-serving spend (VB-07)" | **Engine, by design (DESIGN 4.4 is wrong)** | DESIGN 4.4 switches LEV-10 and VB-07 on for `ai_api` **or** `ai_platform_gpu`. LEV-10's base is idle endpoints plus GPU spend (10.2), which an API-only estate does not have. Token spend has no v1 lever (RS3 already says so). The CIO receives two findings asking for GPU figures they do not have. **Recommended fix** (review M5): LEV-10 and VB-07 are switched on by `ai_platform_gpu` only, and `ai_api` keeps OP-12 and QV-07. Default: adopt. RS9 then gives 13 findings, as written |
| X4 | RS6 | Hypothesis explanations `estimate_at_or_below_model`, `levers_not_quantified` | `estimate_at_or_below_model` only | **Expectation** (minor) | CLM-FIN-168 adds `levers_not_quantified` only when the client's estimate is above the model's expected case. Here the estimate (5-9%, EUR 1.2-2.2M) is below it (EUR 2.71M). Not asserted by any test |
| X5 | RS6 to RS9 | Tier traces in prose (for example "1 provider -> 0") | Rule IDs, zero-point lines omitted (for example "spend about USD 69.1M -> 3", "kubernetes_material -> +1") | Wording only | Same points. RS6 uses the data centre band midpoint (EUR 40M), as written |
| X6 | RS6 | LEV-04 at 0.702 (the registry's rounded maximum) | 0.70238 (1 − 50/168) | **Expectation** (rounding) | 0.05% on LEV-04; inside the 1% tolerance. `levers.json` stores 0.702 while the engine computes the formula; harmless, but the register could store the formula's value |

**Engine bugs found:** none in the code. Every engine output follows the written rules. X3 is a design rule, applied as written, that I recommend changing. Three further design issues show up only through these scenarios and probes; the review covers them:
- **RS7: executive Kubernetes leaves LEV-04 unreachable.** The scope confirmation points to VB-06, which the executive mode does not ask (review H4).
- **RS7: the tier spend includes the SC-04 Kubernetes row.** The row is part of the provider bills, so it is counted twice (review M1).
- **RS9: the workshop LEV-04 rule** (review section 4).

### Test results with RS6 to RS9 added (tests not edited)

`npx vitest run packages/engine-core/test/finops-iq-v3` gives **191 of 198 passing, 7 failing** on `e129980` plus RS6 to RS9. On the current working tree it gives 198 of 205: the concurrent M3 work adds two test files, and the same 7 fail. Each failure is explained, and none is a regression in RS1 to RS5:

| Failing test | Cause | Recommended handling (owner) |
|---|---|---|
| `finops-iq-v3-value.test.ts` › "reference scenarios against the ranges written in F1" › RS8 | X1: the test reads `l.cases` for every lever the scenario lists, and LEV-02 is in `exclusion` instead | Add RS8 to `VALUE_DIFFS` with `levers: ['LEV-02']` (X1), or teach the test to read `exclusion.expectedRunRate` for levers with `inHeadline: false` |
| `finops-iq-v3.test.ts` › "reference scenarios against their written expectations" › RS7 › need verdict | X2: hard-coded band label | Compare `bandLabel` with the register label for the written `band`, and keep the Q14 mapping for the foundations band only |
| `finops-iq-v3.test.ts` › … › RS9 › findings match | X3: two GPU confirmations | Fix M5 in the engine (recommended). Until then, `RECORDED.extra.RS9 = 2` |
| `finops-iq-v3.test.ts` › "golden outputs (approved)" › RS6, RS7, RS8, RS9 (4 tests) | No approved golden exists for the new keys | After the owner approves these results, regenerate with `UPDATE_GOLDEN=1` and review the four new entries. RS9's entry changes again when M5 lands |

Also, the test title "accepts the five reference scenarios" and the inflation-guard title ("5 reference scenarios") now cover nine. The titles are stale, not wrong.

## Not differences, but worth knowing

- **RS7's range is the widest in the set:** 1.0% / 8.5% / 29.0% of P. Seven banded executive inputs drive it, and the 29% cap binds on the upper case. This is by design (ASM-FIN-042). F7 should lead with the expected case and show the band corners in the appendix. A CFO will otherwise read "up to BRL 30M".
- **RS8's year-1 net is negative in the conservative and expected cases** (−USD 139k and −USD 35k). The estate is small, one-off effort is USD 180k, and every lever starts in month 3. This is correct and should be shown as is.
- **RS9's workshop LEV-04.** OP-06 is answered (Walk), but the measured scheduled share is "don't know". So LEV-04 is not quantified, and LEV-01 removes all non-production from the steady pool (`n_u` = 15%).
  - Probe: applying the executive mapping (ASM-FIN-052, Walk = 0.5) in the workshop would add LEV-04 at JPY 10.0M expected. It would also raise LEV-01 from JPY 19.3M to 57.9M, because `n_u` halves.
  - The total would rise by 22%, mostly through LEV-01, not LEV-04.
  - The review's recommendation on this rule is in F5-review.md section 4.
- **RS7's OCI spend** counts in P and so in the cap, but gets no LEV-01 value: no OCI maximum is registered (CLM-FIN-069). The value block says so.

---

## After the owner's decisions D-A to D-H (20 Oct 2026)

The owner accepted every recommended default in [F5-review.md](F5-review.md) section 8. Engine 3.4.0, value model 1.2.0, question set 3.2.0, lever library 1.2.0, value rules 1.2.0, threshold register 1.1.0.

**Golden outputs** (`packages/engine-core/test/golden/finops-iq-v3.json`, regenerated with `UPDATE_GOLDEN=1`). Every change, and why:

| Case | Change | Cause |
|---|---|---|
| RS1 | Tier points 4 → 5 (still Tier 2); trace "spend unknown (data_centre) -> 3, assumed until confirmed"; need confidence Medium → Low | D-A: the data centre row is "don't know", so spend counts at the top band until confirmed |
| RS2 | Trace wording only: "spend unknown (licensing) -> 3, assumed until confirmed" (already at the top band: same points and tier) | D-A |
| RS3, RS4, RS5 | None | — |
| RS6 to RS9 | New goldens, approved under D-F | RS7: the Kubernetes confirmation is gone and LEV-04 is quantified from SC-04's Kubernetes row (D-D, H4). RS9: 13 findings as written, with no GPU confirmations (D-E fixes X3) |
| unanswered-executive | Need 33.3 → 43.3 (value modifier counted as assumed, no longer pending); Usage Optimization and Rate Optimization Medium → High with trace `value_unconfirmed`, so they move up the top findings | D-B: the blank value bases leave LEV-01 and LEV-04 open |
| unanswered-workshop, all-run-workshop | None | — |

**Recorded differences in the scenario tests** (`finops-iq-v3.test.ts` › `RECORDED`, `finops-iq-v3-value.test.ts` › `VALUE_DIFFS`):
- RS1: tier points 5 and confidence Low (D-A).
- RS7: `F-FIN-SCOPE-KUBERNETES_SPEND` no longer raised; LEV-01 and LEV-04 values and totals differ from the figures written before D-D, because LEV-04 is now quantified and LEV-01's base changes with it.
- RS8: LEV-02 compared through its exclusion figure (X1).
- Band labels: the Q14 rewording applies to the foundations band only; other bands are compared with the written label (X2).
