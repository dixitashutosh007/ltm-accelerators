/**
 * LTM Infra Tech Advisory — AWS S3 Customer Reports Archive Utility
 * Region: ap-south-1 (Mumbai)
 * Bucket: ltm-advisory-reports-223833501993
 */
(function(window) {
  const REPORTS_API_BASE = 'https://zvnmwxa9sf.execute-api.ap-south-1.amazonaws.com/api/reports';

  async function saveReportToS3(params) {
    const { acceleratorId, clientName, pdfBase64, metadata } = params;

    if (!acceleratorId || !pdfBase64) {
      throw new Error('acceleratorId and pdfBase64 are required');
    }

    const resp = await fetch(`${REPORTS_API_BASE}/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        acceleratorId,
        clientName: clientName || 'Enterprise Client',
        pdfBase64,
        metadata: metadata || {}
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`S3 archive failed (${resp.status}): ${errText}`);
    }

    return await resp.json();
  }

  async function listReportsFromS3(acceleratorId) {
    const url = acceleratorId 
      ? `${REPORTS_API_BASE}/list?acceleratorId=${encodeURIComponent(acceleratorId)}`
      : `${REPORTS_API_BASE}/list`;

    const resp = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!resp.ok) {
      throw new Error(`Failed to list S3 reports (${resp.status})`);
    }

    return await resp.json();
  }

  function showS3SuccessBanner(result, containerId) {
    const banner = document.createElement('div');
    banner.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: #0E1724;
      border: 1px solid #10B981;
      box-shadow: 0 12px 32px rgba(0,0,0,0.5);
      border-radius: 12px;
      padding: 16px 20px;
      max-width: 440px;
      color: #F3F4F6;
      font-family: 'Plus Jakarta Sans', sans-serif;
      animation: slideInUp 0.3s ease;
    `;

    banner.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#34D399;text-transform:uppercase;letter-spacing:0.05em;">
          <span>☁️</span> Archived to AWS S3
        </span>
        <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:#9CA3AF;font-size:18px;cursor:pointer;">&times;</button>
      </div>
      <div style="font-size:13px;font-weight:600;color:#FFFFFF;margin-bottom:4px;">
        ${result.clientName || 'Client Report'}
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#9CA3AF;word-break:break-all;margin-bottom:12px;">
        ${result.s3Uri}
      </div>
      <div style="display:flex;gap:8px;">
        <a href="${result.downloadUrl}" target="_blank" style="flex:1;text-align:center;text-decoration:none;background:#10B981;color:#042114;padding:6px 12px;border-radius:6px;font-size:11.5px;font-weight:700;">Open PDF in S3 &rarr;</a>
        <button onclick="navigator.clipboard.writeText('${result.s3Uri}');this.textContent='Copied!';" style="background:rgba(255,255,255,0.08);border:1px solid #374151;color:#D1D5DB;padding:6px 10px;border-radius:6px;font-size:11.5px;cursor:pointer;">Copy URI</button>
      </div>
    `;

    document.body.appendChild(banner);
    setTimeout(() => {
      if (banner.parentElement) {
        banner.style.transition = 'opacity 0.4s';
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 400);
      }
    }, 10000);
  }

  window.LTM_S3 = {
    saveReportToS3,
    listReportsFromS3,
    showS3SuccessBanner
  };
})(window);
