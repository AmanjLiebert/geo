# Seven-day Render teacher demo

This deployment is intentionally a short-lived demo. It uses two Render Free web services, one
Render Free PostgreSQL database, and a separate private Backblaze B2 bucket. It does **not** run
the production media worker or ClamAV. Only the explicitly enabled demo image sanitizer runs in
the API process. The browser calls `/api` on the frontend origin; Next.js proxies those requests
to the API service so the existing secure `SameSite=Lax` session and CSRF cookies remain
same-origin. Do not add a public API base URL to the frontend service.

## What the demo accepts

- JPEG, PNG, and WebP images only.
- Maximum encoded size: 3 MiB.
- Maximum decoded size: 12 million pixels.
- The API fully decodes each upload with Sharp, rejects malformed or animated input, rotates it,
  strips metadata, and writes new WebP display and thumbnail files.
- The uploaded original remains private and is deleted before the database can mark the media
  approved. The visitor site receives only short-lived access to an approved derivative.
- PDF and video upload controls are disabled. The production worker, ClamAV path, and production
  media policy remain unchanged.

## 1. Prepare a separate B2 bucket

1. Create a new **private** bucket, for example `gk-render-demo-amanj-2026`.
2. Create a new application key restricted to that bucket. It needs list/read/write/delete file
   capabilities because the API validates, rewrites, serves, and removes demo objects.
3. Do not reuse the recovery bucket or production media key.
4. Add this S3 CORS rule, replacing the origin if the Render web-service name was changed:

```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["PUT"],
      "AllowedOrigins": ["https://geo-kurdistan-demo-web-amanj.onrender.com"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

The bucket stays private. CORS only permits the browser to use the short-lived signed upload URL;
it does not make any object public.

## 2. Prepare Firebase

1. In Firebase Authentication, add
   `geo-kurdistan-demo-web-amanj.onrender.com` to **Authorized domains**.
2. Keep Google sign-in enabled. Phone sign-in is optional for this demo.
3. Have the existing Firebase web values and service-account JSON ready. Never commit the JSON.

## 3. Create the Render Blueprint

1. Push this branch to the private GitHub repository.
2. In Render, choose **New > Blueprint**, connect the repository, and select `render.yaml`.
3. Render prompts for every value marked `sync: false`. Enter:

| Render key                         | Value                                                            |
| ---------------------------------- | ---------------------------------------------------------------- |
| `AUTH_FIREBASE_PROJECT_ID`         | Firebase project ID                                              |
| `MEDIA_STORAGE_ENDPOINT`           | B2 S3 endpoint, such as `https://s3.us-east-005.backblazeb2.com` |
| `MEDIA_STORAGE_REGION`             | Region from that endpoint, such as `us-east-005`                 |
| `MEDIA_STORAGE_BUCKET`             | The new private demo bucket                                      |
| `MEDIA_STORAGE_KEY_ID`             | The restricted demo application-key ID                           |
| `MEDIA_STORAGE_APPLICATION_KEY`    | The restricted demo application key                              |
| `NEXT_PUBLIC_FIREBASE_API_KEY`     | Firebase web API key                                             |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain                                             |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`  | Firebase project ID                                              |
| `NEXT_PUBLIC_FIREBASE_APP_ID`      | Firebase web app ID                                              |

4. Create the Blueprint. Render Free does not support pre-deploy commands, so the API container
   runs migrations and the idempotent seed before starting NestJS whenever
   `DEPLOYMENT_PROFILE=demo`. A migration or seed failure stops the container instead of starting
   against an unknown schema. There is no worker or ClamAV service in this demo Blueprint.
5. On the API service, open **Environment > Secret Files**. Add a file named
   `firebase-service-account.json` containing the service-account JSON. It is mounted at
   `/etc/secrets/firebase-service-account.json`.
6. Redeploy the API after adding the secret file. Wait for `/health/ready` to return 200, then
   redeploy the web service so its Firebase values and same-origin `/api` proxy destination are
   baked into the Next.js build.

If either service name is changed, also update the two URLs and `CORS_ORIGINS` in `render.yaml`,
the B2 CORS origin, and the Firebase authorized domain before deploying.

## 4. Create the first demo administrator

Render Free has no shell. Use the database's **External Database URL** once from the local
`backend` folder. Keep the existing local environment file loaded, then temporarily override only
these values in PowerShell:

```powershell
$env:DATABASE_URL = '<Render External Database URL>'
$env:DATABASE_SSL = 'true'
$env:DEPLOYMENT_PROFILE = 'demo'
$env:MEDIA_DEMO_IMAGE_PROCESSING_ENABLED = 'true'
$env:INITIAL_ADMIN_EMAIL = '<the exact Google email used for the demo>'
npm run auth:create-initial-admin
```

Copy the invitation token shown once. Open:

```text
https://geo-kurdistan-demo-web-amanj.onrender.com/account#invite=PASTE_TOKEN_HERE
```

Sign in using that exact Google email. Clear the temporary PowerShell variables afterward and do
not store the database URL or token in Git.

## 5. End-to-end acceptance test

1. Sign in as the invited administrator or an invited teacher.
2. Create or open a draft record.
3. Upload a JPEG, PNG, or WebP smaller than 3 MiB and 12 million pixels.
4. Confirm the media becomes ready, add its rights/alt text, and select it as the primary image.
5. Complete the record readiness checks and publish it.
6. Sign out, open Explore, open the record, and confirm the sanitized WebP is visible.
7. Confirm a PDF, video, malformed image, image over 3 MiB, and image over 12 million pixels are
   rejected.
8. Confirm a visitor cannot upload or attach media.

## 6. Remove the demo after seven days

Delete both Render web services and the Render demo database. Revoke the demo B2 application key,
then delete the demo bucket after confirming nothing needs to be retained. Remove the Render domain
from Firebase Authorized domains. This does not affect the production worker, production media
bucket, or recovery bucket.

## Free-plan limits

Render Free web services sleep after inactivity, so the first request may be slow. The two web
services together use free instance hours; the database is limited and intended only for this
short demo. Keep the audience and uploaded image count small, because traffic to external B2 is
subject to Render's free outbound-traffic limits.
