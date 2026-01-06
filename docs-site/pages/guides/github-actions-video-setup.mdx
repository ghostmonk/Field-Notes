# GitHub Actions Video Processing Setup

## Overview

Your GitHub Actions deployment workflow has been enhanced to automatically deploy the video processing Cloud Function alongside your existing backend and frontend deployments.

## Required GCP Service Account Permissions

Your existing service account (`${{ vars.GCP_SERVICE_ACCOUNT_NAME }}`) needs additional IAM roles for Cloud Functions deployment:

```bash
# Add Cloud Functions permissions to existing service account
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:YOUR_SERVICE_ACCOUNT@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudfunctions.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:YOUR_SERVICE_ACCOUNT@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/transcoder.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:YOUR_SERVICE_ACCOUNT@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/eventarc.admin"
```

## Required APIs

Enable these APIs in your GCP project:

```bash
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable transcoder.googleapis.com
gcloud services enable videointelligence.googleapis.com
gcloud services enable eventarc.googleapis.com
```

## GitHub Secrets/Variables Check

Ensure you have all required GitHub repository secrets and variables configured:

### Repository Variables (Settings → Secrets and variables → Actions → Variables)
- `GCP_PROJECT_ID` - Your GCP project ID
- `GCP_SERVICE_ACCOUNT_NAME` - Service account email
- `MONGO_HOST` - MongoDB cluster host
- `MONGO_DB_NAME` - Database name 
- `MONGO_APP_NAME` - MongoDB app name
- `MONGO_CLUSTER` - MongoDB cluster name
- `GCS_BUCKET_NAME` - Google Cloud Storage bucket name
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `NEXTAUTH_URL` - Your frontend URL
- `NEXT_PUBLIC_API_URL` - Your backend API URL
- `NEXTAUTH_DEBUG` - Debug flag (true/false)
- `UNSAFE_EVAL` - CSP flag (true/false)

### Repository Secrets (Settings → Secrets and variables → Actions → Secrets)
- `GCP_SERVICE_ACCOUNT_KEY` - Service account key JSON
- `GCP_SERVICE_ACCOUNT_JSON` - Service account JSON (for base64 encoding)
- `MONGO_USER` - MongoDB username
- `MONGO_PASSWORD` - MongoDB password
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `NEXTAUTH_SECRET` - NextAuth.js secret

## Deployment Flow

When you push to `main`, the workflow will:

1. **Deploy Backend** (existing)
   - Build and deploy to Cloud Run
   - Configure environment variables

2. **Deploy Frontend** (existing)
   - Build and deploy to Cloud Run
   - Configure public access

3. **Deploy Video Processor** (new)
   - Deploy Cloud Function with GCS trigger
   - Configure environment variables from secrets
   - Set up event filters for your bucket

## Verification

After deployment, verify the Cloud Function is working:

```bash
# Check function status
gcloud functions describe video-processor --region=us-central1

# View function logs
gcloud functions logs read video-processor --region=us-central1 --limit=10
```

## Monitoring

The deployed function will:
- Automatically trigger when videos are uploaded to GCS
- Create processing jobs in MongoDB
- Update job status as processing completes
- Handle errors gracefully with logging

## Cost Monitoring

Set up billing alerts in GCP Console:
- Transcoder API usage
- Cloud Functions invocations
- Storage costs

## Next Deployment

Simply push your changes to `main` and the entire stack (backend, frontend, video processor) will be deployed automatically!

```bash
git add .
git commit -m "Add video processing pipeline"
git push origin main
```

The GitHub Actions workflow will handle everything - no manual Cloud Function deployment needed.

