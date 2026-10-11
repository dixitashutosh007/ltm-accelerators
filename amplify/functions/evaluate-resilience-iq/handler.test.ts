import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { handler as rawHandler } from './handler';

const handler = async (e: any) => (await rawHandler(e)) as APIGatewayProxyStructuredResultV2;

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

const validMatrix = await handler(event({
  answers: {
    ...validAnswers,
    "EX-05": {
      Applications: "Validated",
      Data: "Validated",
      Infrastructure: "Partial",
      People: "Validated",
      "Third parties": "Stale"
    }
  }
}));
if (validMatrix.statusCode !== 200 || !json(validMatrix).ok) {
  throw new Error("Valid EX-05 matrix answer should return 200");
}

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

const incompleteMatrix = await handler(event({
  answers: {
    ...validAnswers,
    "EX-05": { Applications: "Validated" }
  }
}));
if (incompleteMatrix.statusCode !== 400 || !String(json(incompleteMatrix).error).includes("Incomplete matrix")) {
  throw new Error("Incomplete matrix should return 400");
}

const oversized = await handler(event({
  answers: { "AF-BIA-01": "x".repeat(4001) }
}));
if (oversized.statusCode !== 400) throw new Error("Oversized text should return 400");

const nullEnvelope = await handler(event(null));
if (nullEnvelope.statusCode !== 400 || !String(json(nullEnvelope).error).includes("JSON object")) {
  throw new Error("Null request envelope should return 400");
}

const arrayEnvelope = await handler(event([]));
if (arrayEnvelope.statusCode !== 400 || !String(json(arrayEnvelope).error).includes("JSON object")) {
  throw new Error("Array request envelope should return 400");
}

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

process.env.ALLOWED_ORIGINS = "https://example.com,https://*.preview.example";
const allowedOrigin = await handler({
  requestContext: { http: { method: "OPTIONS" } },
  headers: { origin: "https://example.com" }
} as any);
if (allowedOrigin.headers?.["Access-Control-Allow-Origin"] !== "https://example.com") throw new Error("An allowed origin should be echoed");
const previewOrigin = await handler({
  requestContext: { http: { method: "OPTIONS" } },
  headers: { origin: "https://branch.preview.example" }
} as any);
if (previewOrigin.headers?.["Access-Control-Allow-Origin"] !== "https://branch.preview.example") throw new Error("A wildcard preview origin should be echoed");
const otherOrigin = await handler({
  requestContext: { http: { method: "OPTIONS" } },
  headers: { origin: "https://evil.example" }
} as any);
if (otherOrigin.headers?.["Access-Control-Allow-Origin"] !== undefined) throw new Error("Origins that are not allowed must get no CORS header (never '*')");
delete process.env.ALLOWED_ORIGINS;

const traceable = await handler(event({ answers: validAnswers }));
if (!traceable.headers?.["X-Request-Id"]) throw new Error("Responses should include a request ID");

const base64 = await handler({
  requestContext: { http: { method: "POST" } },
  body: Buffer.from(JSON.stringify({ answers: validAnswers }), "utf-8").toString("base64"),
  isBase64Encoded: true
} as any);
if (base64.statusCode !== 200 || !json(base64).ok) throw new Error("Base64 JSON payload should be accepted");

const missingAnswers = await handler(event({}));
if (missingAnswers.statusCode !== 400) throw new Error("Missing answers should return 400");

const arrayAnswers = await handler(event({ answers: [] }));
if (arrayAnswers.statusCode !== 400) throw new Error("Array answers should return 400");

const oversizedFields = await handler(event({
  answers: Object.fromEntries(Array.from({ length: 181 }, (_, i) => [`EX-${i}`, "x"]))
}));
if (oversizedFields.statusCode !== 400) throw new Error("Oversized answer field count should return 400");

const invalidNumber = await handler(event({ answers: { "AF-BIA-01": "not-a-number" } }));
if (invalidNumber.statusCode !== 400) throw new Error("Invalid numeric answer should return 400");

console.log("Resilience IQ API contract tests passed");
