// No crypto import needed - using WebCrypto API

const PIXEL_ID   = '434905002786379';
const CAPI_TOKEN = 'EAAVMMLQDypUBRi68bZBXr8TBah1XKmfjKQb503cMKms4WguQq8dDLIBS6kNpZB1nVmMcSHjeswVMjIgofmS6ZBnPd0O188e36gTlZA4EsdX4kVX2p5ZBeMwY9bXOxGE68eBHLqyQZB72OzaKOFN9ZCP9fuCYMMU3myyuY49tUq9VlrLTJ6VjAcVqFvmGCTuIQZDZD';
const APPS_SCRIPT = 'https://script.google.com/macros/s/AKfycbw3HM090vf85ch3QmKHfGVzYT0KxM7EXYT6v462yG9vHYPqaws83tRLT88PNhJveyDM/exec';
const MAKE        = 'https://hook.us2.make.com/8412n8tqeejvdj1nxxkp6aor269xcms9';

async function sha256(v) {
  if (!v) return undefined;
  const enc = new TextEncoder().encode(v.trim().toLowerCase());
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});

  // Parse body
  let data = {};
  try {
    const raw = await readBody(req);
    try { data = JSON.parse(raw); } catch {}
    if (!data.name) { try { data = Object.fromEntries(new URLSearchParams(raw)); } catch {} }
  } catch(e) { data = req.body || {}; }

  const ts = new Date().toLocaleString('en-US', {timeZone:'America/New_York'});
  const payload = {
    timestamp:        ts,
    name:             data.name             || '',
    phone:            data.phone            || '',
    email:            data.email            || '',
    form_source:      data.form_source      || 'Vision Landing Page',
    series:           data.series           || '',
    damage_type:      data.damage_type      || data.interest || '',
    insurance_status: data.insurance_status || '',
    damage_date:      data.damage_date      || '',
    utm_campaign:     data.utm_campaign     || 'direct',
    utm_content:      data.utm_content      || '',
    utm_source:       data.utm_source       || '',
    page_url:         data.page_url         || '',
    fbclid:           data.fbclid           || ''
  };

  console.log('Lead:', payload.name, '|', payload.form_source, '|', payload.utm_campaign);

  // 1. Facebook CAPI — server-side Lead event
  try {
    console.log('CAPI: sending...');
    const ud = {};
    if (payload.email) ud.em = await sha256(payload.email);
    if (payload.phone) ud.ph = await sha256(payload.phone.replace(/\D/g, ''));
    if (payload.name)  { ud.fn = await sha256(payload.name.split(' ')[0]); }
    if (payload.fbclid) ud.fbc = `fb.1.${Date.now()}.${payload.fbclid}`;

    const body = {
      data: [{
        event_name:       'Lead',
        event_time:       Math.floor(Date.now() / 1000),
        event_source_url: payload.page_url || 'https://vision-landing-pages.vercel.app',
        action_source:    'website',
        user_data:        ud,
        custom_data: {
          form_source: payload.form_source,
          series:      payload.series,
          campaign:    payload.utm_campaign,
          ad_content:  payload.utm_content,
        }
      }]
    };

    const r = await fetch(
      `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${CAPI_TOKEN}`,
      { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) }
    );
    const j = await r.json();
    console.log('CAPI result:', r.status, JSON.stringify(j).substring(0, 150));
  } catch(e) {
    console.error('CAPI error:', e.message);
  }

  // 2. Apps Script → Gmail + Google Sheets
  try {
    const r = await fetch(APPS_SCRIPT, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      redirect: 'follow',
      body: JSON.stringify(payload)
    });
    console.log('Apps Script:', r.status);
  } catch(e) { console.error('Apps Script error:', e.message); }

  // 3. Make → Google Sheets backup
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
