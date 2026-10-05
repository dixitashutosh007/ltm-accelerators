import { handler } from "./handler";

const event = (body: unknown) => ({
  requestContext: { http: { method: "POST" } },
  body: JSON.stringify(body),
  isBase64Encoded: false
}) as any;

const json = (response: any) => JSON.parse(String(response.body));

const validAnswers = {
  "EX-01": ["Revenue-generating services"],
  "EX-02": "1-4 hours",
  "EX-03": "1-4 hours",
  "EX-04": "15-60 minutes"
};

const valid = await handler(event({ answers: validAnswers }));
if (valid.statusCode !== 200) throw new Error(`Valid payload should return 200, got ${valid.statusCode}`);
if (!json(valid).ok) throw new Error("Valid payload should return ok=true");

const unknown = await handler(event({ answers: { ...validAnswers, "EX-99": "x" } }));
if (unknown.statusCode !== 400 || json(unknown).ok) throw new Error("Unknown question ID should return 400");

const invalidOption = await handler(event({ answers: { ...validAnswers, "EX-03": "not-an-option" } }));
if (invalidOption.statusCode !== 400) throw new Error("Invalid option should return 400");

const invalidMatrix = await handler(event({
  answers: {
    ...validAnswers,
    "EX-05": { Applications: "Not a valid column" }
  }
}));
if (invalidMatrix.statusCode !== 400) throw new Error("Invalid matrix value should return 400");

const oversized = await handler(event({
  answers: { "AF-BIA-01": "x".repeat(4001) }
}));
if (oversized.statusCode !== 400) throw new Error("Oversized text should return 400");

const malformed = await handler({
  requestContext: { http: { method: "POST" } },
  body: "{not-json}",
  isBase64Encoded: false
} as any);
if (malformed.statusCode !== 400 || !String(json(malformed).error).includes("valid JSON")) {
  throw new Error("Malformed JSON should return a clear 400");
}

const options = await handler({
  requestContext: { http: { method: "OPTIONS" } }
} as any);
if (options.statusCode !== 200) throw new Error("OPTIONS should return 200");

const get = await handler({
  requestContext: { http: { method: "GET" } }
} as any);
if (get.statusCode !== 405) throw new Error("Unsupported methods should return 405");

const traceable = await handler(event({ answers: validAnswers }));
if (!traceable.headers?.["X-Request-Id"]) throw new Error("Responses should include a request ID");

console.log("Resilience IQ API contract tests passed");
