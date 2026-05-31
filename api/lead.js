export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});

  let data = {};
  try {
    const raw = await readBody(req);
    console.log('Raw body preview:', raw.substring(0, 300));
    try { data = JSON.parse(raw); } catch {}
    if (!data.name) {
      try { data = Object.fromEntries(new URLSearchParams(raw)); } catch {}
    }
  } catch(e) {
    data = req.body || {};
  }

  const ts = new Date().toLocaleString('en-US', {timeZone:'America/New_York'});
  const payload = {
    timestamp:        ts,
    name:             data.name             || '',
    phone:            data.phone            || '',
    email:            data.email            || '',
    page:             data.page_title       || data.page || 'Vision Landing Page',
    damage_type:      data.damage_type      || data.interest || '',
    insurance_status: data.insurance_status || '',
    utm_campaign:     data.utm_campaign     || 'direct',
    utm_content:      data.utm_content      || '',
    page_url:         data.page_url         || '',
    fbclid:           data.fbclid           || ''
  };

  console.log('Parsed lead:', payload.name, payload.phone, payload.email, payload.damage_type);

  // 1. Apps Script → Sheet + Email
  const APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbw3HM090vf85ch3QmKHfGVzYT0KxM7EXYT6v462yG9vHYPqaws83tRLT88PNhJveyDM/exec";
  try {
    const r = await fetch(APPS_SCRIPT, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      redirect: 'follow',
      body: JSON.stringify(payload)
    });
    const text = await r.text();
    console.log('Apps Script:', r.status, text.substring(0, 150));
  } catch(e) { console.error('Apps Script error:', e.message); }

  // 2. Make → Google Sheets (backup)
  const MAKE = "https://hook.us2.make.com/8412n8tqeejvdj1nxxkp6aor269xcms9";
  try {
    const mr = await fetch(MAKE, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    console.log('Make:', mr.status);
  } catch(e) { console.error('Make error:', e.message); }

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
