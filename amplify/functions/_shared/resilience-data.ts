/**
 * Amplify Data access and caller identity shared by the Resilience IQ Lambdas (assessment and evidence).
 *
 * Calls are signed with the Lambda's own IAM credentials (SigV4); the schema grants these functions
 * query and mutate access with allow.resource(). Who may read or change a record is decided in the
 * handlers from the caller's Cognito claims, which API Gateway has already validated.
 */
import type { APIGatewayProxyEventV2, APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { createHash, createHmac } from 'node:crypto';

function sha256(value: string) { return createHash('sha256').update(value).digest('hex'); }
function hmac(key: Buffer | string, value: string) { return createHmac('sha256', key).update(value).digest(); }

function credentials() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;
  const region = process.env.AWS_REGION;
  if (!accessKeyId || !secretAccessKey || !sessionToken || !region) throw new Error('AWS runtime credentials are unavailable.');
  return { accessKeyId, secretAccessKey, sessionToken, region };
}

export async function graphql(query: string, variables: Record<string, unknown>) {
  const endpoint = process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT;
  if (!endpoint) throw new Error('Amplify Data GraphQL endpoint is unavailable.');
  const { accessKeyId, secretAccessKey, sessionToken, region } = credentials();
  const url = new URL(endpoint);
  const body = JSON.stringify({ query, variables });
  const payloadHash = sha256(body);
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const service = 'appsync';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const headers: { [key: string]: string } = {
    'content-type': 'application/json',
    host: url.host,
    'x-amz-date': amzDate,
    'x-amz-security-token': sessionToken
  };
  const canonicalHeaders = Object.keys(headers).sort().map(k => `${k}:${headers[k].trim()}\n`).join('');
  const signedHeaders = Object.keys(headers).sort().join(';');
  const canonicalRequest = ['POST', '/graphql', '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256(canonicalRequest)].join('\n');
  const kDate = hmac('AWS4' + secretAccessKey, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  headers.authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const res = await fetch(endpoint, { method: 'POST', headers, body });
  const json = await res.json() as any;
  if (!res.ok || json.errors?.length) throw new Error(json.errors?.map((e: any) => e.message).join('; ') || `GraphQL request failed with ${res.status}`);
  return json.data;
}

// AppSync list queries filter after reading a page, so a filter can match nothing on page one and still have
// matches later: always follow nextToken. MAX_PAGES bounds the work per request.
const PAGE_SIZE = 200, MAX_PAGES = 50;

/** Lists every record of `model` (e.g. "ResilienceAssessment") matching `filter`, following nextToken. */
export async function listWhere(model: string, fields: string, filter: Record<string, unknown>, stopAtFirst = false) {
  const queryName = `list${model}s`;
  const items: any[] = [];
  let nextToken: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const data: any = await graphql(`query List${model}s($filter: Model${model}FilterInput, $limit: Int, $nextToken: String) {
      ${queryName}(filter:$filter, limit:$limit, nextToken:$nextToken) { items { ${fields} } nextToken }
    }`, { filter, limit: PAGE_SIZE, nextToken });
    items.push(...(data[queryName].items || []));
    nextToken = data[queryName].nextToken || null;
    if (!nextToken || (stopAtFirst && items.length)) break;
  }
  return items;
}

function claims(event: APIGatewayProxyEventV2) {
  // The route's JWT authorizer populates these claims; requests without it carry none.
  return (event as APIGatewayProxyEventV2WithJWTAuthorizer).requestContext?.authorizer?.jwt?.claims || {};
}
function groups(event: APIGatewayProxyEventV2) {
  const groupsRaw = claims(event)['cognito:groups'];
  return Array.isArray(groupsRaw) ? groupsRaw.map(String) : String(groupsRaw || '').split(',').map(x => x.trim()).filter(Boolean);
}
export function authorized(event: APIGatewayProxyEventV2) {
  // API Gateway has already validated the platform Cognito JWT.
  // The platform RBAC role is stored in the application session, not as a
  // Cognito group claim, so do not require Admin/Consultant groups here.
  const c = claims(event);
  return Boolean(c.sub || c.email || c.username);
}
export function isAdmin(event: APIGatewayProxyEventV2) { return groups(event).includes('Admin'); }
export function userEmail(event: APIGatewayProxyEventV2) {
  return String(claims(event).email || claims(event).username || '').trim().toLowerCase();
}
/** A record belongs to its respondent; Admins may act on any record. */
export function canAccess(event: APIGatewayProxyEventV2, respondentEmail: unknown) {
  return isAdmin(event) || String(respondentEmail || '').trim().toLowerCase() === userEmail(event);
}
export function parseBody(event: APIGatewayProxyEventV2) {
  if (!event.body) return {};
  return JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body);
}

export const ASSESSMENT_FIELDS = `id assessmentId clientName clientSector respondentEmail status questionBankVersion scoringModelVersion decisionTreeVersion blueprintEngineVersion executiveReportVersion engineVersion answersJson resultJson decisionLogJson recommendationSensitivityJson startedAt completedAt finalizedAt createdAt updatedAt`;

export async function getAssessment(assessmentId: string) {
  return (await listWhere('ResilienceAssessment', ASSESSMENT_FIELDS, { assessmentId: { eq: assessmentId } }, true))[0] || null;
}
