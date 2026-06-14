Déploiement manuel — Frontend + Admin Server

Prérequis
- `gcloud` CLI installé et authentifié
- `firebase-tools` installé et connecté (`firebase login`)
- Projet GCP / Firebase configuré

1) Déployer le frontend (Firebase Hosting)

Build & deploy:
```bash
# depuis la racine du repo
npm ci
npm run build
firebase deploy --only hosting --token "$FIREBASE_TOKEN"
```

2) Déployer l'admin-server sur Cloud Run (manuel)

Remplacez `PROJECT_ID`, `REGION` et `SERVICE_ACCOUNT_EMAIL` selon votre projet.

```bash
# Build et push vers Container Registry
gcloud builds submit --tag gcr.io/PROJECT_ID/admin-server:latest ./admin-server

# Déployer sur Cloud Run
gcloud run deploy admin-server \
  --image gcr.io/PROJECT_ID/admin-server:latest \
  --region REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "ADMIN_SERVER_KEY=change-me,PARTNER_RECEIVER_EMAIL=niongoagency@gmail.com,NOTIFICATIONS_FROM_EMAIL=no-reply@les-volants-d-or.org"
```

Notes
- Pour la variable `SERVICE_ACCOUNT_KEY` préférez lier un compte de service Cloud Run plutôt que d'envoyer le JSON en clair.
- Pour `RESEND_API_KEY`, stockez la clé dans Secret Manager ou GitHub Secrets et injectez-la via la console Cloud Run ou `--set-secrets`.
- GitHub Actions workflow déjà ajouté: `.github/workflows/deploy.yml`. Assurez-vous d'ajouter les secrets `FIREBASE_TOKEN`, `GCP_SA_KEY`, `GCP_PROJECT`, `GCP_REGION`.

Test local rapide (Docker)
```bash
# build image locale
docker build -t admin-server:local ./admin-server
# run with env file
docker run --env-file admin-server/.env.example -p 3000:3000 admin-server:local
```
