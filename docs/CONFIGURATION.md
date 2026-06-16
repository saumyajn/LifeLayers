# LifeLayers Configuration Guide

This app can run with curated fallback data, but the production version needs Google Maps Platform and Firebase.

## 1. Google Maps Platform

Use this for the real map UI and live Google Places search.

1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Create or select a project.
3. Enable billing for the project. Google requires billing for production Maps usage.
4. Enable these APIs:
   - Maps JavaScript API
   //AIzaSyDHfefzElv_6fp6FRM74jCmQWkAWcVJVFM
   - Places API
5. Create an API key in APIs & Services > Credentials.

6. Restrict the API key:
   - Application restriction: HTTP referrers.
   - Local referrers:
     - `http://localhost:*/*`
     - `http://127.0.0.1:*/*`
   - Production referrers:
     - `https://your-domain.com/*`
     - `https://www.your-domain.com/*`
   - API restrictions:
     - Maps JavaScript API
     - Places API
7. Add the key to `.env.local`:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_browser_key_here
```

Official references:
- Google Maps JavaScript setup: https://developers.google.com/maps/documentation/javascript/get-api-key
- Google Maps API key security: https://developers.google.com/maps/api-security-best-practices

## 2. Firebase Project

Use Firebase for Google login, saved user preferences, and user reviews.

1. Go to Firebase Console: https://console.firebase.google.com/
2. Create or select a Firebase project.
3. Add a Web app to the project.
4. Copy the Firebase config object from Project settings > General > Your apps.
5. Add the values to `.env.local`:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

Official reference:
- Firebase web setup: https://firebase.google.com/docs/web/setup

## 3. Google Login

1. In Firebase Console, open Authentication.
2. Click Get started if Auth is not already enabled.
3. Open Sign-in method.
4. Enable Google.
5. Set the support email.
6. Save.
7. In Authentication > Settings > Authorized domains, make sure local and production domains are allowed:
   - `localhost`
   - `127.0.0.1`
   - `your-domain.com`

Official references:
- Firebase Authentication: https://firebase.google.com/docs/auth
- Firebase Google sign-in for web: https://firebase.google.com/docs/auth/web/google-signin

## 4. Firestore Database

1. In Firebase Console, open Firestore Database.
2. Create a database.
3. Choose Production mode.
4. Pick a region close to your users, for example a US region for NYC/Jersey City.
5. Publish Firestore Security Rules.

Recommended starting rules:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    match /users/{userId} {
      allow read, write: if signedIn() && request.auth.uid == userId;
    }

    match /reviews/{reviewId} {
      allow read: if true;

      allow create: if signedIn()
        && request.resource.data.userId == request.auth.uid
        && request.resource.data.placeId is string
        && request.resource.data.placeName is string
        && request.resource.data.rating is number
        && request.resource.data.rating >= 1
        && request.resource.data.rating <= 5
        && request.resource.data.text is string
        && request.resource.data.text.size() <= 2000;

      allow update, delete: if signedIn()
        && resource.data.userId == request.auth.uid
        && request.resource.data.userId == request.auth.uid;
    }
  }
}
```

Official references:
- Firestore Security Rules: https://firebase.google.com/docs/firestore/security/get-started
- Firebase Security Rules overview: https://firebase.google.com/docs/rules

## 5. Local Development

Install dependencies:

```powershell
npm.cmd install
```

Start the app:

```powershell
npm.cmd run dev -- --port 5177
```

Open:

```text
http://127.0.0.1:5177
```

Build production assets:

```powershell
npm.cmd run build
```

## 6. Production Checklist

- Keep `.env.local` private and never commit it.
- Add deployed domains to Google Maps API key HTTP referrer restrictions.
- Add deployed domains to Firebase Auth authorized domains.
- Keep Maps API restrictions limited to the APIs this app uses.
- Keep Firestore in Production mode with explicit rules.
- Enable Firebase App Check before public launch.
- Set Google Cloud budget alerts for the Maps project.
- Test Google login, preferences restore, review save, share links, CSV export, and JSON export before sharing the app publicly.
