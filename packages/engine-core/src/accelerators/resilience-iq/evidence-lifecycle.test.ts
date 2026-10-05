import {
  assertEvidenceStatusTransition,
  canTransitionEvidenceStatus,
  evidenceStatusTransitions
} from "./evidence-lifecycle";

const expected: Record<string, string[]> = {
  not_requested: ["requested"],
  requested: ["provided", "rejected"],
  provided: ["validated", "rejected"],
  validated: ["validated"],
  rejected: ["requested", "rejected"]
};

const actual = evidenceStatusTransitions();
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error("Evidence lifecycle transitions must match the governed contract");
}

for (const [from, targets] of Object.entries(expected)) {
  for (const to of targets) {
    if (!canTransitionEvidenceStatus(from as any, to as any)) {
      throw new Error(`Expected allowed transition: ${from} -> ${to}`);
    }
    assertEvidenceStatusTransition(from as any, to as any);
  }
}

const forbidden = [
  ["not_requested", "provided"],
  ["not_requested", "validated"],
  ["requested", "validated"],
  ["provided", "requested"],
  ["validated", "rejected"],
  ["validated", "requested"],
  ["rejected", "provided"],
  ["rejected", "validated"]
];

for (const [from, to] of forbidden) {
  if (canTransitionEvidenceStatus(from as any, to as any)) {
    throw new Error(`Forbidden evidence transition was accepted: ${from} -> ${to}`);
  }
  let threw = false;
  try {
    assertEvidenceStatusTransition(from as any, to as any);
  } catch {
    threw = true;
  }
  if (!threw) throw new Error(`Forbidden evidence transition did not throw: ${from} -> ${to}`);
}

console.log("Resilience IQ evidence lifecycle tests passed");
