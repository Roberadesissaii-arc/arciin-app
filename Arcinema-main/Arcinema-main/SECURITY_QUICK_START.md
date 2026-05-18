# Security Quick Start Guide

## 🚨 CRITICAL: Before Going to Production

Your application has been audited and several critical security fixes have been implemented. However, **you MUST complete the following steps** before deploying to production.

---

## ✅ What's Been Fixed

1. ✅ **XSS Vulnerability** - Fixed in spoiler pages with DOMPurify
2. ✅ **Firestore Security Rules** - Admin-only access for blocked content/persons
3. ✅ **Security Headers** - Added comprehensive security headers
4. ✅ **Authentication Middleware** - Created secure Firebase Admin SDK auth
5. ✅ **Rate Limiting** - Created rate limiting middleware
6. ✅ **Input Validation** - Created validation utilities with Zod
7. ✅ **Example API Route** - Updated `/api/notifications` as example

---

## ⚠️ REQUIRED: Complete These Steps

### Step 1: Set Up Firebase Admin SDK

1. **Get your Firebase service account key:**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file securely

2. **Set environment variables:**
   
   **Option A: Single JSON string (Recommended)**
   ```bash
   # .env.local
   FIREBASE_ADMIN_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
   ```
   
   **Option B: Individual variables**
   ```bash
   # .env.local
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

3. **For production (Vercel/Netlify/etc):**
   - Add these environment variables in your hosting platform's dashboard
   - **NEVER commit the service account key to Git!**

---

### Step 2: Update All API Routes

You need to update ALL API routes that currently use `x-user-email` header.

**Files to update:**
- `app/api/person/[id]/route.ts`
- `app/api/person/[id]/admin/route.ts`
- `app/api/user/following/route.ts`
- Any other routes using `x-user-email`

**Example - Before:**
```typescript
export async function GET(request: NextRequest) {
  const userEmail = request.headers.get('x-user-email');
  const isAdmin = userEmail === 'admin@arcinema.com';
  // ...
}
```

**Example - After:**
```typescript
import { requireAuth, requireAdmin, createUnauthorizedResponse } from '@/lib/api/auth-middleware';
import { rateLimit, createRateLimitResponse } from '@/lib/api/rate-limit';
import { validateBody, schemas } from '@/lib/api/input-validation';

const limiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 100,
});

export async function GET(request: NextRequest) {
  // Rate limiting
  const limit = limiter(request);
  if (!limit?.allowed) {
    return createRateLimitResponse(limit!.resetTime);
  }

  // Authentication
  const user = await requireAuth(request);
  if (!user) {
    return createUnauthorizedResponse();
  }

  // For admin-only routes:
  // const admin = await requireAdmin(request);
  // if (!admin) {
  //   return createForbiddenResponse();
  // }

  // ... rest of handler
}
```

**See `app/api/notifications/route.ts` for a complete example.**

---

### Step 3: Update Client-Side Code

Update all client-side API calls to send Firebase ID tokens instead of email headers.

**Before:**
```typescript
const response = await fetch('/api/person/123', {
  headers: {
    'Content-Type': 'application/json',
    'x-user-email': user?.email || '',
  },
});
```

**After:**
```typescript
import { projectAuth } from '@/firebase/config';

const token = await projectAuth.currentUser?.getIdToken();
const response = await fetch('/api/person/123', {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
});
```

**Files to update:**
- `components/person/PersonDetails.tsx` (line 160)
- Any other components making API calls with `x-user-email`

---

### Step 4: Deploy Firestore Rules

Deploy the updated Firestore security rules:

```bash
firebase deploy --only firestore:rules
```

---

### Step 5: Test Everything

Run through this checklist:

- [ ] Test admin endpoints with non-admin user (should fail with 403)
- [ ] Test admin endpoints with admin user (should succeed)
- [ ] Test rate limiting (make 100+ requests quickly, should get 429)
- [ ] Test XSS prevention (try `<script>alert('xss')</script>` in spoiler content)
- [ ] Test Firestore rules (try writing to `blockedContent` as non-admin, should fail)
- [ ] Test chat permissions (try reading other users' messages, should fail)
- [ ] Verify security headers are present (check browser DevTools → Network)
- [ ] Test CSP (verify external resources still load correctly)

---

## 📋 Security Checklist

Before production deployment:

- [ ] All API routes use Firebase Admin SDK authentication
- [ ] All client-side code sends ID tokens (not email headers)
- [ ] Firestore rules deployed and tested
- [ ] Rate limiting implemented on all API routes
- [ ] Input validation on all API routes
- [ ] Security headers configured
- [ ] XSS protection in place
- [ ] Environment variables set (not in Git)
- [ ] Error messages don't leak sensitive info
- [ ] HTTPS enforced
- [ ] Security audit completed

---

## 🧪 Testing Tools

### Manual Testing
1. Use browser DevTools to inspect requests/responses
2. Test with different user roles (admin vs regular)
3. Try to bypass security (should fail)

### Automated Testing
Consider using:
- **OWASP ZAP** - Security scanner
- **npm audit** - Dependency vulnerabilities
- **Snyk** - Security monitoring

---

## 📚 Documentation

- **Security Audit Report:** `SECURITY_AUDIT_REPORT.md`
- **Fixes Implemented:** `SECURITY_FIXES_IMPLEMENTED.md`
- **Firebase Admin SDK:** https://firebase.google.com/docs/admin/setup
- **Next.js Security:** https://nextjs.org/docs/app/building-your-application/configuring/security-headers

---

## 🆘 Need Help?

If you encounter issues:

1. Check the error logs
2. Verify environment variables are set correctly
3. Ensure Firebase Admin SDK is properly initialized
4. Test authentication flow step by step
5. Review the example in `app/api/notifications/route.ts`

---

## ⚡ Quick Commands

```bash
# Install dependencies
npm install

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Check for security vulnerabilities
npm audit

# Run linter
npm run lint

# Build for production
npm run build
```

---

**Remember:** Security is an ongoing process. Regularly:
- Update dependencies
- Review security logs
- Monitor for suspicious activity
- Keep security rules up to date
- Conduct periodic security audits

---

**Last Updated:** $(date)

