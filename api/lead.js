/* Receives every website form (free review request + free report request),
   1) sends it to your CRM (if CRM_WEBHOOK_URL is set), and
   2) emails it to your team right away (if RESEND_API_KEY + NOTIFY_EMAILS are set).
   Settings live in Vercel > Project > Settings > Environment Variables (never in the website files). */

const FIELDS = {
  'website-booking': { label: 'New Consultation Request', keys: ['name','business','phone','email','industry','best_time','notes'] },
  'website-report':  { label: 'New Research Request',  keys: ['name','business','email','phone','website_url','maps_url'] }
};
const NAMES = { name:'Name', business:'Business', phone:'Phone', email:'Email', industry:'Type of business', best_time:'Best time to call',
  notes:'Notes', website_url:'Website', maps_url:'Google Maps profile' };

const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean = (v, n = 1500) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({ ok:false, error:'POST only' })); }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const type = body && FIELDS[body.source];
  if (!type) { res.statusCode = 400; return res.end(JSON.stringify({ ok:false, error:'Unknown form' })); }

  const lead = { source: body.source, form: type.label };
  for (const k of type.keys) lead[k] = clean(body[k]);
  lead.page = clean(body.page, 500);
  lead.submitted_at = new Date().toISOString();

  const need = type.keys.filter(k => !['notes','maps_url','best_time'].includes(k));
  if (need.some(k => !lead[k]) || !/^\S+@\S+\.\S+$/.test(lead.email)) {
    res.statusCode = 400; return res.end(JSON.stringify({ ok:false, error:'Missing or invalid fields' }));
  }

  const crmOn = !!process.env.CRM_WEBHOOK_URL;
  const mailOn = !!(process.env.RESEND_API_KEY && process.env.NOTIFY_EMAILS);
  if (!crmOn && !mailOn) { res.statusCode = 500; return res.end(JSON.stringify({ ok:false, error:'Not configured' })); }

  /* 1) CRM */
  let crmStatus = 'not configured', crmOk = false;
  if (crmOn) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (process.env.CRM_AUTH) headers.Authorization = process.env.CRM_AUTH;   // e.g. "Bearer abc123"
      const r = await fetch(process.env.CRM_WEBHOOK_URL, { method:'POST', headers, body: JSON.stringify(lead) });
      crmOk = r.ok; crmStatus = r.ok ? 'saved to CRM' : 'CRM FAILED (HTTP ' + r.status + ')';
    } catch (e) { crmStatus = 'CRM FAILED (could not reach it)'; }
  }

  /* 2) Email */
  let mailOk = false;
  if (mailOn) {
    const rows = type.keys.filter(k => lead[k]).map(k => [NAMES[k], lead[k]]);
    const text = type.label + '\n\n' + rows.map(r => r[0] + ': ' + r[1]).join('\n') + '\n\nCRM: ' + crmStatus + '\nSent from: ' + lead.page + '\nAt: ' + lead.submitted_at;
    const html = '<div style="font-family:Arial,sans-serif;font-size:15px;color:#172a4d"><h2 style="margin:0 0 12px">' + esc(type.label) + '</h2>' +
      '<table cellpadding="6" style="border-collapse:collapse">' + rows.map(r => '<tr><td style="color:#5d6c85;vertical-align:top">' + esc(r[0]) + '</td><td><b>' + esc(r[1]) + '</b></td></tr>').join('') + '</table>' +
      '<p style="color:#5d6c85;font-size:13px;margin-top:16px">CRM: ' + esc(crmStatus) + '<br>' + esc(lead.submitted_at) + '</p></div>';
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method:'POST',
        headers: { 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.MAIL_FROM || 'Double Nine Leads <onboarding@resend.dev>',
          to: process.env.NOTIFY_EMAILS.split(',').map(s => s.trim()).filter(Boolean),
          reply_to: lead.email,
          subject: type.label,
          html, text
        })
      });
      mailOk = r.ok;
    } catch (e) { mailOk = false; }
  }

  if (crmOk || mailOk) { res.statusCode = 200; return res.end(JSON.stringify({ ok:true })); }
  res.statusCode = 502; return res.end(JSON.stringify({ ok:false, error:'Could not deliver' }));
};
