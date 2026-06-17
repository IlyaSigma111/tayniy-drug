# Firestore Security Rules

## Проблема
Тестовый режим Firestore (30 дней) истёк. Нужно обновить правила в Firebase Console.

## Правила
Зайдите в Firebase Console → Firestore → Rules и вставьте:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /profiles/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    match /assignments/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /letters/{letterId} {
      allow read, write: if request.auth != null;
    }
    match /settings/{doc} {
      allow read, write: if request.auth != null;
    }
    match /credentials/{userId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Нажмите **Publish**.
