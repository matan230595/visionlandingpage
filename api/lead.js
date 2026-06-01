export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});

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

  // 1. Facebook Conversions API (CAPI) — server-side, bypasses ad blockers
  const PIXEL_ID  = '434905002786379';
  const CAPI_TOKEN = process.env.FB_CAPI_TOKEN || 'EAAVMMLQDypUBRi68bZBXr8TBah1XKmfjKQb503cMKms4WguQq8dDLIBS6kNpZB1nVmMcSHjeswVMjIgofmS6ZBnPd0O188e36gTlZA4EsdX4kVX2p5ZBeMwY9bXOxGE68eBHLqyQZB72OzaKOFN9ZCP9fuCYMMU3myyuY49tUq9VlrLTJ6VjAcVqFvmGCTuIQZDZD';
  if (CAPI_TOKEN) {
    try {
      // Hash helper (SHA256)
      const { createHash } = await import('crypto');
      const hash = (v) => v ? createHash('sha256').update(v.trim().toLowerCase()).digest('hex') : undefined;

      const capiBody = {
        test_event_code: 'TEST73652',  // Remove after verification
        data: [{
          event_name:  'Lead',
          event_time:  Math.floor(Date.now() / 1000),
          event_source_url: payload.page_url || 'https://vision-landing-pages.vercel.app',
          action_source: 'website',
          user_data: {
            em:  hash(payload.email),
            ph:  hash(payload.phone?.replace(/\D/g, '')),
            fn:  hash(payload.name?.split(' ')[0]),
            ln:  hash(payload.name?.split(' ').slice(1).join(' ')),
            fbc: payload.fbclid ? `fb.1.${Date.now()}.${payload.fbclid}` : undefined,
          },
          custom_data: {
            form_source:  payload.form_source,
            series:       payload.series,
            campaign:     payload.utm_campaign,
            ad_content:   payload.utm_content,
            damage_type:  payload.damage_type,
          }
        }]
      };

      // Remove undefined fields
      capiBody.data[0].user_data = Object.fromEntries(
        Object.entries(capiBody.data[0].user_data).filter(([,v]) => v !== undefined)
      );

      const capiRes = await fetch(
        `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${CAPI_TOKEN}`,
        { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(capiBody) }
      );
      const capiJson = await capiRes.json();
      console.log('CAPI:', capiRes.status, JSON.stringify(capiJson).substring(0, 100));
    } catch(e) { console.error('CAPI error:', e.message); }
  } else {
    console.log('CAPI: no FB_CAPI_TOKEN set — skipping');
  }

  // 2. Apps Script → Gmail + Google Sheets
  const APPS_SCRIPT = 'https://script.google.com/macros/s/AKfycbw3HM090vf85ch3QmKHfGVzYT0KxM7EXYT6v462yG9vHYPqaws83tRLT88PNhJveyDM/exec';
  try {
    const r = await fetch(APPS_SCRIPT, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      redirect: 'follow',
      body: JSON.stringify(payload)
    });
    const text = await r.text();
    console.log('Apps Script:', r.status, text.substring(0, 80));
  } catch(e) { console.error('Apps Script error:', e.message); }

  // 3. Make → Google Sheets backup
  const MAKE = 'https://hook.us2.make.com/8412n8tqeejvdj1nxxkp6aor269xcms9';
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
