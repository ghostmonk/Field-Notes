# Container-based Video Processing Setup Guide - Phase 2

This guide covers setting up the cost-effective video processing pipeline using FFmpeg in containerized Google Cloud Functions.

## Prerequisites

1. **Google Cloud Project** with the following APIs enabled:
   - Cloud Functions API
   - Cloud Storage API
   - (No expensive Transcoder API needed!)

2. **Service Account** with permissions:
   - Storage Object Admin (for GCS access)  
   - Cloud Functions Developer
   - (No Transcoder permissions needed!)

3. **Environment Variables** configured:
   - `GCS_BUCKET_NAME`: Your Google Cloud Storage bucket
   - `MONGODB_URI`: MongoDB Atlas connection string
   - `API_BASE_URL`: Your backend API URL

## Setup Steps

### 1. Enable Required APIs

**Before pushing to main**, ensure these APIs are enabled in your GCP project:

```bash
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable eventarc.googleapis.com
# No expensive APIs needed! 💰
```

**Note**: Your existing GitHub Actions service account needs additional permissions for Cloud Functions deployment.

### 2. Create Service Account

```bash
# Create service account
gcloud iam service-accounts create video-processor \
    --display-name="Video Processor" \
    --description="Service account for video processing functions"

# Grant necessary permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:video-processor@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"

# No transcoder permissions needed - FFmpeg runs locally in the function!
```

### 3. Deploy via GitHub Actions

The Cloud Function is automatically deployed via your existing GitHub Actions workflow when you push to the `main` branch.

**Required GitHub Secrets/Variables:**
- `secrets.MONGO_USER` - MongoDB username
- `secrets.MONGO_PASSWORD` - MongoDB password
- `vars.MONGO_HOST` - MongoDB cluster host
- `vars.MONGO_DB_NAME` - Database name
- `vars.MONGO_APP_NAME` - MongoDB app name
- `vars.GCS_BUCKET_NAME` - GCS bucket name
- `vars.NEXT_PUBLIC_API_URL` - Your API base URL
- `vars.GCP_SERVICE_ACCOUNT_NAME` - Service account email

The deployment is integrated into your existing workflow and will:
1. Deploy backend and frontend (existing)
2. Deploy video processing Cloud Function (new)
3. Use the same service account and configuration

### 4. Update Backend Dependencies

Add to `backend/requirements.txt`:
```
motor==3.7.1  # Already exists
```

### 5. Environment Configuration

Add to your backend environment variables:
```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/turbulence
```

## Video Processing Workflow

### 1. Upload Flow
```
User uploads video → FastAPI uploads to GCS → Creates processing job record → Returns immediately
```

### 2. Processing Flow
```
GCS Upload Event → Cloud Function triggered → Video analysis → Transcoding jobs → Thumbnail generation → Status updates
```

### 3. Status Tracking
```
Frontend polls /video-processing/jobs/{job_id} → Shows progress → Displays thumbnails for selection
```

## API Endpoints

### Backend Endpoints (Phase 2)

- `POST /video-processing/jobs` - Create processing job (used by Cloud Function)
- `GET /video-processing/jobs/{job_id}` - Get job status
- `GET /video-processing/jobs` - List jobs
- `PATCH /video-processing/jobs/{job_id}` - Update job (used by Cloud Function)
- `POST /video-processing/jobs/{job_id}/select-thumbnail` - Select thumbnail
- `DELETE /video-processing/jobs/{job_id}` - Delete job

### Usage Examples

**Check video processing status:**
```javascript
const response = await fetch('/api/video-processing/jobs/job_123');
const job = await response.json();
console.log(job.status); // 'pending', 'processing', 'completed', 'failed'
```

**Select a thumbnail:**
```javascript
await fetch('/api/video-processing/jobs/job_123/select-thumbnail', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ thumbnail_id: 'thumb_5s' })
});
```

## Cost Comparison & Optimization

### FFmpeg vs Transcoder API Cost Breakdown

**Google Cloud Transcoder API (OLD):**
- 720p video: $0.030/minute
- 480p video: $0.015/minute  
- Total: $0.045/minute
- **3-minute video**: $0.135
- **10-minute video**: $0.45

**FFmpeg in Cloud Functions (NEW):**
- **Compute only**: ~$0.01-0.05 per video (regardless of length!)
- **3-minute video**: ~$0.02
- **10-minute video**: ~$0.03

### Real Cost Savings
- **95% cost reduction** for typical videos
- **No per-minute charges** - just compute time
- **Perfect for personal blogs** with occasional video uploads

### Cloud Functions Costs
- **Invocations**: $0.40/million (first 2M free monthly)
- **Compute**: ~$0.0125 per GB-second 
- **Memory**: 2GB allocated for video processing
- **Typical processing time**: 30-60 seconds per video

### Monthly Cost Examples
- **2 videos/month**: ~$0.40 (vs $2.40 with Transcoder API)
- **10 videos/month**: ~$2.00 (vs $15.60 with Transcoder API)  
- **50 videos/month**: ~$10.00 (vs $98.50 with Transcoder API)

## Monitoring

### Logs
```bash
# Cloud Function logs
gcloud functions logs read video-processor --limit=50

# Backend logs
kubectl logs -l app=backend -f
```

### Status Dashboard
- Monitor processing jobs in `/video-processing/jobs`
- Set up alerts for failed jobs
- Track transcoding costs in GCP Console

## Troubleshooting

### Common Issues

1. **Cloud Function timeout**: Increase timeout to 540s
2. **Permissions errors**: Check service account IAM roles
3. **MongoDB connection**: Verify connection string and network access
4. **GCS bucket access**: Ensure bucket exists and is accessible

### Debug Commands

```bash
# Test Cloud Function locally
functions-framework --target=process_video

# Check GCS bucket
gsutil ls gs://your-bucket-name/uploads/

# Test API endpoints
curl -X GET "https://api.ghostmonk.com/video-processing/jobs"
```

## Next Phase Enhancements

Phase 3 can include:
- Real-time progress updates via WebSockets
- Advanced thumbnail selection with preview
- Multiple video quality options
- Automatic chapter detection
- Video analytics and engagement metrics

## Security Considerations

- Use signed URLs for video access
- Implement rate limiting on processing endpoints
- Monitor for abuse (large file uploads)
- Set up billing alerts for transcoding costs
