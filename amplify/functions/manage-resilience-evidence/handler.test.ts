import { handler } from "./handler";

const event = (body: unknown) => ({
  requestContext: { http: { method: "POST" } },
  body: JSON.stringify(body),
  isBase64Encoded: false
}) as any;

const json = (response: any) => JSON.parse(String(response.body));

const valid = await handler(event({
  assessmentId: "assessment-1",
  evidenceId: "ER-01",
  fromStatus: "requested",
  toStatus: "provided",
  evidenceLocation: "s3://example/evidence-1"
}));
if (valid.statusCode !== 200 || !json(valid).ok) throw new Error("Valid evidence transition should return 200");

const validate = await handler(event({
  assessmentId: "assessment-1",
  evidenceId: "ER-01",
  fromStatus: "provided",
  toStatus: "validated",
  validationOutcome: "Meets all validation criteria."
}));
if (validate.statusCode !== 200 || !json(validate).ok) throw new Error("Evidence validation should return 200");

const missingOutcome = await handler(event({
  assessmentId: "assessment-1",
  evidenceId: "ER-01",
  fromStatus: "provided",
  toStatus: "validated"
}));
if (missingOutcome.statusCode !== 400) throw new Error("Validation without outcome should return 400");

const forbidden = await handler(event({
  assessmentId: "assessment-1",
  evidenceId: "ER-01",
  fromStatus: "requested",
  toStatus: "validated"
}));
if (forbidden.statusCode !== 409 || json(forbidden).error !== "invalid_evidence_status_transition") {
  throw new Error("Illegal evidence transition should return 409");
}

const malformed = await handler(event(null));
if (malformed.statusCode !== 400) throw new Error("Malformed evidence request should return 400");

const options = await handler({
  requestContext: { http: { method: "OPTIONS" } }
} as any);
if (options.statusCode !== 200) throw new Error("OPTIONS should return 200");

const get = await handler({
  requestContext: { http: { method: "GET" } }
} as any);
if (get.statusCode !== 405) throw new Error("Unsupported evidence methods should return 405");

console.log("Resilience IQ evidence API contract tests passed");
