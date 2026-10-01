import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET_NAME = process.env.REPORTS_BUCKET || 'ltm-advisory-reports-223833501993';
const REGION = process.env.AWS_REGION || 'ap-south-1';

const s3Client = new S3Client({ region: REGION });

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
    // Route 1: POST /api/reports/save (Store PDF Report in S3)
    // -------------------------------------------------------------
    if (method === 'POST' || path.endsWith('/save')) {
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

      // Decode Base64 PDF to buffer
      // Remove any data URL header if present (e.g. data:application/pdf;base64,)
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

      // 3. Generate a secure pre-signed GET URL valid for 7 days (604,800 seconds)
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
    // Route 2: GET /api/reports/list (List Saved Reports from S3)
    // -------------------------------------------------------------
    if (method === 'GET' || path.endsWith('/list')) {
      const qParams = event.queryStringParameters || {};
      const filterAcc = qParams.acceleratorId ? qParams.acceleratorId.replace(/[^a-zA-Z0-9_-]/g, '') : '';
      const prefix = filterAcc ? `reports/${filterAcc}/` : 'reports/';

      const listResp = await s3Client.send(new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix,
        MaxKeys: 100
      }));

      const pdfItems = (listResp.Contents || []).filter(item => item.Key && item.Key.endsWith('.pdf'));

      // Generate signed URLs for recent reports
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

      // Sort newest first
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
