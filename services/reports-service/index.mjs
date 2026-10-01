import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CognitoIdentityProviderClient, AdminSetUserPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';

const BUCKET_NAME = process.env.REPORTS_BUCKET || 'ltm-advisory-reports-223833501993';
const REGION = process.env.AWS_REGION || 'ap-south-1';
const USER_POOL_ID = 'ap-south-1_91amN2bz4';
const SUPER_ADMIN_EMAIL = 'dixitashutosh007@gmail.com';

const s3Client = new S3Client({ region: REGION });
const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;
  const path = event.rawPath || event.path || '';

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  try {
    // -------------------------------------------------------------
    // Route 1: POST /api/auth/reset-password (In-page Password Reset)
    // -------------------------------------------------------------
    if (path.includes('/reset-password') || path.endsWith('/reset-password')) {
      let body = {};
      if (event.body) {
        body = event.isBase64Encoded
          ? JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'))
          : JSON.parse(event.body);
      }

      const { email, newPassword } = body;
      if (!email || !newPassword) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ ok: false, error: 'Email and newPassword are required.' })
        };
      }

      if (email.trim().toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
        return {
          statusCode: 403,
          headers: CORS_HEADERS,
          body: JSON.stringify({ ok: false, error: 'Password reset is only authorized for dixitashutosh007@gmail.com.' })
        };
      }

      if (newPassword.length < 8) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ ok: false, error: 'Password must be at least 8 characters long.' })
        };
      }

      await cognitoClient.send(new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: email.trim(),
        Password: newPassword,
        Permanent: true
      }));

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          ok: true,
          message: 'Password successfully updated for ' + SUPER_ADMIN_EMAIL
        })
      };
    }

    // -------------------------------------------------------------
    // Route 2: POST /api/reports/save (Store PDF Report in S3)
    // -------------------------------------------------------------
    if (path.includes('/reports/save') || (method === 'POST' && !path.includes('/list'))) {
      let body = {};
      if (event.body) {
        body = event.isBase64Encoded
          ? JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'))
          : JSON.parse(event.body);
      }

      const { acceleratorId, clientName, pdfBase64, metadata } = body;

      if (!acceleratorId || !pdfBase64) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            ok: false,
            error: 'Missing required fields: "acceleratorId" and "pdfBase64" are mandatory.'
          })
        };
      }

      // Sanitize client name and generate timestamped key
      const cleanClient = (clientName || 'Enterprise_Client')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/__+/g, '_')
        .substring(0, 50);

      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-');
      const randomTag = Math.random().toString(36).substring(2, 7);
      const safeAccId = acceleratorId.replace(/[^a-zA-Z0-9_-]/g, '');

      const pdfKey = `reports/${safeAccId}/${cleanClient}_${timestamp}_${randomTag}.pdf`;
      const metaKey = `reports/${safeAccId}/${cleanClient}_${timestamp}_${randomTag}.meta.json`;

      const rawBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
      const pdfBuffer = Buffer.from(rawBase64, 'base64');

      // 1. Upload PDF file to S3
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: pdfKey,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        Metadata: {
          'accelerator-id': safeAccId,
          'client-name': encodeURIComponent(clientName || 'Enterprise Client'),
          'created-at': now.toISOString()
        }
      }));

      // 2. Upload structured metadata alongside the PDF
      const reportMeta = {
        acceleratorId: safeAccId,
        clientName: clientName || 'Enterprise Client',
        pdfKey,
        sizeBytes: pdfBuffer.length,
        createdAt: now.toISOString(),
        metadata: metadata || {}
      };

      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: metaKey,
        Body: Buffer.from(JSON.stringify(reportMeta, null, 2)),
        ContentType: 'application/json'
      }));

      // 3. Generate a secure pre-signed GET URL valid for 7 days
      const downloadCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: pdfKey,
        ResponseContentDisposition: `inline; filename="${cleanClient}_${safeAccId}_Report.pdf"`
      });

      const downloadUrl = await getSignedUrl(s3Client, downloadCommand, { expiresIn: 604800 });

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          ok: true,
          message: 'Report PDF successfully archived to AWS S3',
          bucket: BUCKET_NAME,
          key: pdfKey,
          s3Uri: `s3://${BUCKET_NAME}/${pdfKey}`,
          downloadUrl: downloadUrl,
          clientName: clientName || 'Enterprise Client',
          acceleratorId: safeAccId,
          sizeBytes: pdfBuffer.length,
          savedAt: now.toISOString()
        })
      };
    }

    // -------------------------------------------------------------
    // Route 3: GET /api/reports/list (List Saved Reports from S3)
    // -------------------------------------------------------------
    if (path.includes('/reports/list') || (method === 'GET' && path.includes('/list'))) {
      const qParams = event.queryStringParameters || {};
      const filterAcc = qParams.acceleratorId ? qParams.acceleratorId.replace(/[^a-zA-Z0-9_-]/g, '') : '';
      const prefix = filterAcc ? `reports/${filterAcc}/` : 'reports/';

      const listResp = await s3Client.send(new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix,
        MaxKeys: 100
      }));

      const pdfItems = (listResp.Contents || []).filter(item => item.Key && item.Key.endsWith('.pdf'));

      const reports = await Promise.all(pdfItems.map(async (item) => {
        const parts = item.Key.split('/');
        const accId = parts[1] || 'general';
        const filename = parts[parts.length - 1] || item.Key;

        const downloadCommand = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: item.Key,
          ResponseContentDisposition: `inline; filename="${filename}"`
        });

        let downloadUrl = '';
        try {
          downloadUrl = await getSignedUrl(s3Client, downloadCommand, { expiresIn: 604800 });
        } catch (e) {}

        return {
          key: item.Key,
          filename: filename,
          acceleratorId: accId,
          size: item.Size,
          lastModified: item.LastModified,
          downloadUrl: downloadUrl,
          s3Uri: `s3://${BUCKET_NAME}/${item.Key}`
        };
      }));

      reports.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          ok: true,
          count: reports.length,
          bucket: BUCKET_NAME,
          reports: reports
        })
      };
    }

    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ ok: false, error: 'Endpoint not found' })
    };
  } catch (err) {
    console.error('[ReportsService] Error handling request:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: false,
        error: 'Reports service internal error: ' + (err.message || String(err))
      })
    };
  }
};
