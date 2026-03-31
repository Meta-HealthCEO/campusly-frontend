# 01 — Auth — Phase 2

## Current State
Login, register, forgot password pages. JWT tokens with refresh. Role-based routing. Session hydration partially working.

## Phase 2 Enhancements

### 1. Two-Factor Authentication (2FA)
- TOTP-based (Google Authenticator / Authy) for admin and teacher accounts
- Optional for parents, encouraged for admins
- Recovery codes on setup
- **Why:** School data is sensitive. One compromised admin account = entire school exposed

### 2. Google Sign-In
- OAuth2 social login for parents and students (lower friction)
- Link existing accounts to Google identity
- Keep email/password as fallback
- **Why:** Parents don't want another password. Google login removes the biggest onboarding friction

### 3. Session Security
- "Active sessions" page showing devices/browsers with logout-other-sessions
- Server-side session revocation on password change
- Login notification email for new devices
- **Why:** Parents need to know if someone else accessed their child's account

### 4. Account Security Settings
- Change password, manage 2FA, view active sessions — all in one page
- Password strength meter on change
- **Why:** Users expect a security settings page. It builds trust
