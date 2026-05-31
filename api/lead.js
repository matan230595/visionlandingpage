export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});

  // Parse body — Vercel auto-parses JSON but NOT multipart FormData
  // The landing pages send FormData, so we need to parse it manually
  let data = {};
  try {
    const ct = req.headers['content-type'] || '';
    if (ct.includes('application/json')) {
      data = req.body || {};
    } else if (ct.includes('application/x-www-form-urlencoded')) {
      const raw = await readBody(req);
      data = Object.fromEntries(new URLSearchParams(raw));
    } else {
      // multipart/form-data — parse manually
      const raw = await readBody(req);
      // Try as URL-encoded first, then JSON
      try { data = Object.fromEntries(new URLSearchParams(raw)); } catch {}
      if (!data.name) {
        try { data = JSON.parse(raw); } catch {}
      }
    }
  } catch(e) {
    data = req.body || {};
  }

  const ts = new Date().toLocaleString('en-US', {timeZone:'America/New_York'});
  const name     = data.name             || 'Unknown';
  const phone    = data.phone            || 'N/A';
  const email    = data.email            || 'N/A';
  const page     = data.page_title       || data.page || 'Vision Landing Page';
  const campaign = data.utm_campaign     || 'direct';
  const content  = data.utm_content      || '';
  const fbclid   = data.fbclid          || '';
  const damage   = data.damage_type     || data.interest || '';
  const insurance= data.insurance_status || '';
  const url      = data.page_url         || '';

  const subject = `\uD83D\uDD14 New Lead \u2014 ${page}`;
  const body = [
    `NEW LEAD \u2014 Vision Aluminum & Glass`,
    `Submitted: ${ts}`,
    ``,
    `CONTACT`,
    `Name:    ${name}`,
    `Phone:   ${phone}`,
    `Email:   ${email}`,
    ``,
    `DETAILS`,
    `Type:    ${damage}`,
    `Status:  ${insurance}`,
    ``,
    `AD TRACKING`,
    `Campaign: ${campaign}`,
    `Content:  ${content}`,
    `FB Click: ${fbclid}`,
    `Page:     ${url}`,
  ].join('\n');

  const errors = [];

  // 1. Send email via Resend
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (RESEND_KEY) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({
          from: 'Vision Leads <onboarding@resend.dev>',
          to: ["matan230595@gmail.com"],
          subject,
          text: body
        })
      });
      const rjText = await r.text();
      console.log('Resend status:', r.status, 'body:', rjText);
      if (!r.ok) errors.push(`email: ${r.status} ${rjText}`);
      else console.log('Email sent OK:', rjText);
    } catch(e) { errors.push(`email: ${e.message}`); }
  } else {
    errors.push('email: no RESEND_API_KEY');
  }

  // 2. Post to Google Apps Script webhook (-> Google Sheets)
  const MAKE_URL = process.env.MAKE_WEBHOOK_URL;
  if (MAKE_URL) {
    try {
      const r = await fetch(MAKE_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          timestamp: ts, name, phone, email,
          page, damage_type: damage, insurance_status: insurance,
          utm_campaign: campaign, utm_content: content,
          page_url: url, fbclid
        })
      });
      console.log('Sheets webhook:', r.status);
    } catch(e) { errors.push(`sheets: ${e.message}`); }
  }

  console.log(JSON.stringify({ts, name, phone, campaign, errors}));
  return res.status(200).json({ok: true, errors});
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}
