/* Where the website sends new leads (booking requests and free-report requests).
   The forms send to /api/lead (see api/lead.js), which saves the lead to your CRM and emails your team.
   If the settings in Vercel are missing, the forms show an error and nothing is lost silently. */
window.DN_CONFIG = { leadEndpoint: "/api/lead" };
