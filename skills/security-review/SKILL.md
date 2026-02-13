---
name: security-review
description: Security checklist for web applications with Firebase, React, and user-facing 3D editors. Use when reviewing code for security vulnerabilities.
---

# Security Review Skill

## Quick Checklist

Run through this before any deployment or PR merge.

### 🔴 Critical — Must Fix

- [ ] **No secrets in code** — API keys, tokens, passwords must be in `.env` files (not committed)
- [ ] **Firebase Security Rules** — Firestore/RTDB rules restrict access (no open `read: true, write: true`)
- [ ] **No `dangerouslySetInnerHTML`** without DOMPurify sanitization
- [ ] **No `eval()`** or `new Function()` with user input
- [ ] **Auth checks** — Protected routes verify authentication state before rendering

### 🟡 Important — Should Fix

- [ ] **Input validation** — All user inputs validated before use (type, length, format)
- [ ] **XSS prevention** — User-generated content escaped before rendering
- [ ] **CORS** — API endpoints have proper CORS configuration
- [ ] **Dependencies** — No known vulnerabilities (`npm audit`)
- [ ] **Environment variables** — `.env` files listed in `.gitignore`

### 🔵 Best Practices

- [ ] **Content Security Policy** — CSP headers configured
- [ ] **HTTPS only** — No mixed content
- [ ] **Error handling** — Errors don't leak stack traces or internal paths to users
- [ ] **Rate limiting** — Firebase Cloud Functions have rate limits where appropriate
- [ ] **Logging** — Sensitive data not logged (passwords, tokens, PII)

## Firebase-Specific Checks

### Firestore Rules
```
// BAD — anyone can read/write everything
match /{document=**} {
  allow read, write: if true;
}

// GOOD — authenticated users only, scoped access
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

### Storage Rules
- Uploaded files must have size limits
- File type validation (don't trust client-side MIME type)
- User-scoped paths (`/users/{uid}/uploads/`)

### Cloud Functions
- Validate all input parameters
- Use `onCall` with auth context instead of raw HTTP when possible
- Set appropriate timeout and memory limits

## React-Specific Checks

### State Exposure
- Don't store sensitive data in Zustand stores (visible in React DevTools)
- Clear auth tokens from memory on logout
- Use `sessionStorage` over `localStorage` for sensitive session data

### Third-Party Scripts
- Audit all `<script>` tags and CDN imports
- Use Subresource Integrity (SRI) for CDN resources
- Minimize third-party dependencies
