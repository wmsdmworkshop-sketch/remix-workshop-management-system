#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# DWIP Enterprise ERP — Google Cloud Foundation Setup Script
# Version:   RC1.1
# Target:    Google Cloud Platform — asia-south1 (Mumbai)
# ═══════════════════════════════════════════════════════════════
# USAGE:
#   chmod +x deployment/setup-gcp.sh
#   ./deployment/setup-gcp.sh --project=YOUR_PROJECT_ID
#
# PREREQUISITES:
#   - gcloud CLI installed and authenticated (gcloud auth login)
#   - Billing account linked to the project
#   - Owner or Editor role on the project
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Configuration ────────────────────────────────────────────
PROJECT_ID="${DWIP_PROJECT_ID:-}"
REGION="asia-south1"
REPO_NAME="dwip-images"
PILOT_SERVICE="dwip-pilot"
PROD_SERVICE="dwip-prod"
CLOUD_RUN_SA="dwip-cloudrun-sa"
CLOUDBUILD_SA_EMAIL=""   # Set after project lookup

# ─── Parse Arguments ──────────────────────────────────────────
for arg in "$@"; do
  case $arg in
    --project=*) PROJECT_ID="${arg#*=}" ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

if [[ -z "$PROJECT_ID" ]]; then
  echo "❌ ERROR: Project ID is required."
  echo "   Usage: ./setup-gcp.sh --project=YOUR_PROJECT_ID"
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo " DWIP GCP Foundation Setup"
echo " Project:  $PROJECT_ID"
echo " Region:   $REGION"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ─── Set Active Project ───────────────────────────────────────
echo "▶ [1/10] Setting active GCP project..."
gcloud config set project "$PROJECT_ID"

# ─── Enable Required APIs ─────────────────────────────────────
echo "▶ [2/10] Enabling required GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudlogging.googleapis.com \
  monitoring.googleapis.com \
  iam.googleapis.com \
  --project="$PROJECT_ID"
echo "  ✅ APIs enabled."

# ─── Artifact Registry Repository ────────────────────────────
echo "▶ [3/10] Creating Artifact Registry repository..."
if gcloud artifacts repositories describe "$REPO_NAME" \
    --project="$PROJECT_ID" --location="$REGION" &>/dev/null; then
  echo "  ℹ️  Repository '$REPO_NAME' already exists — skipping."
else
  gcloud artifacts repositories create "$REPO_NAME" \
    --repository-format=docker \
    --location="$REGION" \
    --description="DWIP Enterprise ERP container images" \
    --project="$PROJECT_ID"
  echo "  ✅ Artifact Registry repository created: $REPO_NAME"
fi

# ─── Cloud Run Service Account ────────────────────────────────
echo "▶ [4/10] Creating Cloud Run service account..."
CLOUD_RUN_SA_EMAIL="${CLOUD_RUN_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
if gcloud iam service-accounts describe "$CLOUD_RUN_SA_EMAIL" \
    --project="$PROJECT_ID" &>/dev/null; then
  echo "  ℹ️  Service account already exists — skipping."
else
  gcloud iam service-accounts create "$CLOUD_RUN_SA" \
    --display-name="DWIP Cloud Run Service Account" \
    --description="Runs the DWIP ERP container on Cloud Run" \
    --project="$PROJECT_ID"
  echo "  ✅ Service account created: $CLOUD_RUN_SA_EMAIL"
fi

# Grant Secret Manager accessor role
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CLOUD_RUN_SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" \
  --condition=None
echo "  ✅ Granted secretmanager.secretAccessor to Cloud Run SA."

# Grant Cloud SQL client (for future Cloud SQL migration)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CLOUD_RUN_SA_EMAIL}" \
  --role="roles/cloudsql.client" \
  --condition=None
echo "  ✅ Granted cloudsql.client to Cloud Run SA."

# ─── Cloud Build Service Account Permissions ─────────────────
echo "▶ [5/10] Configuring Cloud Build permissions..."
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
CLOUDBUILD_SA_EMAIL="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Cloud Build needs to deploy to Cloud Run (least privilege: developer, not admin)
# roles/run.developer allows deploy+update but NOT delete — GCP-002 security hardening
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CLOUDBUILD_SA_EMAIL}" \
  --role="roles/run.developer" \
  --condition=None

# Cloud Build needs to push to Artifact Registry
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CLOUDBUILD_SA_EMAIL}" \
  --role="roles/artifactregistry.writer" \
  --condition=None

# Cloud Build needs to act as the Cloud Run service account
gcloud iam service-accounts add-iam-policy-binding "$CLOUD_RUN_SA_EMAIL" \
  --member="serviceAccount:${CLOUDBUILD_SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser" \
  --project="$PROJECT_ID"

echo "  ✅ Cloud Build permissions configured."

# ─── Secret Manager — Create Secrets ─────────────────────────
echo "▶ [6/10] Creating Secret Manager secrets..."

create_secret() {
  local SECRET_NAME="$1"
  local DESCRIPTION="$2"
  if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &>/dev/null; then
    echo "  ℹ️  Secret '$SECRET_NAME' already exists — skipping creation."
  else
    gcloud secrets create "$SECRET_NAME" \
      --replication-policy="automatic" \
      --labels="app=dwip,env=rc1" \
      --project="$PROJECT_ID"
    echo "  ✅ Created secret: $SECRET_NAME  (→ $DESCRIPTION)"
  fi
}

create_secret "DWIP_JWT_SECRET"          "JWT signing secret for employee tokens"
create_secret "DWIP_CUSTOMER_JWT_SECRET" "JWT signing secret for customer portal tokens"
create_secret "DWIP_DB_HOST"             "MySQL database host (Cloud SQL)"
create_secret "DWIP_DB_USER"             "MySQL database username"
create_secret "DWIP_DB_PASSWORD"         "MySQL database password"
create_secret "DWIP_DB_DATABASE"         "MySQL database name"
create_secret "DWIP_GEMINI_API_KEY"      "Google Gemini API key (optional)"

echo ""
echo "  ⚠️  IMPORTANT: Secret shells have been created but contain NO VALUES."
echo "  You MUST set each secret value now. Run:"
echo ""
echo "    echo -n 'YOUR_VALUE' | gcloud secrets versions add DWIP_JWT_SECRET          --data-file=- --project=$PROJECT_ID"
echo "    echo -n 'YOUR_VALUE' | gcloud secrets versions add DWIP_CUSTOMER_JWT_SECRET --data-file=- --project=$PROJECT_ID"
echo "    echo -n 'YOUR_VALUE' | gcloud secrets versions add DWIP_DB_HOST             --data-file=- --project=$PROJECT_ID"
echo "    echo -n 'YOUR_VALUE' | gcloud secrets versions add DWIP_DB_USER             --data-file=- --project=$PROJECT_ID"
echo "    echo -n 'YOUR_VALUE' | gcloud secrets versions add DWIP_DB_PASSWORD         --data-file=- --project=$PROJECT_ID"
echo "    echo -n 'YOUR_VALUE' | gcloud secrets versions add DWIP_DB_DATABASE         --data-file=- --project=$PROJECT_ID"
echo "    echo -n 'YOUR_VALUE' | gcloud secrets versions add DWIP_GEMINI_API_KEY      --data-file=- --project=$PROJECT_ID"
echo ""

# ─── Create Cloud Run Services (empty — deployed via Cloud Build) ─
echo "▶ [7/10] Pre-creating Cloud Run service placeholders..."
# We use --no-traffic so no actual requests go to placeholder
# The real deploy happens via Cloud Build / cloudbuild.yaml

# Create pilot service placeholder
if ! gcloud run services describe "$PILOT_SERVICE" --region="$REGION" --project="$PROJECT_ID" &>/dev/null; then
  echo "  ℹ️  Pilot service will be created on first Cloud Build deploy."
else
  echo "  ℹ️  Pilot service already exists."
fi

if ! gcloud run services describe "$PROD_SERVICE" --region="$REGION" --project="$PROJECT_ID" &>/dev/null; then
  echo "  ℹ️  Prod service will be created on first manual prod deploy."
else
  echo "  ℹ️  Prod service already exists."
fi

# ─── Cloud Build Trigger ─────────────────────────────────────
echo "▶ [8/10] Creating Cloud Build trigger (push to main → pilot deploy)..."
if gcloud builds triggers describe "dwip-deploy-pilot" --project="$PROJECT_ID" &>/dev/null; then
  echo "  ℹ️  Trigger 'dwip-deploy-pilot' already exists — skipping."
else
  gcloud builds triggers create github \
    --name="dwip-deploy-pilot" \
    --repo-name="remix-workshop-management-system" \
    --repo-owner="wmsdmworkshop-sketch" \
    --branch-pattern="^main$" \
    --build-config="deployment/cloudbuild.yaml" \
    --substitutions="_REGION=${REGION},_REPO_NAME=${REPO_NAME},_CLOUD_RUN_SA=${CLOUD_RUN_SA_EMAIL}" \
    --description="Auto-deploy DWIP to pilot on push to main" \
    --project="$PROJECT_ID"
  echo "  ✅ Cloud Build trigger created."
fi

# ─── Uptime Monitoring ───────────────────────────────────────
echo "▶ [9/10] NOTE: Uptime check will be configured post-first-deploy."
echo "   After first deploy, run:"
echo "   gcloud monitoring uptime-checks create http dwip-pilot-uptime \\"
echo "     --display-name='DWIP Pilot Health Check' \\"
echo "     --uri='https://PILOT_URL/api/health' \\"
echo "     --period=60 \\"
echo "     --project=$PROJECT_ID"

# ─── Summary ─────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo " ▶ [10/10] GCP Foundation Setup COMPLETE"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  Project ID:        $PROJECT_ID"
echo "  Region:            $REGION"
echo "  Artifact Registry: ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"
echo "  Cloud Run SA:      $CLOUD_RUN_SA_EMAIL"
echo "  Cloud Build SA:    $CLOUDBUILD_SA_EMAIL"
echo ""
echo "  ⚠️  NEXT STEPS (REQUIRED BEFORE FIRST DEPLOY):"
echo "  1. Set all Secret Manager secret VALUES (see above)"
echo "  2. Connect GitHub repo to Cloud Build"
echo "     → https://console.cloud.google.com/cloud-build/triggers"
echo "  3. Push to main branch to trigger first build"
echo "  4. Verify pilot service URL in Cloud Run console"
echo "  5. Configure uptime check with pilot URL"
echo ""
echo "  📖 Full guide: deployment/CLOUD_RUN_SETUP.md"
echo ""
