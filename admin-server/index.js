const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SERVICE_KEY_PATH = process.env.SERVICE_ACCOUNT_KEY || path.join(__dirname, '..', 'serviceAccountKey.json');
const ADMIN_SERVER_KEY = process.env.ADMIN_SERVER_KEY || process.env.ADMIN_API_KEY || 'dev-key-please-change';
const PORT = process.env.PORT || 3000;

if (!fs.existsSync(SERVICE_KEY_PATH)) {
  console.error('Service account key not found at', SERVICE_KEY_PATH);
  console.error('Set SERVICE_ACCOUNT_KEY env var or place serviceAccountKey.json in the project root.');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_KEY_PATH, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const app = express();
app.use(cors());
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
    try {
      await db.collection('partners').add({ ...partner, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    } catch (e) {
      console.warn('Could not persist partner request to Firestore', e && (e.message || e));
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

if (require.main === module) {
  app.listen(PORT, () => console.log(`Admin server listening on port ${PORT}`));
}

// Debug: return recent sentNotifications
app.get('/last-sent', async (req, res) => {
  try {
    const snaps = await db.collection('sentNotifications').orderBy('sentAt', 'desc').limit(50).get();
    const items = snaps.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json(items);
  } catch (err) {
    console.error('last-sent error', err);
    return res.status(500).json({ error: String(err) });
  }
});

module.exports = app;
