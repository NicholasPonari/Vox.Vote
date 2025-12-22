# Face Verification Service

Python Flask service for face verification using face_recognition library.

## Endpoints

- `GET /health` - Health check
- `POST /verify` - Verify face match between selfie and ID photo

### POST /verify Request Body
```json
{
  "selfie_url": "https://...",
  "id_photo_url": "https://..."
}
```

### Response
```json
{
"verified": true,
"face_match_score": 0.782,
"ocr_data": {
"detected": true,
"confidence": 0.85,
"first_name": "NICHOLAS",
"last_name": "PONARI",
"address": "5150 RUE BUCHAN 3809, MONTREAL, H4P 0A9",
"address_line1": "5150 RUE BUCHAN 3809",
"address_city": "MONTREAL",
"address_postal": "H4P 0A9"
},
"reason": "Face match successful"
}

{
"verified": false,
"face_match_score": 0.32,
"ocr_data": {
"detected": true,
"confidence": 0.85,
"first_name": "NICHOLAS",
"last_name": "PONARI",
"address": "5150 RUE BUCHAN 3809, MONTREAL, H4P 0A9",
"address_line1": "5150 RUE BUCHAN 3809",
"address_city": "MONTREAL",
"address_postal": "H4P 0A9"
},
"reason": "Face match score too low"
}

{
"verified": false,
"face_match_score": 0.0,
"ocr_data": {
"detected": false,
"confidence": 0.0,
"first_name": null,
"last_name": null,
"address": null,
"address_line1": null,
"address_city": null,
"address_postal": null,
"note": "Face matching failed"
},
"reason": "No face detected in selfie"
}
```

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
python app.py
```

## Railway Deployment

1. Install Railway CLI:
```bash
npm i -g @railway/cli
```

2. Login to Railway:
```bash
railway login
```

3. Initialize project:
```bash
railway init
```

4. Deploy:
```bash
railway up
```

5. Get the public URL:
```bash
railway domain
```

The service will automatically use Railway's `PORT` environment variable.

## Environment Variables

- `PORT` - Port to run the service on (default: 8080, Railway sets this automatically)

## Memory Optimization

This service is optimized for low-memory environments (512MB - 1GB):

1. **Single worker with threads** - Uses 1 Gunicorn worker with 2 threads to minimize memory usage
2. **Image resizing** - Automatically resizes images to max 1024px before processing
3. **Aggressive garbage collection** - Cleans up image data immediately after use
4. **Worker recycling** - Workers restart after 100 requests to prevent memory leaks
5. **Request size limit** - Max 16MB request size

### Recommended Railway/Docker Memory Settings

- **Minimum**: 512MB RAM
- **Recommended**: 1GB RAM
- **Production**: 2GB RAM (for headroom)

If you encounter OOM (Out of Memory) errors:
1. Ensure your deployment has at least 512MB RAM allocated
2. Check image sizes - very large images may still cause issues
3. Monitor memory usage with `railway logs` or container metrics

## Notes

- Face match threshold is set to 0.4 (40% confidence)
- Images are downloaded from public URLs (Supabase Storage)
- Images are automatically resized to 1024px max dimension to reduce memory usage
- Service uses gunicorn with 1 worker, 2 threads, and 120s timeout for production
