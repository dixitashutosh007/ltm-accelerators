import defaultKb from './knowledge-base.json' with { type: 'json' };

export interface SovereignIqInput {
  answers: Record<string, any>;
  session?: {
    clientName?: string;
    leadConsultant?: string;
    mode?: 'workshop' | 'flash';
    targetStateMode?: 'baseline' | 'target' | 'compare';
    anonymize?: boolean;
    isUnlocked?: boolean;
  };
}

export interface SovereignIqEvaluation {
  facts: Record<string, any>;
  inScopeRegimes: any[];
  /** 0–100 per pillar, or null when none of the pillar's questions is answered ("not assessed"). */
  pillarScores: {
    P1: number | null;
    P2: number | null;
    P3: number | null;
    P4: number | null;
    P5: number | null;
  };
  /** Whether each pillar has at least one answered question. Unassessed pillars are left out of maturity. */
  pillarAssessed: { P1: boolean; P2: boolean; P3: boolean; P4: boolean; P5: boolean };
  /** Questions answered out of the questions in the knowledge base. */
  completeness: { answered: number; total: number };
  /** True when fewer than half of the questions are answered. */
  lowConfidence: boolean;
  maturity: {
    /** Weighted over assessed pillars only; 0 when no pillar is assessed. */
    score: number;
    /** Not computed yet: peer percentiles need a sourced benchmark dataset (Phase 3). */
    percentile?: number;
    /** Maturity stage for the score, or null when no pillar is assessed. */
    stage: any;
  };
  fin: {
    turnover: number;
    /** True when Q1.3 is unanswered and the default turnover ($3B) is used. */
    turnoverAssumed: boolean;
    /** Largest single statutory maximum among in-scope regimes (0 when none is quantified). */
    statutoryCeiling: number;
    downtimeRisk24h: number;
    remediationEst: number;
    components: { law: string; amt: number }[];
  };
  heatmap: Record<string, string[]>;
  anomalies: any[];
  roadmap: any[];
  archetypes: any[];
  offerings: any[];
  probes: any[];
  timestamp: string;
}


// Currency conversion for statutory floors set in local currency. Fines are reported in USD (turnover is in USD).
// Indicative rates, reviewed with the claims register; change here only.
export const EUR_TO_USD = 1.08;
export const GBP_TO_USD = 1.27;
export const AUD_TO_USD = 0.65;
export const INR_TO_USD = 0.012;
export const SAR_TO_USD = 1 / 3.75; // SAR is pegged to USD at 3.75
/** Turnover used when Q1.3 is unanswered (flagged as turnoverAssumed). */
export const DEFAULT_TURNOVER_USD = 3000000000;

// Global reference holders for execution context
let QUESTIONS: any[] = defaultKb.questions;
let REGIMES: any[] = defaultKb.regimes;
let MATURITY_STAGES: any[] = defaultKb.maturityStages;
let PILLARS: any[] = defaultKb.pillars;

function computeFacts(answers: Record<string, any>) {
  var F = {};
  QUESTIONS.forEach(function(q: any) {
    var a = answers[q.id];
    if (a === undefined || a === null) return;
    if (q.type === "single" || q.type === "scen") {
      var opt = q.opts[a];
      if (opt && opt.fact) Object.assign(F, opt.fact);
    } else if (q.type === "multi") {
      if (Array.isArray(a)) {
        a.forEach(function(idx: any) {
          var opt = q.opts[idx];
          if (opt && opt.fact) Object.assign(F, opt.fact);
        });
      }
    }
  });
  return F;
}

function evaluateRegimes(facts: Record<string, any>) {
  var results: any[] = [];

  REGIMES.forEach(function(reg: any) {
    var inScope = false;
    var grade = "not_applicable";
    var rationale = "";

    // 1. EU & UK Regimes
    if (reg.id === "DORA") {
      // DORA Art. 2 applies to EU financial entities. A UK-only firm is not directly in scope (the UK has its own
      // operational resilience and critical third party regimes), so it is flagged as advisory only.
      if (facts.sector === "bfsi" && facts.geo_eu) {
        inScope = true; grade = "applies";
        rationale = "Directly applicable to regulated financial entities operating in the EU under DORA Art. 2.";
      } else if (facts.data_financial && facts.geo_eu) {
        inScope = true; grade = "likely_confirm";
        rationale = "Financial data processing in the EU indicates material likelihood of DORA in-scope financial services.";
      } else if (facts.sector === "bfsi" && facts.geo_uk) {
        inScope = true; grade = "advisory";
        rationale = "DORA applies to EU financial entities. A UK-only firm is not directly in scope; confirm whether any group entity is EU-authorised or provides ICT services to EU financial entities.";
      }
    } else if (reg.id === "NIS2") {
      if (facts.geo_eu && ["energy", "health", "public", "telco", "mfg"].includes(facts.sector)) {
        inScope = true; grade = "applies";
        rationale = "Enterprise falls under NIS2 Essential or Important entity sectors across critical infrastructure.";
      } else if (facts.geo_eu) {
        inScope = true; grade = "advisory";
        rationale = "Residual corporate cyber hygiene and digital supply chain rules may apply in specific EU Member States.";
      }
    } else if (reg.id === "EU_AI_ACT") {
      if (facts.geo_eu && facts.ai_high_risk) {
        inScope = true; grade = "applies";
        rationale = "High-risk AI systems in credit scoring, insurance risk, biometrics, or employment engage Annex III statutory duties.";
      } else if (facts.geo_eu && (facts.ai_operational || facts.ai_gpai_provider)) {
        inScope = true; grade = "likely_confirm";
        rationale = "Operational AI or GPAI deployment requires transparency, documentation, and copyright compliance under Chapter V.";
      }
    } else if (reg.id === "EU_DATA_ACT") {
      if (facts.geo_eu && (facts.uses_cloud || facts.uses_saas)) {
        inScope = true; grade = "applies";
        rationale = "Users and providers of cloud/SaaS data-processing services in the EU must meet switching and foreign-access protection rules.";
      }
    } else if (reg.id === "EU_GDPR") {
      if (facts.geo_eu) {
        inScope = true; grade = "applies";
        rationale = "Processing personal data with EU establishment or targeting EU data subjects engages GDPR and Chapter V transfer rules.";
      }
    } else if (reg.id === "UK_GDPR") {
      if (facts.geo_uk) {
        inScope = true; grade = "applies";
        rationale = "Processing personal data with UK establishment engages UK GDPR, DPA 2018, and Data (Use & Access) Act 2025 reforms.";
      }
    } else if (reg.id === "UK_OPRES") {
      if (facts.geo_uk && facts.sector === "bfsi") {
        inScope = true; grade = "applies";
        rationale = "FCA/PRA regulated firm subject to operational resilience rules, impact tolerances, and mapping (PS21/3, SS2/21).";
      }
    } else if (reg.id === "UK_CTP") {
      if (facts.geo_uk && (facts.uses_cloud || facts.uses_saas)) {
        inScope = true; grade = "advisory";
        rationale = "Dependency on designated UK Critical Third Parties engages HM Treasury oversight and statutory notification obligations.";
      }
    } else if (reg.id === "SECNUM_C5_EUCS") {
      if (facts.geo_eu && (facts.sector === "public" || facts.sector === "energy" || facts.data_national_sec)) {
        inScope = true; grade = "likely_confirm";
        rationale = "High-assurance public sector and critical infrastructure procurements mandate SecNumCloud, BSI C5, or EUCS High compliance.";
      }
    } else if (reg.id === "CRR_EBA") {
      if (facts.geo_eu && facts.sector === "bfsi") {
        inScope = true; grade = "applies";
        rationale = "Credit institutions outsourcing to cloud must maintain EBA Register of Outsourcing and prior regulatory notifications.";
      }

    // 2. Middle East (KSA, UAE, Qatar)
    } else if (reg.id === "KSA_PDPL") {
      if (facts.geo_ksa) {
        inScope = true; grade = "applies";
        rationale = "Processing personal data of KSA residents subject to KSA Personal Data Protection Law (PDPL) and SDAIA regulations.";
      }
    } else if (reg.id === "KSA_NCA") {
      if (facts.geo_ksa && (facts.sector === "public" || facts.sector === "energy" || facts.sector === "bfsi" || facts.sector === "telco")) {
        inScope = true; grade = "applies";
        rationale = "National Critical Infrastructure & government agencies subject to NCA Essential Cybersecurity Controls (ECC) and CSCC.";
      }
    } else if (reg.id === "KSA_SAMA_CITC") {
      // SAMA regulates financial institutions; holding financial data alone does not bring a firm into scope.
      if (facts.geo_ksa && facts.sector === "bfsi") {
        inScope = true; grade = "applies";
        rationale = "Saudi financial institutions must comply with SAMA Cybersecurity Framework and CITC Class A/B/C cloud restrictions.";
      }
    } else if (reg.id === "UAE_PDPL") {
      if (facts.geo_uae) {
        inScope = true; grade = "applies";
        rationale = "UAE Federal Decree-Law No. 45/2021 sets strict cross-border transfer adequacy and data subject protection obligations.";
      }
    } else if (reg.id === "UAE_DESC_CBUAE") {
      // CBUAE outsourcing rules cover licensed financial institutions; DESC standards cover Dubai government entities.
      // Holding financial data alone does not bring a firm into scope.
      if (facts.geo_uae && (facts.sector === "bfsi" || facts.sector === "public")) {
        inScope = true; grade = "applies";
        rationale = "Dubai Electronic Security Centre (DESC) standards and CBUAE outsourcing frameworks govern cloud and CII estates.";
      }
    } else if (reg.id === "QATAR_QCB_NCSA") {
      if (facts.geo_gcc) {
        inScope = true; grade = "likely_confirm";
        rationale = "GCC and Qatar financial and government bodies require in-country hosting under QCB and NCSA data classification.";
      }

    // 3. APAC (Singapore, Australia, India, HK, Japan)
    } else if (reg.id === "SG_MAS_TRM") {
      // MAS guidelines apply to MAS-regulated financial institutions, not to any firm holding financial data.
      if (facts.geo_sg && facts.sector === "bfsi") {
        inScope = true; grade = "applies";
        rationale = "Monetary Authority of Singapore (MAS) TRM guidelines enforce strict cloud risk management and 4-hour disaster recovery RTO.";
      }
    } else if (reg.id === "SG_PDPA_CSA") {
      if (facts.geo_sg) {
        inScope = true; grade = "applies";
        rationale = "Singapore Personal Data Protection Act (PDPA) transfer limitation obligations and CSA Critical Information Infrastructure rules.";
      }
    } else if (reg.id === "AU_APRA_CPS230") {
      // CPS 230 applies to APRA-regulated entities (banks, insurers, superannuation), not to any firm holding financial data.
      if (facts.geo_au && facts.sector === "bfsi") {
        inScope = true; grade = "applies";
        rationale = "APRA CPS 230 operational resilience standard mandates end-to-end material service provider monitoring and exit plans.";
      }
    } else if (reg.id === "AU_PRIVACY_SOCI") {
      if (facts.geo_au) {
        inScope = true; grade = "applies";
        rationale = "Australian Privacy Principles (APP 8) cross-border accountability and SOCI Act critical infrastructure risk registers.";
      }
    } else if (reg.id === "IN_DPDP_RBI") {
      if (facts.geo_in) {
        inScope = true; grade = "applies";
        rationale = "India DPDP Act 2023 transfer rules and mandatory RBI domestic data localization for payments and financial transactions.";
      }
    } else if (reg.id === "HK_HKMA_SPM") {
      if (facts.geo_jphk && (facts.sector === "bfsi" || facts.data_financial)) {
        inScope = true; grade = "likely_confirm";
        rationale = "HKMA Supervisory Policy Manual (OR-1 / TM-E-1) governs operational resilience and pre-implementation cloud notification.";
      }
    } else if (reg.id === "JP_APPI_ISMAP") {
      if (facts.geo_jphk) {
        inScope = true; grade = "likely_confirm";
        rationale = "Japan APPI cross-border transfer consent rules and ISMAP government cloud security certification benchmarks.";
      }

    // 4. Extraterritorial & Cross-Border Conflict
    } else if (reg.id === "US_CLOUD_ACT") {
      // Keyed to the use of a US-headquartered provider (Q4.1), not to cloud or SaaS use as such.
      if (facts.uses_us_hq) {
        inScope = true; grade = "advisory";
        rationale = "Reliance on US-headquartered tech providers engages extraterritorial subpoena exposure under 18 U.S.C. § 2713 (CLOUD Act).";
      }
    } else if (reg.id === "US_FISA_702") {
      if ((facts.geo_eu || facts.geo_uk) && facts.uses_us_hq) {
        inScope = true; grade = "needs_legal_review";
        rationale = "Schrems II Transfer Impact Assessment required to assess FISA §702 surveillance risks and verify supplementary technical measures.";
      }
    } else if (reg.id === "CHINA_PIPL") {
      if (facts.geo_jphk) {
        inScope = true; grade = "advisory";
        rationale = "Cross-border data flows touching mainland China subject to mandatory Cyberspace Administration of China (CAC) assessments.";
      }
    }

    if (inScope) {
      results.push({
        regime: reg,
        grade: grade,
        rationale: rationale,
        impact: reg.impact
      });
    }
  });

  return results;
}

// Scored questions per pillar. Each answer counts once: the option's own score from the knowledge base.
var PILLAR_QUESTIONS: Record<string, string[]> = {
  P1: ["Q3.2", "Q3.3"],
  P2: ["Q4.1", "Q4.2", "Q4.3"],
  P3: ["Q5.1", "Q5.2", "Q5.3"],
  P4: ["Q6.1", "Q6.2", "Q6.3"],
  P5: ["Q7.1", "Q7.2", "Q7.3"]
};
var PILLAR_IDS = ["P1", "P2", "P3", "P4", "P5"];

function isAnswered(a: any) {
  if (a === undefined || a === null) return false;
  if (Array.isArray(a)) return a.length > 0;
  return true;
}

function computeCompleteness(answers: any) {
  var answered = QUESTIONS.filter(function(q: any) { return isAnswered(answers[q.id]); }).length;
  return { answered: answered, total: QUESTIONS.length };
}

function computePillarScores(answers: any, facts: any) {
  var scores: any = { P1: null, P2: null, P3: null, P4: null, P5: null };
  var assessed: any = { P1: false, P2: false, P3: false, P4: false, P5: false };

  // Helper to extract score from question options
  function getScore(qid: any) {
    var a = answers[qid];
    if (a === undefined || a === null) return null;
    var q = QUESTIONS.find(function(item: any) { return item.id === qid; });
    if (!q || !q.opts || !q.opts[a]) return null;
    return typeof q.opts[a].score === "number" ? q.opts[a].score : null;
  }

  PILLAR_IDS.forEach(function(pid) {
    var list: number[] = PILLAR_QUESTIONS[pid].map(getScore).filter(function(s: any) { return s !== null; }) as number[];
    if (!list.length) return; // not assessed: no default score is invented
    assessed[pid] = true;
    // P2 interaction penalty: a US-headquartered provider (Q4.1) without HYOK (Q6.1). Applied only when Q6.1 is
    // answered, so a missing answer is not read as "no HYOK".
    if (pid === "P2" && facts.uses_us_hq && isAnswered(answers["Q6.1"]) && !facts.crypto_hyok) list.push(25);
    scores[pid] = Math.round(list.reduce(function(a, b) { return a + b; }, 0) / list.length);
  });
  // Holding national-security data (Q3.1) is scope and obligation, not maturity: it does not change P1.

  return { scores: scores, assessed: assessed };
}

export const MIN_PILLARS_FOR_STAGE = 3;

export function stageForScore(score: number, stages: any[] = MATURITY_STAGES) {
  for (var i = 0; i < stages.length; i++) {
    var s = stages[i];
    if (score >= s.band[0] && score <= s.band[1]) return s;
  }
  return stages[0];
}

function computeOverallMaturity(pillarScores: any, assessed: any) {
  // Weighted over assessed pillars only, with the weights renormalised.
  var weights: Record<string, number> = { P1: 0.25, P2: 0.25, P3: 0.15, P4: 0.20, P5: 0.15 };
  var total = 0, weight = 0;
  PILLAR_IDS.forEach(function(pid) {
    if (!assessed[pid]) return;
    total += pillarScores[pid] * weights[pid];
    weight += weights[pid];
  });
  if (weight === 0) return { score: 0, stage: null };
  var overall = Math.round(total / weight);
  // A maturity stage needs evidence across the estate: at least three of the five pillars assessed.
  var assessedCount = PILLAR_IDS.filter(function(pid) { return assessed[pid]; }).length;
  return { score: overall, stage: assessedCount >= MIN_PILLARS_FOR_STAGE ? stageForScore(overall) : null };
}

function calculateFinancialExposure(answers: any, inScopeRegimes: any, facts: any) {
  // Enterprise turnover sizing (USD). Unanswered Q1.3 keeps the default and is flagged.
  var turnover = DEFAULT_TURNOVER_USD;
  var turnoverAssumed = true;
  var revOpt = answers["Q1.3"];
  var qObj = QUESTIONS.find(function(q: any){ return q.id === "Q1.3"; });
  if (revOpt !== undefined && revOpt !== null && qObj && qObj.opts && qObj.opts[revOpt] && qObj.opts[revOpt].val) {
    turnover = qObj.opts[revOpt].val;
    turnoverAssumed = false;
  }

  // Statutory fines, all in USD. Floors set in local currency are converted with the constants above.
  var inScope = function(id: string) { return inScopeRegimes.some(function(r: any){ return r.regime.id === id; }); };
  var hasEUGDPR = inScope("EU_GDPR");
  var hasUKGDPR = inScope("UK_GDPR");
  var hasAIAct = inScope("EU_AI_ACT");
  var hasKSA = inScope("KSA_PDPL");
  var hasAU = inScope("AU_PRIVACY_SOCI");
  var hasIN = inScope("IN_DPDP_RBI");

  var fineComponents: { law: string; amt: number }[] = [];
  if (hasAIAct && facts.ai_high_risk) {
    // EU AI Act Art. 99(4): high-risk obligations up to EUR 15M or 3% of worldwide turnover, whichever is higher.
    // (The EUR 35M / 7% tier in Art. 99(3) applies only to prohibited practices under Art. 5.)
    fineComponents.push({ law: "EU AI Act Art. 99(4) (3% global turnover)", amt: Math.max(15000000 * EUR_TO_USD, turnover * 0.03) });
  }
  if (hasEUGDPR) {
    // GDPR Art. 83(5): up to EUR 20M or 4% of worldwide annual turnover, whichever is higher.
    fineComponents.push({ law: "EU GDPR Art. 83(5) (4% global turnover)", amt: Math.max(20000000 * EUR_TO_USD, turnover * 0.04) });
  }
  if (hasUKGDPR) {
    // UK GDPR Art. 83(5) / DPA 2018 s.157: up to GBP 17.5M or 4% of worldwide annual turnover, whichever is higher.
    fineComponents.push({ law: "UK GDPR Art. 83(5) (4% global turnover)", amt: Math.max(17500000 * GBP_TO_USD, turnover * 0.04) });
  }
  if (hasKSA) {
    // KSA PDPL Art. 35-36: fines up to SAR 5M (doubling on repeat offences is not modelled).
    fineComponents.push({ law: "KSA PDPL (Statutory max)", amt: 5000000 * SAR_TO_USD });
  }
  if (hasAU) {
    // Privacy Act 1988 s.13G as amended by the Privacy Legislation Amendment Act 2022: the greater of AUD 50M,
    // 3x the benefit obtained, or 30% of "adjusted turnover" (Australian turnover over the breach period).
    // Neither the benefit nor Australian turnover is captured, and global turnover would overstate it badly,
    // so only the AUD 50M figure is quantified.
    fineComponents.push({ law: "Privacy Act 1988 (as amended 2022) · AUD 50M figure; 30% of Australian adjusted turnover not quantified", amt: 50000000 * AUD_TO_USD });
  }
  if (hasIN) {
    // India DPDP Act 2023 Schedule: up to INR 250 crore per breach.
    fineComponents.push({ law: "India DPDP Act 2023 (INR 250 crore max)", amt: 2500000000 * INR_TO_USD });
  }
  // Largest single statutory maximum among in-scope regimes (0 when none is quantified). Never a sum.
  var maxSingleFine = 0;
  fineComponents.forEach(function(c: any) { maxSingleFine = Math.max(maxSingleFine, c.amt); });

  // Illustrative cost of a 24-hour outage: daily turnover x 1.5 (turnover-based heuristic, not a statutory figure).
  var hourlyDowntime = (turnover / (365 * 24)) * 1.5;
  var downtimeRisk24h = Math.round(hourlyDowntime * 24);

  // Remediation investment estimate: 12-week advisory & engineering sprint
  var remediationEst = Math.round(Math.min(2500000, Math.max(350000, turnover * 0.0004)));

  return {
    turnover: turnover,
    turnoverAssumed: turnoverAssumed,
    statutoryCeiling: maxSingleFine,
    downtimeRisk24h: downtimeRisk24h,
    remediationEst: remediationEst,
    components: fineComponents
  };
}

function generateStrategicHeatmap(inScopeRegimes: any, pillarScores: any) {
  // Classifies into 4x4 matrix:
  // Impact: 4 (Catastrophic), 3 (Major), 2 (Moderate), 1 (Minor)
  // Exposure: 4 (Critical Exposure), 3 (High Vulnerability), 2 (Managed), 1 (High Assurance)
  var cells: Record<string, any[]> = {
    "4-4": [], "4-3": [], "4-2": [], "4-1": [],
    "3-4": [], "3-3": [], "3-2": [], "3-1": [],
    "2-4": [], "2-3": [], "2-2": [], "2-1": [],
    "1-4": [], "1-3": [], "1-2": [], "1-1": []
  };

  inScopeRegimes.forEach(function(item: any) {
    var impact = item.regime.impact || 3;
    var exp = 2; // default managed
    // A pillar that is not assessed is not evidenced, so it is treated like a weak pillar (conservative).
    var low = function(v: any) { return v === null || v === undefined || v < 50; };

    if (item.grade === "applies" || item.grade === "needs_legal_review") {
      exp = low(pillarScores.P2) || low(pillarScores.P4) ? 4 : 3;
    } else if (item.grade === "likely_confirm") {
      exp = low(pillarScores.P1) ? 3 : 2;
    } else {
      exp = 1;
    }

    var key = impact + "-" + exp;
    var badgeClass = exp >= 4 ? "b-red" : (exp === 3 ? "b-amber" : (exp === 2 ? "b-blue" : "b-green"));
    if (cells[key]) {
      cells[key].push({
        id: item.regime.id,
        name: item.regime.short || item.regime.name,
        badgeClass: badgeClass,
        jurisdiction: item.regime.jurisdiction
      });
    }
  });

  return cells;
}

function generateArchetypes(answers: any) {
  return [
    {
      tag: "Archetype 01",
      name: "Commercial Public Cloud + HYOK",
      desc: "Standard hyperscaler commercial regions augmented with External Key Store (HYOK) and customer-held HSMs. Best cost/agility with moderate jurisdictional mitigation.",
      fit: "Recommended for commercial enterprises with high innovation velocity.",
      badge: "Commercial Agility",
      rec: false
    },
    {
      tag: "Archetype 02",
      name: "Certified Sovereign Cloud Enclave",
      desc: "AWS European Sovereign Cloud, Microsoft Cloud for Sovereignty, Google with T-Systems/Thales, or KSA/UAE domestic sovereign cloud. Complete operational & legal boundary.",
      fit: "Recommended for Regulated BFSI, Healthcare, and Government agencies.",
      badge: "High Assurance",
      rec: true
    },
    {
      tag: "Archetype 03",
      name: "Dedicated Sovereign Private Cloud",
      desc: "Modern on-premises private cloud (OpenShift, Nutanix, Azure Stack, Outposts) hosted in domestic colocation with 100% domestic personnel. High control with higher CapEx.",
      fit: "Recommended for Core Banking, Defense, and National Security SCADA.",
      badge: "Maximum Control",
      rec: false
    },
    {
      tag: "Archetype 04",
      name: "Air-Gapped / Disconnected Enclave",
      desc: "Fully air-gapped infrastructure with zero outbound internet connectivity, local identity management, and physical perimeter controls. The strongest available isolation from remote access.",
      fit: "Recommended exclusively for Classified Defense, Intelligence, and Critical Nuclear/Grid SCADA.",
      badge: "Air-Gapped",
      rec: false
    }
  ];
}

function generateLTMOfferings(inScopeRegimes: any, pillarScores: any) {
  return [
    {
      title: "DORA & APRA Operational Resilience Accelerator",
      desc: "Comprehensive readiness assessment, Register of Information assembly, Threat-Led Penetration Testing (TLPT) governance, and CTPP contract remediation.",
      meta: "LTM Infrastructure Tech Advisory · Pillar 03 & 04",
      duration: "6–8 Weeks Sprint"
    },
    {
      title: "Sovereign Cloud & HYOK Architecture Blueprint",
      desc: "Architectural design and deployment of External Key Management (EKM), Confidential Computing enclaves, and sovereign boundary segregation on AWS, Azure, and Google Cloud.",
      meta: "Cloud & Infrastructure Advisory · Architecture",
      duration: "8–12 Weeks Engagement"
    },
    {
      title: "Global Transfer Impact Assessment (TIA) Audit",
      desc: "Multi-jurisdiction legal/technical audit of cross-border data flows, US CLOUD Act exposure, and supplementary technical measures across Cloud and Enterprise SaaS.",
      meta: "Risk & Regulatory Compliance · Audit",
      duration: "4–6 Weeks Sprint"
    }
  ];
}

function analyzeEstateAnomalies(answers: any, facts: any) {
  var anomalies = [];

  // 1. The Residency Illusion
  if ((facts.hosting_domestic || facts.geo_eu || facts.geo_ksa || facts.geo_uae) && facts.uses_us_hq && !facts.crypto_hyok) {
    anomalies.push({
      id: "ANOM_RESIDENCY",
      severity: "critical",
      title: "The Residency Illusion",
      summary: "Domestic data localization claimed, but infrastructure hosted on a US-headquartered hyperscaler without Hold-Your-Own-Key (HYOK). Under the US CLOUD Act, the provider can be legally compelled to produce data regardless of physical region.",
      clarityQ: "Has your board formally assessed and accepted the residual jurisdictional exposure from hosting on a US-headquartered provider without HYOK?",
      options: [
        "No formal assessment — assumed region selection was sufficient",
        "Risk committee accepted residual risk with contractual protections",
        "HYOK / External Key Store deployment planned for next budget cycle",
        "Migration to sovereign cloud or certified sovereign enclave underway"
      ]
    });
  }

  // 2. AI Reclassification Risk
  if (facts.ai_high_risk || facts.ai_gpai_provider) {
    anomalies.push({
      id: "ANOM_AI_RECLASS",
      severity: "high",
      title: "AI Provider Reclassification",
      summary: "Enterprise integrating third-party GPAI models (OpenAI, Anthropic) into high-risk workflows. Under EU AI Act Art. 25, this can legally reclassify your organization as an AI Provider with full conformity obligations.",
      clarityQ: "Have you secured technical provenance files and training data summaries from your AI model vendors?",
      options: [
        "No provenance files secured — using commercial APIs under standard terms",
        "Impact assessments underway prior to production rollout",
        "Human-in-the-loop validation with automated model audit logging in place",
        "Transitioning to self-hosted open-weight models in sovereign enclaves"
      ]
    });
  }

  // 3. SaaS Sub-processor Blindspot
  if (facts.uses_saas && (facts.saas_standard || facts.saas_unmonitored || !facts.crypto_hyok)) {
    anomalies.push({
      id: "ANOM_SAAS_BLIND",
      severity: "high",
      title: "SaaS Sub-processor Blindspot",
      summary: "Core enterprise workflows rely on SaaS platforms (M365, Salesforce, ServiceNow) where the vendor manages encryption keys and global SRE teams operate outside your jurisdiction.",
      clarityQ: "Can you technically prevent disclosure if a foreign court issues a production order to your SaaS provider?",
      options: [
        "No technical prevention — relying on vendor pushback and notifications",
        "Evaluating SaaS Customer Key solutions (e.g. M365 Customer Key)",
        "Considering dedicated sovereign private cloud instances for sensitive data",
        "SaaS used only for non-regulated, non-confidential communications"
      ]
    });
  }

  // 4. CTPP Concentration Cliff
  if ((facts.sector === "bfsi" || facts.sector === "energy" || facts.data_financial) && facts.conc_critical && !facts.exit_under_3m) {
    anomalies.push({
      id: "ANOM_CTPP_CLIFF",
      severity: "critical",
      title: "CTPP Concentration Cliff",
      summary: "Under DORA Art. 28, APRA CPS 230, and MAS Outsourcing rules, financial institutions must maintain tested exit plans from critical ICT third parties. Severe single-vendor concentration detected with exit timeline exceeding 6-18 months.",
      clarityQ: "When was an actual operational exit drill or live cutover last simulated?",
      options: [
        "Never tested — exit strategy exists only as a policy document",
        "Desktop walkthrough within 12 months but no technical cutover tested",
        "DR tested within same hyperscaler but alternative provider migration untested",
        "Multi-cloud portability project budgeted to reduce dependency"
      ]
    });
  }

  // 5. Cross-Border Backup Replication Leak
  if (facts.hosting_domestic && (facts.dr_regional || facts.dr_cross_border)) {
    anomalies.push({
      id: "ANOM_DR_LEAK",
      severity: "medium",
      title: "Cross-Border Backup Replication Leak",
      summary: "Primary production data is localized domestically, but disaster recovery, snapshot archives, or database replication traverse national borders — representing a potential statutory breach in strict localization jurisdictions.",
      clarityQ: "Is secondary replication encrypted with independent domestic keys, or does it rely on provider-managed encryption across borders?",
      options: [
        "Provider-managed encryption — secondary region sits in foreign jurisdiction",
        "Legal counsel cleared cross-border replication under transfer mechanisms",
        "Re-architecting backup policies to force local secondary availability zones",
        "DR data fully pseudonymized/tokenized prior to cross-border replication"
      ]
    });
  }

  return anomalies;
}

function generateGapTailoredRoadmap(facts: any, anomalies: any, answers: any) {
  var aIds = anomalies.map(function(a: any) { return a.id; });
  var hasResidency   = aIds.indexOf("ANOM_RESIDENCY")  >= 0;
  var hasAiReclass   = aIds.indexOf("ANOM_AI_RECLASS") >= 0;
  var hasSaasBind    = aIds.indexOf("ANOM_SAAS_BLIND") >= 0;
  var hasCtpp        = aIds.indexOf("ANOM_CTPP_CLIFF") >= 0;
  var hasDrLeak      = aIds.indexOf("ANOM_DR_LEAK")    >= 0;

  var w1 = {
    wave: 1, name: "Wave 1: Immediate Triage & Legal Defensibility",
    horizon: "0 – 90 Days", badge: "Quick Wins",
    actions: [
      hasResidency  ? { owner: "Chief Legal Officer", title: "CLOUD Act Jurisdictional TIA", desc: "Execute formal Transfer Impact Assessments for all US-HQ hyperscalers to evaluate extraterritorial exposure.", deliverable: "Board-approved Transfer Impact Assessment (TIA) Dossier" } : null,
      hasAiReclass  ? { owner: "CISO", title: "AI Model Inventory & Risk Triage", desc: "Catalog all production AI/LLM APIs and isolate Annex III high-risk use cases under the EU AI Act.", deliverable: "Annex III High-Risk AI Conformity Technical File" } : null,
      hasSaasBind   ? { owner: "Head of Cloud", title: "SaaS Sub-processor Register", desc: "Map all enterprise SaaS platforms against encryption key custody and foreign administrative support chains.", deliverable: "Consolidated SaaS Sub-processor Registry & Access Policy" } : null,
      hasCtpp       ? { owner: "Compliance Lead", title: "DORA Register of Information Sprint", desc: "Complete ICT third-party contract inventory for all critical and important business functions.", deliverable: "Statutory DORA Article 28 Register of Information" } : null,
      hasDrLeak     ? { owner: "Head of Cloud", title: "DR Replication Flow Audit", desc: "Identify all cross-border database replication and backup archives traversing jurisdictional borders.", deliverable: "Disaster Recovery Cross-Border Transit & Encryption Map" } : null,
      { owner: "CISO", title: "Out-of-Band Hardware Telemetry Audit", desc: "Sever unencrypted vendor call-home telemetry on on-premise storage and server management controllers (iDRAC/iLO).", deliverable: "Air-gapped Out-of-Band Controller Policy & Verification" }
    ].filter(Boolean)
  };

  var w2 = {
    wave: 2, name: "Wave 2: Cryptographic & Contractual Boundary",
    horizon: "3 – 6 Months", badge: "Architectural Controls",
    actions: [
      hasResidency  ? { owner: "Head of Cloud", title: "Hold-Your-Own-Key (HYOK) Deployment", desc: "Integrate External Key Managers (HSM/EKM) to decouple encryption key custody from foreign hypervisors.", deliverable: "Production HYOK Architecture with Domestic Hardware HSMs" } : null,
      hasSaasBind   ? { owner: "CISO", title: "SaaS Tenant Encryption & Customer Lockbox", desc: "Deploy M365 Customer Key and Salesforce Shield Cache Key with Customer Lockbox approval enforcement.", deliverable: "Enforced Customer Lockbox Architecture on Critical SaaS Tenants" } : null,
      hasCtpp       ? { owner: "Enterprise Architect", title: "CTPP Exit Strategy Playbooks", desc: "Draft tested, step-by-step transition playbooks for each critical provider with simulated failover cutover.", deliverable: "Supervisory-tested Cloud Exit & Transition Playbooks" } : null,
      hasDrLeak     ? { owner: "Head of Cloud", title: "Domestic DR Re-architecture", desc: "Re-route all backup archives and replication to in-country secondary availability zones with local keys.", deliverable: "Localized Disaster Recovery Secondary Topology" } : null,
      { owner: "Chief Legal Officer", title: "Sovereign Entity Contract Novation", desc: "Novate cloud master service agreements to domestic operating entities subject to local courts.", deliverable: "Novated Local Cloud Entity Operating Contracts" }
    ].filter(Boolean)
  };

  var w3 = {
    wave: 3, name: "Wave 3: Architecture Segregation & Sovereign Enclaves",
    horizon: "6 – 12 Months", badge: "Core Estate Modernisation",
    actions: [
      hasResidency  ? { owner: "Head of Cloud", title: "Sovereign Cloud Migration", desc: "Migrate regulated core banking and health workloads to certified sovereign enclaves (e.g. AWS Sovereign, Delos, S3NS).", deliverable: "Certified Sovereign Enclave Production Deployment" } : null,
      hasAiReclass  ? { owner: "CISO", title: "Self-Hosted AI Enclave Deployment", desc: "Transition high-risk AI models to self-hosted open-weight architectures inside confidential virtual machines (AMD SEV-SNP).", deliverable: "Hardware-rooted Confidential Computing AI Cluster" } : null,
      hasCtpp       ? { owner: "Enterprise Architect", title: "Multi-Cloud Container Portability", desc: "Refactor critical services to Kubernetes container platforms to eliminate proprietary PaaS lock-in.", deliverable: "Tested Multi-Cloud Container Orchestration Layer" } : null,
      { owner: "Head of Cloud", title: "Confidential Computing for Data-in-Use", desc: "Deploy hardware-rooted confidential VMs for memory encryption during sensitive data processing.", deliverable: "Confidential VM Fleet for Regulated Analytics" }
    ].filter(Boolean)
  };

  var w4 = {
    wave: 4, name: "Wave 4: Target Operating Model & Continuous Assurance",
    horizon: "12 – 24 Months", badge: "Sovereign-by-Design",
    actions: [
      { owner: "Enterprise Architect", title: "Automated Sovereignty Policy Gates", desc: "Embed CSPM policy-as-code gates in CI/CD pipelines to block unauthorized cross-border deployments.", deliverable: "Automated CI/CD Sovereignty Guardrails & OPA Policies" },
      { owner: "Compliance Lead", title: "SecNumCloud / C5 / EUCS Certification", desc: "Obtain formal third-party regulatory assurance certifications for sovereign hosting environments.", deliverable: "Independent Sovereign Compliance Audit Certificate" },
      { owner: "CIO & Board", title: "Boardroom Sovereignty Governance Dashboard", desc: "Establish quarterly executive reporting on geopolitical risk, supply chain resilience, and CTPP health.", deliverable: "Quarterly Board Governance Risk Dashboard & Metric Pack" },
      { owner: "CISO", title: "Threat-Led Penetration Testing (TLPT)", desc: "Conduct annual regulatory adversary simulations including foreign subpoena compulsion and administrative lockout.", deliverable: "Supervisory TLPT / TIBER-EU Threat Simulation Report" }
    ]
  };

  return [w1, w2, w3, w4];
}


export function generateConsultingProbes(answers: any, facts: any, customKb?: any): any[] {
  const KB = customKb || defaultKb;
  const triggered: any[] = [];
  (KB.consultingProbes || []).forEach((probe: any) => {
    let tr = false;
    if (probe.id === 'P_RESIDENCY_ILLUSION') {
      tr = (facts.hosting_domestic || facts.geo_eu || facts.geo_ksa || facts.geo_uae) && facts.uses_us_hq && !facts.crypto_hyok;
    } else if (probe.id === 'P_SAAS_BLINDSPOT') {
      tr = facts.uses_saas && (facts.saas_standard || facts.saas_unmonitored || !facts.crypto_hyok);
    } else if (probe.id === 'P_ONPREM_BACKDOOR') {
      tr = facts.uses_onprem && facts.oob_connected;
    } else if (probe.id === 'P_CTPP_CLIFF') {
      tr = (facts.sector === 'bfsi' || facts.sector === 'energy' || facts.data_financial) && facts.conc_critical && !facts.exit_under_3m;
    } else if (probe.id === 'P_DR_LEAK') {
      tr = facts.hosting_domestic && (facts.dr_regional || facts.dr_cross_border);
    } else if (probe.id === 'P_AI_RECLASS') {
      tr = facts.ai_high_risk || facts.ai_gpai_provider;
    }
    if (tr) {
      triggered.push(probe);
    }
  });
  return triggered;
}

export function evaluateSovereignIq(
  input: SovereignIqInput,
  customKb?: any
): SovereignIqEvaluation {
  const KB = customKb || defaultKb;
  QUESTIONS = KB.questions || defaultKb.questions;
  REGIMES = KB.regimes || defaultKb.regimes;
  MATURITY_STAGES = KB.maturityStages || defaultKb.maturityStages;
  PILLARS = KB.pillars || defaultKb.pillars;

  const answers = input.answers || {};
  const facts = computeFacts(answers);
  const inScopeRegimes = evaluateRegimes(facts);
  const pillars = computePillarScores(answers, facts);
  const pillarScores = pillars.scores;
  const pillarAssessed = pillars.assessed;
  const completeness = computeCompleteness(answers);
  const lowConfidence = completeness.answered < completeness.total / 2;
  const maturity = computeOverallMaturity(pillarScores, pillarAssessed);
  const fin = calculateFinancialExposure(answers, inScopeRegimes, facts);
  const heatmap = generateStrategicHeatmap(inScopeRegimes, pillarScores);
  const anomalies = analyzeEstateAnomalies(answers, facts);
  const roadmap = generateGapTailoredRoadmap(facts, anomalies, answers);
  const archetypes = generateArchetypes(answers);
  const offerings = generateLTMOfferings(inScopeRegimes, pillarScores);
  const probes = generateConsultingProbes(answers, facts, KB);

  return {
    facts,
    inScopeRegimes,
    pillarScores,
    pillarAssessed,
    completeness,
    lowConfidence,
    maturity,
    fin,
    heatmap,
    anomalies,
    roadmap,
    archetypes,
    offerings,
    probes,
    timestamp: new Date().toISOString()
  };
}
