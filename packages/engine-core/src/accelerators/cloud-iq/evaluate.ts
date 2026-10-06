import defaultKb from './knowledge-base.json' with { type: 'json' };

export interface CloudIqInput {
  answers: Record<string, any>;
  session?: {
    clientName?: string;
    consultantLead?: string;
    engagementDate?: string;
    targetHorizon?: string;
    mode?: 'workshop' | 'flash';
    anonymize?: boolean;
  };
}

export interface CloudIqEvaluation {
  trackCode: 'A' | 'B' | 'Hybrid';
  trackName: string;
  isHybrid: boolean;
  overall: number;
  band: string;
  dimScores: Record<string, number>;
  topObj: string;
  topDim: string;
  sovFlag: boolean;
  secnumFlag: boolean;
  aiFlag: boolean;
  vmwareRisk: boolean;
  leaseCliff: boolean;
  totalCloudSpend: number;
  totalLeakage: number;
  leakLow: number;
  leakHigh: number;
  decomp: {
    compute: number;
    commit: number;
    storage: number;
    licensing: number;
  };
  urgencyMap: Record<string, number>;
  movesPhase1: Array<{ code: string; size: string; title: string; desc: string; impact: string }>;
  movesPhase2: Array<{ code: string; size: string; title: string; desc: string; impact: string }>;
  movesPhase3: Array<{ code: string; size: string; title: string; desc: string; impact: string }>;
  movesPhase4: Array<{ code: string; size: string; title: string; desc: string; impact: string }>;
  offers: any[];
  peer: number;
  peerDelta: number;
  industryKey: string;
  probes: Array<{
    id: string;
    badge: string;
    badgeClass: string;
    q: string;
    options: string[];
    subjectivePrompt: string;
  }>;
  timestamp: string;
}

export function scoreBand(score: number): string {
  if (score < 2.0) return 'Nascent';
  if (score < 2.8) return 'Emerging';
  if (score < 3.8) return 'Established';
  if (score < 4.5) return 'Advanced';
  return 'Leading';
}

export function generateCloudIqProbes(
  A: Record<string, any>,
  R: Partial<CloudIqEvaluation>
) {
  const probes: Array<{
    id: string;
    badge: string;
    badgeClass: string;
    q: string;
    options: string[];
    subjectivePrompt: string;
  }> = [];

  // Probe 1: FinOps & Commitment Anomaly
  const spendVal = R.totalCloudSpend || 12000000;
  const isHighSpendLowCommit = spendVal >= 5000000 && (A['Q0.9'] === 0 || A['Q0.9'] === 1);
  const isFinOpsTopObj = R.topObj && R.topObj.toLowerCase().includes('cost');
  if (isHighSpendLowCommit || (isFinOpsTopObj && spendVal >= 2000000)) {
    probes.push({
      id: 'P_FINOPS',
      badge: 'Cost & FinOps Anomaly',
      badgeClass: 'red',
      q: `You reported ~$${(spendVal / 1000000).toFixed(1)}M/yr in public cloud spend with pricing commitment coverage under 40%. Who currently approves on-demand cloud budget overruns, and do engineering squads have unit-cost visibility?`,
      options: [
        'No formal approval; overages absorbed into central IT budget with zero squad visibility',
        'Central FinOps/Procurement reviews monthly retroactively; squads lack unit cost KPIs',
        'Automated alerts trigger when squads exceed forecast, but no hard enforcement',
        'Formal exception approvals required for >10% variance with squad-level chargeback'
      ],
      subjectivePrompt: 'Consultant / Client notes on FinOps governance gaps, untagged workloads, or budget variance approvals...'
    });
  }

  // Probe 2: Data Centre Lease Expiry & Colocation Cliff
  if (R.leaseCliff || [2, 3, 4].includes(A['Q0.12'])) {
    probes.push({
      id: 'P_DC_EXIT',
      badge: 'Impending DC Lease Deadline',
      badgeClass: 'red',
      q: 'Your on-premises hardware or facility lease expires within 12–24 months. What is the contractual notice period required to terminate your colocation lease, and what are the penalty escalations if migration stalls?',
      options: [
        'Strict 6-month notice required; missing deadline triggers automatic 12–24 month commercial lease extension penalty',
        'Rolling quarterly lease with 20–30% monthly price penalty surcharge',
        'Owned facility / flexible colocation with no hard financial penalty, but aging hardware failure risk',
        'Contract terms currently under legal review / unknown to infrastructure team'
      ],
      subjectivePrompt: 'Facility site names, lease termination dates, or colocation provider notice requirements...'
    });
  }

  // Probe 3: VMware Broadcom Renewal Defense
  if (R.vmwareRisk || A['Q0.11'] === 2) {
    probes.push({
      id: 'P_VMWARE',
      badge: 'VMware Renewal Price Shock',
      badgeClass: 'amber',
      q: 'VMware Broadcom subscription pricing shifts are increasing on-premise run-rates by 2x to 4x. What percentage of your on-premises virtualized workloads can be rapidly containerized vs. migrated to native cloud VMs?',
      options: [
        '<10% container-ready; over 90% require full VM rehosting or bare-metal hypervisor alternatives (Nutanix/KVM/OpenShift)',
        '25–50% can be containerized within 6 months; remaining legacy apps require temporary cloud IaaS hosting',
        '>50% can be refactored or decommissioned before the contract renewal window',
        'No current mitigation plan; awaiting Broadcom enterprise agreement renewal proposal'
      ],
      subjectivePrompt: 'Total socket / core count, ESXi cluster versions, or contract renewal expiration month...'
    });
  }

  // Probe 4: Digital Sovereignty & SecNumCloud / DORA Cryptographic Isolation
  const q03Arr = Array.isArray(A['Q0.3']) ? A['Q0.3'] : (A['Q0.3'] !== undefined && A['Q0.3'] !== null ? [A['Q0.3']] : []);
  if (R.secnumFlag || R.sovFlag || q03Arr.some((x: number) => [0, 1, 7, 8, 9].includes(x))) {
    probes.push({
      id: 'P_SOVEREIGNTY',
      badge: 'SecNumCloud & DORA Key Governance',
      badgeClass: 'blue',
      q: 'You indicated strict sovereignty (SecNumCloud / DORA / Residency). Where are your master cryptographic keys (HSMs) stored, and could foreign cloud provider personnel access unencrypted tenant data under extraterritorial subpoenas (e.g. US CLOUD Act)?',
      options: [
        'Keys stored in cloud-native KMS with provider access (potential CLOUD Act exposure)',
        'Dedicated on-premises or European third-party HSM (BYOK/HYOK) with tenant-isolated control',
        'Currently evaluating sovereign hyperscale partnerships (e.g., S3NS, Bleu, OVHcloud SecNumCloud)',
        'No formal sovereignty architecture defined; compliance review pending'
      ],
      subjectivePrompt: 'Target regulator audit deadlines, specific data classifications, or French/EU client sovereign mandates...'
    });
  }

  // Probe 5: Multi-Cloud Topology & Egress Friction
  if ((A['Q0.7'] || []).length >= 2) {
    probes.push({
      id: 'P_MULTICLOUD',
      badge: 'Multi-Cloud Interconnect & Egress',
      badgeClass: 'amber',
      q: 'You operate across multiple public clouds. What is your primary cross-cloud data replication pattern, and do you experience significant network egress costs or latency friction between providers?',
      options: [
        'Siloed workloads with minimal cross-cloud data transfer; each cloud hosts independent domains',
        'Active cross-cloud replication with high monthly egress fees ($20K–$100K+/mo) and transit gateway complexity',
        'Direct dedicated interconnection fabric (e.g. Equinix Cloud Exchange / Megaport) with optimized latency',
        'Unplanned multi-cloud sprawl resulting from acquisitions or disparate shadow IT initiatives'
      ],
      subjectivePrompt: 'Monthly cross-cloud egress estimates, interconnected databases, or latency-sensitive workloads...'
    });
  }

  // Probe 6: Landing Zone & Infrastructure as Code Drift
  if (R.dimScores && (R.dimScores['D2'] < 3.0 || R.dimScores['D5'] < 3.0)) {
    probes.push({
      id: 'P_LANDING_ZONE',
      badge: 'Platform Engineering & Drift',
      badgeClass: 'amber',
      q: 'How are new cloud accounts, network VPCs, and IAM policies provisioned for application teams today?',
      options: [
        'Manual service desk tickets and console clicks; lead time is 2 to 6+ weeks per environment',
        'Semi-automated scripts and fragmented Terraform templates maintained independently by individual teams',
        'Centralized Infrastructure as Code (IaC) repository with code review, but lacking automated compliance guardrails',
        'Fully automated Internal Developer Platform (IDP) with self-service golden paths and policy-as-code'
      ],
      subjectivePrompt: 'Current average provisioning lead time or security review bottlenecks...'
    });
  }

  // Probe 7: Subjective CIO Executive Mandate
  probes.push({
    id: 'P_CIO_MANDATE',
    badge: 'Executive Leadership Mandate',
    badgeClass: 'blue',
    q: 'What is the single most critical infrastructure or cloud milestone the CIO/CTO must deliver to the Board or CEO in the next 6 to 12 months?',
    options: [
      'Decommission aging data centre facility and eliminate recurring colocation lease overhead',
      'Cut public cloud monthly burn rate by 20–30% to hit enterprise EBITDA targets',
      'Pass critical regulatory / sovereignty audit (DORA, SecNumCloud, PCI-DSS) with zero non-conformances',
      'Stand up scalable enterprise platform for AI model training and workload acceleration'
    ],
    subjectivePrompt: 'Describe any specific Board-level commitments, executive deadlines, or confidential strategic goals...'
  });

  // Probe 8: Delivery Capacity & Operating Model
  probes.push({
    id: 'P_DELIVERY_MODEL',
    badge: 'Engineering Capacity & Execution Model',
    badgeClass: 'amber',
    q: 'Does your internal engineering organization have the bandwidth and specialized cloud skills (Kubernetes, FinOps, Terraform) to execute modernization in-house, or will an external migration factory partner be required?',
    options: [
      'Internal team is at 100% capacity on business BAU; external turnkey migration factory is mandatory',
      'Internal architects can lead design, but require external engineering augmentation for execution sprints',
      'Internal team is fully staffed and capable, requiring only strategic advisory and architectural review',
      'Skills gap exists across cloud-native tooling; formal upskilling and operating model transformation required'
    ],
    subjectivePrompt: 'Internal engineering headcounts, skill gaps, or preferred consulting engagement model...'
  });

  return probes;
}

export function evaluateCloudIq(
  input: CloudIqInput,
  customKb?: any
): CloudIqEvaluation {
  const KB = customKb || defaultKb;
  const A = input.answers || {};
  const mode = input.session?.mode || 'workshop';

  const shouldSkip = (Q: any) => {
    if (mode === 'flash' && Q.mode === 'workshop') return true;
    return false;
  };

  // 1. Strategic Transformation Track Routing
  let JA = 0;
  let JB = 0;
  const q04 = KB.questions.find((x: any) => x.id === 'Q0.4');
  const r04 = (q04 && q04.route && q04.route[A['Q0.4']]) || {};
  JA += r04.A || 0;
  JB += r04.B || 0;

  const Q11 = KB.questions.find((x: any) => x.id === 'Q1.1');
  const a11 = Array.isArray(A['Q1.1'])
    ? A['Q1.1']
    : (A['Q1.1'] !== undefined && A['Q1.1'] !== null ? [A['Q1.1']] : []);
  a11.forEach((i: number) => {
    if (Q11 && Q11.opts && Q11.opts[i]) {
      const j = Q11.opts[i].j || {};
      JA += j.A || 0;
      JB += j.B || 0;
    }
  });

  const Q06 = KB.questions.find((x: any) => x.id === 'Q0.6');
  const a06 = Array.isArray(A['Q0.6'])
    ? A['Q0.6']
    : (A['Q0.6'] !== undefined && A['Q0.6'] !== null ? [A['Q0.6']] : []);
  const topObj = a06[0] || 'Cost reduction & FinOps';
  const oj = Q06 && Q06.objJourney ? Q06.objJourney[topObj] : null;
  if (oj === 'A') JA += 2;
  if (oj === 'B') JB += 2;

  const isHybrid = Math.abs(JA - JB) <= 1;
  const trackCode: 'A' | 'B' | 'Hybrid' = isHybrid ? 'Hybrid' : (JA >= JB ? 'A' : 'B');
  const trackName = isHybrid
    ? 'Dual-Horizon Transformation Track'
    : (trackCode === 'A' ? 'Cloud Value Optimization Track' : 'Estate Modernization & DC Exit Track');

  // 2. Calibrated Maturity per Dimension (D1–D8)
  const dimAcc: Record<string, number[]> = {};
  const add = (dim: string, val: number) => {
    if (!dimAcc[dim]) dimAcc[dim] = [];
    dimAcc[dim].push(val);
  };

  KB.questions.forEach((Q: any) => {
    if (!Q.dim || shouldSkip(Q)) return;
    const v = A[Q.id];
    if (v === undefined || v === null) return;
    if (Q.maturity && Q.type === 'single') add(Q.dim, v + 1);
    else if (Q.maturity && Q.type === 'slider') add(Q.dim, v + 1);
    else if (Q.maturityCount) {
      const n = (v || []).length;
      add(Q.dim, Math.max(1, Math.round(n / Q.opts.length * 5)));
    } else if (Q.maturityTF) {
      add(Q.dim, v === true ? 4.5 : 1.5);
    }
  });

  const dimScores: Record<string, number> = {};
  Object.keys(KB.dimensions).forEach((d) => {
    dimScores[d] = dimAcc[d] && dimAcc[d].length
      ? dimAcc[d].reduce((a, b) => a + b, 0) / dimAcc[d].length
      : 2.5;
  });

  const topDim = (Q06 && Q06.objDim && Q06.objDim[topObj]) || 'D3';
  let wsum = 0;
  let wtot = 0;
  Object.keys(dimScores).forEach((d) => {
    const w = d === topDim ? 1.5 : 1.0;
    wsum += dimScores[d] * w;
    wtot += w;
  });
  const overall = wsum / wtot;
  const band = scoreBand(overall);

  // 3. Flags & Critical Risks
  const asArr = (v: any) => (Array.isArray(v) ? v : (v !== undefined && v !== null ? [v] : []));
  const Q03 = KB.questions.find((x: any) => x.id === 'Q0.3');
  const sov03 = asArr(A['Q0.3']).some(
    (i: number) => Q03 && Q03.opts && Q03.opts[i] && Q03.opts[i][0] !== Q03.sovFlagExcept
  );
  const sov82 = A['Q8.2'] === true;
  const sovFlag = sov03 || sov82;
  const secnumFlag = asArr(A['Q0.3']).includes(9); // SecNumCloud checked
  const aiFlag = asArr(A['Q9.2']).some((i: number) => {
    const q92 = KB.questions.find((x: any) => x.id === 'Q9.2');
    return q92 && q92.opts && q92.opts[i] && q92.opts[i][0] !== 'None yet / monitoring only';
  });
  const vmwareRisk = A['Q0.11'] === 2; // VMware renewal cliff
  const leaseCliff = [2, 3, 4].includes(A['Q0.12']); // Imminent DC lease or EOL cliff

  // 4. Decomposed Financial Value Hook ($ Leakage Breakdown)
  const q43 = KB.questions.find((x: any) => x.id === 'Q4.3');
  const wasteRate = (q43 && q43.waste && q43.waste[A['Q4.3']]) || 0.25;
  const Q08 = KB.questions.find((x: any) => x.id === 'Q0.8');
  const spendMidM = Q08 && Q08.midM && Q08.midM[A['Q0.8']] !== undefined ? Q08.midM[A['Q0.8']] : 12;
  const Q09 = KB.questions.find((x: any) => x.id === 'Q0.9');
  const commitMid = Q09 && Q09.midPct && Q09.midPct[A['Q0.9']] !== undefined ? Q09.midPct[A['Q0.9']] : 0.3;

  const totalCloudSpend = spendMidM * 1000000;
  const totalLeakage = Math.round(totalCloudSpend * wasteRate * (1 - commitMid * 0.45));
  const leakLow = Math.round(totalLeakage * 0.8);
  const leakHigh = Math.round(totalLeakage * 1.25);

  const decomp = {
    compute: Math.round(totalLeakage * 0.4),
    commit: Math.round(totalLeakage * 0.28),
    storage: Math.round(totalLeakage * 0.18),
    licensing: Math.round(totalLeakage * 0.14)
  };

  // 5. 2D Heatmap Urgency & Criticality Calculation
  const urgencyMap: Record<string, number> = {};
  Object.keys(KB.dimensions).forEach((d) => {
    let u = 2; // Default Medium
    if (d === topDim) u = 3;
    if (d === 'D3' && wasteRate >= 0.25) u = 3;
    if (d === 'D6' && (leaseCliff || vmwareRisk)) u = 3;
    if (d === 'D7' && (sovFlag || secnumFlag)) u = 3;
    if (d === 'D2' && trackCode === 'B') u = 3;
    if (d === 'D8' && aiFlag && dimScores.D8 < 2.5) u = 2;
    urgencyMap[d] = u;
  });

  // 6. Explicit 4-Phase Horizon Modernization Roadmap
  const movesPhase1: Array<{ code: string; size: string; title: string; desc: string; impact: string }> = [];
  const movesPhase2: Array<{ code: string; size: string; title: string; desc: string; impact: string }> = [];
  const movesPhase3: Array<{ code: string; size: string; title: string; desc: string; impact: string }> = [];
  const movesPhase4: Array<{ code: string; size: string; title: string; desc: string; impact: string }> = [];

  // Phase 1: Immediate Triage (0–30 Days)
  if (vmwareRisk) {
    movesPhase1.push({
      code: '03.5',
      size: 'S',
      title: 'VMware Broadcom Renewal Defense & Sizing',
      desc: 'Audit vSphere core allocations, assess Nutanix/Hyper-V/cloud alternative licensing before renewal lock-in.',
      impact: 'Averts 2.5x–3.5x licensing cost escalation'
    });
  }
  if (dimScores.D3 < 3.2 || wasteRate >= 0.2) {
    movesPhase1.push({
      code: '03.3',
      size: 'S',
      title: 'Zombie Asset Cleanup & Dev/QA Shutdown',
      desc: 'Automate shutdown of unattached EBS/managed disks and idle non-production compute.',
      impact: `Immediate reclamation of ~$${Math.round((decomp.compute * 0.35) / 1000)}k`
    });
  }
  if (dimScores.D7 < 3.0) {
    movesPhase1.push({
      code: '03.6',
      size: 'S',
      title: 'Cloud Landing Zone MFA & IAM Hardening',
      desc: 'Remediate open storage buckets, enforce MFA on privileged accounts, and isolate blast radius.',
      impact: 'Closes critical compliance/audit exposure'
    });
  }
  if (!movesPhase1.length) {
    movesPhase1.push({
      code: '03.3',
      size: 'S',
      title: 'Baseline Cost Visibility & Tagging Enforcement',
      desc: 'Establish centralized billing view and initial attribution tags.',
      impact: 'Immediate visibility for IT leadership'
    });
  }

  // Phase 2: Short-Term Quick Wins (30–90 Days)
  if (dimScores.D3 < 3.5) {
    movesPhase2.push({
      code: '03.3',
      size: 'M',
      title: 'Commitment Discount Arbitrage (Savings Plans/RIs)',
      desc: 'Model stable baseline compute and execute 1-yr/3-yr discount coverage up to 60–70%.',
      impact: `Locks in ~$${Math.round(decomp.commit / 1000)}k annual recurring savings`
    });
  }
  if (leaseCliff || dimScores.D6 < 3.0) {
    movesPhase2.push({
      code: '03.5',
      size: 'M',
      title: 'Automated Estate Discovery & Dependency Mapping',
      desc: 'Deploy discovery agents (Device42/Dynatrace) to catalog all on-prem assets and network flows.',
      impact: 'Eliminates migration blind spots'
    });
  }
  if (dimScores.D2 < 3.5) {
    movesPhase2.push({
      code: '03.4',
      size: 'M',
      title: 'Top-20 Application 6-R Disposition Scoring',
      desc: 'Assess first wave of critical workloads against Rehost, Replatform, Refactor, Retire.',
      impact: 'Defensible migration business case'
    });
  }
  if (!movesPhase2.length) {
    movesPhase2.push({
      code: '03.6',
      size: 'M',
      title: 'Automated Landing Zone IaC Baseline',
      desc: 'Standardize Terraform/Bicep baseline repositories across cloud subscriptions.',
      impact: 'Prevents architectural drift'
    });
  }

  // Phase 3: Mid-Term Programmatic Modernization (3–9 Months)
  if (dimScores.D2 < 3.8 || trackCode === 'B') {
    movesPhase3.push({
      code: '03.4',
      size: 'L',
      title: 'Industrialized 6-R Migration Factory',
      desc: 'Launch automated migration pipeline with reusable refactoring and containerization patterns.',
      impact: 'Accelerates migration velocity by 40%'
    });
  }
  if (dimScores.D5 < 3.4) {
    movesPhase3.push({
      code: '03.6',
      size: 'M',
      title: 'Internal Developer Platform (IDP) & Golden Paths',
      desc: 'Build self-service infrastructure blueprints with CI/CD and security guardrails baked in.',
      impact: 'Reduces provisioning time from weeks to hours'
    });
  }
  if (dimScores.D4 < 3.4) {
    movesPhase3.push({
      code: '03.2',
      size: 'M',
      title: 'Hybrid Interconnect Fabric & Unified Telemetry',
      desc: 'Deploy redundant DirectConnect/ExpressRoute circuits and cross-environment observability mesh.',
      impact: 'Eliminates multi-cloud operational silos'
    });
  }
  if (secnumFlag || sovFlag) {
    movesPhase3.push({
      code: '02.1',
      size: 'M',
      title: 'Sovereign Cloud & SecNumCloud Compliance Boundary',
      desc: 'Partition sensitive data into sovereign European / local cloud enclaves with strict key management.',
      // A single infrastructure move supports compliance; it cannot by itself make a client compliant.
      impact: 'Supports SecNumCloud / DORA data-boundary requirements'
    });
  }
  // Phase 4: Long-Term Transformation & AI (9–18+ Months). Same rules as the live page before Phase 2.
  if (dimScores.D6 < 3.8 || leaseCliff) {
    movesPhase4.push({
      code: '03.5',
      size: 'XL',
      title: 'Full Data Centre Decommissioning & Facility Handback',
      desc: 'Physical server decommissioning, lease termination, and hardware asset liquidation.',
      impact: 'Permanently eliminates facility lease overhead'
    });
  }
  if (dimScores.D2 < 4.2) {
    movesPhase4.push({
      code: '03.4',
      size: 'L',
      title: 'Core Legacy Monolith Decoupling',
      desc: 'Refactor core monolithic applications into microservices or serverless event-driven architecture.',
      impact: 'Improves release cycle frequency by 5x'
    });
  }
  if (aiFlag || dimScores.D8 < 3.8) {
    movesPhase4.push({
      code: '04.4',
      size: 'M',
      title: 'Enterprise AI Lakehouse & TokenOps Platform',
      desc: 'Governed feature store, model routing gateway, and private data boundary for generative AI.',
      impact: 'Scalable, cost-governed GenAI adoption'
    });
  }

  // 7. Recommended Offerings: { code, why } plus the catalogue entry. Same rules as the live page before Phase 2.
  const offersRaw: Array<{ code: string; why: string }> = [];
  if (dimScores.D3 <= 3.2 || wasteRate >= 0.15) offersRaw.push({ code: '03.3', why: 'Cost allocation, waste leakage & FinOps unit economics' });
  if (dimScores.D4 <= 3.2) offersRaw.push({ code: '03.2', why: 'Inconsistent hybrid / multi-cloud operating model' });
  if (dimScores.D5 <= 3.2) offersRaw.push({ code: '03.6', why: 'Platform automation, golden paths & developer experience' });
  if (dimScores.D1 <= 3.2 || trackCode === 'B') offersRaw.push({ code: '03.1', why: 'Workload placement, cloud strategy & business case' });
  if (dimScores.D2 <= 3.2) offersRaw.push({ code: '03.4', why: 'Application modernization & migration factory execution' });
  if (dimScores.D6 <= 3.2 || leaseCliff) offersRaw.push({ code: '03.5', why: 'Data centre consolidation, facility exit & compute capacity' });
  const offersDedup = offersRaw
    .filter((o, idx, arr) => arr.findIndex(x => x.code === o.code) === idx)
    .map(o => ({ ...(KB.offerings?.[o.code] || {}), ...o }));

  // 8. Sector Peer Benchmark Comparison
  const q02 = KB.questions.find((x: any) => x.id === 'Q0.2');
  const industryKey =
    q02 && q02.opts && q02.opts[A['Q0.2'] || 0] ? q02.opts[A['Q0.2'] || 0][0] : 'Other';
  // Benchmarks are objects ({ overall, D1..D8, note }); compare against the overall median.
  const peerBenchmark = KB.benchmarks[industryKey];
  const peer = typeof peerBenchmark?.overall === 'number' ? peerBenchmark.overall : 3.1;
  const peerDelta = overall - peer;

  // 9. Generate Dynamic Consulting Probes
  const probes = generateCloudIqProbes(A, {
    totalCloudSpend,
    topObj,
    leaseCliff,
    vmwareRisk,
    secnumFlag,
    sovFlag,
    dimScores
  });

  return {
    trackCode,
    trackName,
    isHybrid,
    overall: Math.round(overall * 100) / 100,
    band,
    dimScores,
    topObj,
    topDim,
    sovFlag,
    secnumFlag,
    aiFlag,
    vmwareRisk,
    leaseCliff,
    totalCloudSpend,
    totalLeakage,
    leakLow,
    leakHigh,
    decomp,
    urgencyMap,
    movesPhase1,
    movesPhase2,
    movesPhase3,
    movesPhase4,
    offers: offersDedup,
    peer,
    peerDelta: Math.round(peerDelta * 100) / 100,
    industryKey,
    probes,
    timestamp: new Date().toISOString()
  };
}
