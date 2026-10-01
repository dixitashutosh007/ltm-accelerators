/**
 * LTM Infrastructure Tech Advisory — Customer Reports Archive Utility
 * Region: ap-south-1 (Mumbai)
 * Bucket: ltm-advisory-reports-223833501993
 */
(function(window) {
  const REPORTS_API_BASE = 'https://zvnmwxa9sf.execute-api.ap-south-1.amazonaws.com/api/reports';

  function extractCleanBase64(pdfBase64) {
    let clean = (pdfBase64 || '').trim();
    if (clean.includes(';base64,')) {
      clean = clean.split(';base64,')[1];
    } else if (clean.startsWith('data:')) {
      clean = clean.replace(/^data:[^;]+;base64,/, '');
    }
    return clean.trim();
  }

  async function saveReportToS3(params) {
    const { acceleratorId, clientName, pdfBase64, metadata } = params;

    if (!acceleratorId || !pdfBase64) {
      throw new Error('acceleratorId and pdfBase64 are required');
    }

    const cleanBase64 = extractCleanBase64(pdfBase64);
    if (!cleanBase64 || cleanBase64.length < 50) {
      throw new Error('PDF data string is empty or invalid.');
    }

    const resp = await fetch(`${REPORTS_API_BASE}/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        acceleratorId,
        clientName: clientName || 'Enterprise Client',
        pdfBase64: cleanBase64,
        metadata: metadata || {}
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Report archive failed (${resp.status}): ${errText}`);
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
      throw new Error(`Failed to list reports (${resp.status})`);
    }

    return await resp.json();
  }

  async function deleteReportFromS3(key, requesterEmail) {
    if (!key) throw new Error('Report key is required.');
    const resp = await fetch(`${REPORTS_API_BASE}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, requesterEmail: requesterEmail || '' })
    });
    const data = await resp.json();
    if (!data.ok) throw new Error(data.error || 'Failed to delete report.');
    return data;
  }

  async function renameReportInS3(key, newClientName, requesterEmail) {
    if (!key || !newClientName) throw new Error('Key and new name are required.');
    const resp = await fetch(`${REPORTS_API_BASE}/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, newClientName, requesterEmail: requesterEmail || '' })
    });
    const data = await resp.json();
    if (!data.ok) throw new Error(data.error || 'Failed to rename report.');
    return data;
  }

  function requestArchiveConsent(reportDetails, onConfirm, onCancel) {
    const existing = document.getElementById('ltmReportConsentModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'ltmReportConsentModal';
    modal.style.cssText = `
      position: fixed; inset: 0; z-index: 9999999;
      background: rgba(4, 7, 12, 0.88); backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      padding: 20px; font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    `;

    const accTitle = reportDetails.acceleratorTitle || reportDetails.acceleratorId || 'Assessment Report';
    const clientName = reportDetails.clientName || 'Enterprise Client';

    modal.innerHTML = `
      <div style="background: #0B1119; border: 1px solid rgba(255,255,255,0.12); border-radius: 18px; max-width: 500px; width: 100%; box-shadow: 0 24px 60px rgba(0,0,0,0.7); overflow: hidden; animation: fadeInModal 0.2s ease;">
        <div style="padding: 24px 28px 20px; border-bottom: 1px solid rgba(255,255,255,0.08);">
          <div style="font-family:'JetBrains Mono',monospace; font-size: 11px; font-weight: 700; color: #10B981; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 6px;">
            Secured Storage &middot; Archival Consent
          </div>
          <h3 style="margin: 0; font-size: 19px; color: #FFFFFF; font-weight: 700;">Archive Assessment Report</h3>
          <p style="margin: 6px 0 0; font-size: 12.5px; color: #94A3B8; line-height: 1.5;">
            Please confirm organizational consent before saving this diagnostic deliverable to Secured Storage.
          </p>
        </div>

        <div style="padding: 20px 28px; background: rgba(255,255,255,0.015);">
          <div style="margin-bottom: 14px;">
            <div style="font-size: 11px; color: #64748B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Diagnostic Instrument</div>
            <div style="color: #FFFFFF; font-size: 13.5px; font-weight: 600;">${accTitle}</div>
          </div>

          <div style="margin-bottom: 16px;">
            <div style="font-size: 11px; color: #64748B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Client Organization / Label</div>
            <input type="text" id="consentClientName" value="${clientName.replace(/"/g, '&quot;')}" style="width: 100%; box-sizing: border-box; background: #06090E; border: 1px solid #1E293B; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #FFFFFF; outline: none;">
          </div>

          <div style="background: rgba(16, 185, 129, 0.06); border: 1px solid rgba(16, 185, 129, 0.22); border-radius: 10px; padding: 12px 14px;">
            <label style="display: flex; gap: 10px; align-items: flex-start; cursor: pointer;">
              <input type="checkbox" id="consentCheck" checked style="margin-top: 3px; accent-color: #10B981; width: 16px; height: 16px;">
              <span style="font-size: 12px; color: #CBD5E1; line-height: 1.45;">
                I confirm that client consent has been obtained to archive this assessment deliverable to Secured Storage for authorized advisory retrieval.
              </span>
            </label>
          </div>
        </div>

        <div style="padding: 16px 28px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: flex-end; gap: 10px; background: #070B10;">
          <button id="btnConsentCancel" style="background: transparent; border: 1px solid rgba(255,255,255,0.12); color: #94A3B8; padding: 9px 18px; border-radius: 999px; font-size: 12.5px; font-weight: 600; cursor: pointer;">
            Cancel
          </button>
          <button id="btnConsentConfirm" style="background: #10B981; border: 1px solid #10B981; color: #042114; padding: 9px 20px; border-radius: 999px; font-size: 12.5px; font-weight: 700; cursor: pointer;">
            Confirm &amp; Archive Report &rarr;
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('btnConsentCancel').onclick = function() {
      modal.remove();
      if (onCancel) onCancel();
    };

    document.getElementById('btnConsentConfirm').onclick = function() {
      const chk = document.getElementById('consentCheck');
      if (!chk.checked) {
        alert('Please check the confirmation box to verify client consent.');
        return;
      }
      const finalClient = document.getElementById('consentClientName').value.trim() || clientName;
      modal.remove();
      if (onConfirm) onConfirm(finalClient);
    };
  }

  function showS3SuccessBanner(result) {
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
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      animation: slideInUp 0.3s ease;
    `;

    banner.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#34D399;text-transform:uppercase;letter-spacing:0.05em;">
          <span>☁️</span> Archived to Secured Storage
        </span>
        <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:#9CA3AF;font-size:18px;cursor:pointer;">&times;</button>
      </div>
      <div style="font-size:13px;font-weight:600;color:#FFFFFF;margin-bottom:4px;">
        ${result.clientName || 'Client Report'}
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <a href="${result.downloadUrl}" target="_blank" style="flex:1;text-align:center;text-decoration:none;background:#10B981;color:#042114;padding:7px 12px;border-radius:6px;font-size:11.5px;font-weight:700;">Open PDF &rarr;</a>
        <button onclick="this.textContent='Copied!';setTimeout(()=>this.textContent='Copy Link',2000);navigator.clipboard.writeText('${result.downloadUrl}');" style="background:rgba(255,255,255,0.08);border:1px solid #374151;color:#D1D5DB;padding:7px 12px;border-radius:6px;font-size:11.5px;cursor:pointer;">Copy Link</button>
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
    deleteReportFromS3,
    renameReportInS3,
    requestArchiveConsent,
    showS3SuccessBanner
  };
})(window);
