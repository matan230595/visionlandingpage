export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});

  // Parse body (FormData or JSON)
  let data = {};
  try {
    const ct = req.headers['content-type'] || '';
    if (ct.includes('application/json')) {
      data = req.body || {};
    } else {
      const raw = await readBody(req);
      try { data = Object.fromEntries(new URLSearchParams(raw)); } catch {}
      if (!data.name) { try { data = JSON.parse(raw); } catch {} }
    }
  } catch(e) { data = req.body || {}; }

  const ts = new Date().toLocaleString('en-US', {timeZone:'America/New_York'});
  const payload = {
    timestamp:        ts,
    name:             data.name             || 'Unknown',
    phone:            data.phone            || 'N/A',
    email:            data.email            || 'N/A',
    page:             data.page_title       || data.page || 'Vision Landing Page',
    damage_type:      data.damage_type      || data.interest || '',
    insurance_status: data.insurance_status || '',
    utm_campaign:     data.utm_campaign     || 'direct',
    utm_content:      data.utm_content      || '',
    page_url:         data.page_url         || '',
    fbclid:           data.fbclid           || ''
  };

  // Send to Google Apps Script → handles Sheet + Email
  const WEBHOOK = process.env.MAKE_WEBHOOK_URL;
  if (WEBHOOK) {
    try {
      const r = await fetch(WEBHOOK, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
      const text = await r.text();
      console.log('Apps Script:', r.status, text);
    } catch(e) {
      console.error('Apps Script error:', e.message);
    }
  } else {
    console.error('No MAKE_WEBHOOK_URL set');
  }

  console.log(JSON.stringify({ts, name: payload.name, campaign: payload.utm_campaign}));
  return res.status(200).json({ok: true});
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}
