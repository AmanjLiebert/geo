# Runtime secrets

Place the production Firebase service-account file at `secrets/firebase-service-account.json`, or point
`FIREBASE_SERVICE_ACCOUNT_FILE` at another protected file. The JSON itself is ignored by Git and must be readable only
by the deployment account.
