const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const ADMIN_SERVER_KEY = process.env.ADMIN_SERVER_KEY || process.env.ADMIN_API_KEY || 'dev-key-please-change';
const PORT = process.env.PORT || 3000;

// Load service account from multiple possible sources:
// - process.env.SERVICE_ACCOUNT_KEY as raw JSON string
// - process.env.SERVICE_ACCOUNT_KEY as base64-encoded JSON
// - process.env.SERVICE_ACCOUNT_KEY as a filesystem path
// - fallback to ../serviceAccountKey.json file
// - final fallback: application default credentials
let serviceAccount = null;
const envKey = process.env.SERVICE_ACCOUNT_KEY;
if (envKey) {
  const trimmed = envKey.trim();
  // If it looks like JSON, try parse
  if (trimmed.startsWith('{')) {
    try {
      serviceAccount = JSON.parse(trimmed);
    } catch (e) {
      console.warn('SERVICE_ACCOUNT_KEY looks like JSON but failed to parse:', e && e.message);
    }
  }

  // If not parsed, try base64 decode
  if (!serviceAccount) {
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
      if (decoded.trim().startsWith('{')) {
        serviceAccount = JSON.parse(decoded);
      }
    } catch (e) {
      // not base64 or not valid JSON
    }
  }

  // If still not parsed, treat as a path
  if (!serviceAccount && fs.existsSync(envKey)) {
    try {
      serviceAccount = JSON.parse(fs.readFileSync(envKey, 'utf8'));
    } catch (e) {
      console.warn('Failed reading SERVICE_ACCOUNT_KEY file at', envKey, e && e.message);
    }
  }
}

// Try default file path if still not found
const defaultPath = path.join(__dirname, '..', 'serviceAccountKey.json');
if (!serviceAccount && fs.existsSync(defaultPath)) {
  try {
    serviceAccount = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
  } catch (e) {
    console.warn('Failed reading default serviceAccountKey.json:', e && e.message);
  }
}

let db = null;
let adminInitialized = false;
if (serviceAccount) {
  try {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    db = admin.firestore();
    adminInitialized = true;
    console.log('firebase-admin initialized from SERVICE_ACCOUNT_KEY');
  } catch (e) {
    console.error('Failed to initialize firebase-admin with provided service account:', e && e.message);
    db = null;
  }
} else {
  // Do NOT attempt Application Default Credentials automatically in a serverless environment
  // because ADC can throw an unclear error if no Project ID is present. Instead, require
  // a SERVICE_ACCOUNT_KEY env var (base64 JSON recommended) or explicitly opt-in to ADC.
  console.warn('No SERVICE_ACCOUNT_KEY provided — firebase-admin not initialized. Set SERVICE_ACCOUNT_KEY in environment to enable Firestore operations.');
}

const app = express();

// If Vercel routes keep the `/api` prefix, strip it so Express routes match.
app.use((req, res, next) => {
  if (req.url && req.url.startsWith('/api/')) {
    req.url = req.url.replace(/^\/api/, '');
  }
  next();
});

// Simple request logger for debugging in Vercel logs
app.use((req, res, next) => {
  try { console.log('req', req.method, req.url, 'origin=', req.headers && req.headers.origin); } catch (e) {}
  next();
});

// CORS configuration: only allow the frontend origins and localhost for local dev
const allowedOrigins = [
  'https://les-volants-d-or.web.app',
  'https://www.levolantdor.com',
  'https://les-volants-d-or.firebaseapp.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS policy: Origin not allowed'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key']
}));

// Ensure preflight requests are handled
app.options('*', cors());

app.use(bodyParser.json());

// Resend API setup (we call REST API directly using global fetch)
const RESEND_API_KEY = process.env.RESEND_API_KEY || null;

async function sendViaResend({ from, to, subject, html }) {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    const err = new Error(`Resend API error: ${resp.status} ${text}`);
    err.status = resp.status;
    throw err;
  }
  return resp.json();
}

// Simple API key auth middleware
app.use((req, res, next) => {
  // allow unauthenticated health checks and other public probes
  if (req.path === '/health' || req.path === '/.well-known/ready' || req.path === '/.well-known/live') {
    return next();
  }

  const key = req.header('x-api-key') || req.query.api_key;
  if (!key || key !== ADMIN_SERVER_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

// Update vote config and optionally send notifications
app.post('/update-vote', async (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload.votingEnabled === 'undefined') return res.status(400).json({ error: 'payload.votingEnabled required' });
  if (!db) return res.status(500).json({ error: 'Server not configured: missing SERVICE_ACCOUNT_KEY. Set SERVICE_ACCOUNT_KEY in Vercel (base64 JSON recommended).' });

  const newConfig = payload;
  try {
    await db.doc('siteConfig/voteConfig').set(newConfig, { merge: true });

    if (newConfig.votingEnabled) {
      const snaps = await db.collection('voter_notifications').get();
      let success = 0;
      let failed = 0;
      // Send email notifications using Resend (if configured)
      for (const d of snaps.docs) {
        const entry = d.data();
        try {
          // Prepare and send via Resend REST API if configured
          if (RESEND_API_KEY && entry.email) {
            const html = process.env.VOTE_OPEN_HTML || `<p>Le vote est maintenant ouvert. Rendez-vous sur <a href="https://les-volants-d-or.org">les-volants-d-or.org</a> pour voter.</p>`;
            const fromAddress = process.env.NOTIFICATIONS_FROM_EMAIL || 'no-reply@les-volants-d-or.org';
            try {
              const sendResp = await sendViaResend({ from: fromAddress, to: entry.email, subject: process.env.VOTE_OPEN_SUBJECT || "Le vote est ouvert — Les Volants d'Or", html });
              await db.collection('sentNotifications').add({ ...entry, sentAt: admin.firestore.FieldValue.serverTimestamp(), type: 'vote_opened', method: 'email', from: fromAddress, resendResponse: sendResp });
              success++;
              continue;
            } catch (sendErr) {
              console.error('Resend send error', sendErr && (sendErr.message || sendErr));
              // If domain not verified (403), optionally retry with onboarding resending address
              const fallbackFrom = process.env.RESEND_FALLBACK_FROM || 'onboarding@resend.dev';
              if (sendErr && sendErr.status === 403 && fallbackFrom) {
                try {
                  console.log(`Retrying with fallback from ${fallbackFrom}`);
                  const fbResp = await sendViaResend({ from: fallbackFrom, to: entry.email, subject: process.env.VOTE_OPEN_SUBJECT || "Le vote est ouvert — Les Volants d'Or", html });
                  await db.collection('sentNotifications').add({ ...entry, sentAt: admin.firestore.FieldValue.serverTimestamp(), type: 'vote_opened', method: 'email', from: fallbackFrom, fallback: true, resendResponse: fbResp });
                  success++;
                  continue;
                } catch (fbErr) {
                  console.error('Fallback send error', fbErr && (fbErr.message || fbErr));
                }
              }
              // record failed send attempt
              await db.collection('sentNotifications').add({ ...entry, sentAt: admin.firestore.FieldValue.serverTimestamp(), type: 'vote_opened', method: 'email', from: fromAddress, status: 'failed', error: String(sendErr) });
              failed++;
              continue;
            }
          }

          // No RESEND_API_KEY or no email - record as skipped
          await db.collection('sentNotifications').add({ ...entry, sentAt: admin.firestore.FieldValue.serverTimestamp(), type: 'vote_opened', method: 'email', status: 'skipped' });
          failed++;
        } catch (e) {
          console.error('Notification process error', e, entry);
          await db.collection('sentNotifications').add({ ...entry, sentAt: admin.firestore.FieldValue.serverTimestamp(), type: 'vote_opened', method: 'email', status: 'failed', error: String(e) });
          failed++;
        }
      }
      return res.json({ updated: true, notifications: { success, failed } });
    }

    return res.json({ updated: true });
  } catch (err) {
    console.error('update-vote error', err);
    return res.status(500).json({ error: String(err) });
  }
});

// Receive partner requests and optionally send an email to the organiser
app.post('/send-partner-request', async (req, res) => {
  const payload = req.body;
  if (!payload || !payload.partner) return res.status(400).json({ error: 'payload.partner required' });
  const partner = payload.partner;
  try {
    // Persist to Firestore partners collection for record (if available)
    if (db) {
      try {
        await db.collection('partners').add({ ...partner, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      } catch (e) {
        console.warn('Could not persist partner request to Firestore', e && (e.message || e));
      }
    } else {
      console.warn('Skipping Firestore persist for partner request: Firestore not configured');
    }

    // Send email via Resend if configured
    const toAddress = process.env.PARTNER_RECEIVER_EMAIL || 'niongoagency@gmail.com';
    if (RESEND_API_KEY) {
      const fromAddress = process.env.NOTIFICATIONS_FROM_EMAIL || 'no-reply@les-volants-d-or.org';
      const subject = process.env.PARTNER_REQUEST_SUBJECT || `Nouvelle demande de partenariat — ${partner.nomEntreprise || partner.contactNom || 'Société'}`;
      const html = `<p>Nouvelle demande de partenariat reçue :</p>
        <ul>
          <li><strong>Entreprise</strong>: ${partner.nomEntreprise || ''}</li>
          <li><strong>Contact</strong>: ${partner.contactNom || ''}</li>
          <li><strong>Email</strong>: ${partner.email || ''}</li>
          <li><strong>Téléphone</strong>: ${partner.telephone || ''}</li>
          <li><strong>Package</strong>: ${partner.packageSponsor || ''}</li>
        </ul>`;
      try {
        const resp = await sendViaResend({ from: fromAddress, to: toAddress, subject, html });
        await db.collection('sentNotifications').add({ ...partner, sentAt: admin.firestore.FieldValue.serverTimestamp(), type: 'partner_request', method: 'email', from: fromAddress, to: toAddress, resendResponse: resp });
        return res.json({ sent: true, via: 'resend', resp });
      } catch (err) {
        console.error('Error sending partner request email via Resend', err && (err.message || err));
        // Try fallbackFrom if 403
        const fallbackFrom = process.env.RESEND_FALLBACK_FROM || 'onboarding@resend.dev';
        if (err && err.status === 403 && fallbackFrom) {
          try {
            const fb = await sendViaResend({ from: fallbackFrom, to: toAddress, subject, html });
            await db.collection('sentNotifications').add({ ...partner, sentAt: admin.firestore.FieldValue.serverTimestamp(), type: 'partner_request', method: 'email', from: fallbackFrom, to: toAddress, fallback: true, resendResponse: fb });
            return res.json({ sent: true, via: 'resend-fallback', resp: fb });
          } catch (fbErr) {
            console.error('Fallback send error', fbErr && (fbErr.message || fbErr));
          }
        }
        return res.status(502).json({ error: 'failed to send email', details: String(err && (err.message || err)) });
      }
    }

    // If no RESEND_API_KEY configured, respond OK but note not sent
    return res.json({ saved: true, sent: false, reason: 'no-resend-configured' });
  } catch (e) {
    console.error('send-partner-request error', e && (e.message || e));
    return res.status(500).json({ error: String(e && (e.message || e)) });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Admin server listening on port ${PORT}`));
}

// Debug: return recent sentNotifications
app.get('/last-sent', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Server not configured: missing SERVICE_ACCOUNT_KEY' });
    const snaps = await db.collection('sentNotifications').orderBy('sentAt', 'desc').limit(50).get();
    const items = snaps.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json(items);
  } catch (err) {
    console.error('last-sent error', err);
    return res.status(500).json({ error: String(err) });
  }
});

module.exports = app;
