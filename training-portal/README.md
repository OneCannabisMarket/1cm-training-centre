# Training Portal

A mobile-first training portal built with Next.js (Pages Router), TailwindCSS, Firebase Auth, and Cloud Firestore.

## Setup

1. Copy `.env.local.example` to `.env.local` and fill Firebase keys.
2. Install dependencies: `npm install`
3. Run dev server: `npm run dev`
4. Build: `npm run build` and `npm start`

## Firebase Security Rules (sketch)

You must configure Firestore Security Rules to enforce roles. See `README` bottom for a starter snippet.

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function isAdmin() { return isSignedIn() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'; }

    match /users/{uid} {
      allow read: if isSignedIn() && (uid == request.auth.uid || isAdmin());
      allow write: if isAdmin() || (isSignedIn() && uid == request.auth.uid);
    }

    match /invites/{email} {
      allow read: if isAdmin();
      allow write: if isAdmin();
    }

    match /modules/{id} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }

    match /quizzes/{id} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }

    match /progress/{doc} {
      allow read, write: if isSignedIn() && (request.resource.data.uid == request.auth.uid || isAdmin());
    }
  }
}
```