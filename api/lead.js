export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});

  let data = {};
  try {
    // Handle both JSON and FormData
    if (req.headers['content-type']?.includes('application/json')) {
      data = req.body;
    } else {
      data = req.body; // Vercel parses FormData automatically
    }
  } catch(e) {}

  const ts = new Date().toLocaleString('en-US', {timeZone: 'America/New_York'});
  const name = data.name || 'Unknown';
  const phone = data.phone || 'N/A';
  const email = data.email || 'N/A';
  const page = data.page_title || data.source_page || 'Vision Landing Page';
  const campaign = data.utm_campaign || 'direct';
  const content = data.utm_content || '';
  const fbclid = data.fbclid || '';
  const damage = data.damage_type || data.interest || data.damage || '';
  const insurance = data.insurance_status || '';
  const url = data.page_url || '';

  const subject = `New Lead — ${page}`;
  const body = [
    `NEW LEAD — Vision Aluminum & Glass`,
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
          to: ['visionaluminumandglass@gmail.com', 'matan230595@gmail.com'],
          subject,
          text: body
        })
      });
      if (!r.ok) errors.push(`email: ${await r.text()}`);
    } catch(e) { errors.push(`email: ${e.message}`); }
  }

  // 2. Post to Make webhook (→ Google Sheets)
  const MAKE_URL = process.env.MAKE_WEBHOOK_URL;
  if (MAKE_URL) {
    try {
      await fetch(MAKE_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({timestamp:ts, name, phone, email, page, damage_type:damage, insurance_status:insurance, utm_campaign:campaign, utm_content:content, page_url:url, fbclid})
      });
    } catch(e) { errors.push(`sheets: ${e.message}`); }
  }

  // 3. Log for debugging
  console.log(JSON.stringify({ts, name, phone, campaign, errors}));

  return res.status(200).json({ok: true, errors});
}
