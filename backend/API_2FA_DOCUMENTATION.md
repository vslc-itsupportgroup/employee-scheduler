# 2FA and Login Confirmation Email API Documentation

## Overview
This document describes the API endpoints for managing Two-Factor Authentication (TOTP) and login confirmation emails.

## Authentication
All endpoints except the public ones require a valid JWT token in the `Authorization: Bearer <token>` header.

---

## 1. Two-Factor Authentication (2FA)

### GET /api/security/2fa/status
Get the current 2FA status for the authenticated user.

**Authentication Required:** Yes

**Response:**
```json
{
  "twoFAEnabled": boolean,
  "confirmationEmailEnabled": boolean
}
```

---

### POST /api/security/2fa/setup/generate
Generate a new TOTP secret and QR code for authenticator setup.

**Authentication Required:** Yes

**Request Body:** None

**Response:**
```json
{
  "secret": "string (32-character hex)",
  "qrcodeUrl": "otpauth://totp/Employee%20Scheduler:user@example.com?secret=...",
  "message": "Scan this QR code with your authenticator app"
}
```

**Client Implementation:**
1. Display the QR code (use a QR code library like `qrcode.react`)
2. Allow user to copy the secret manually if needed
3. User scans with Google Authenticator, Authy, Microsoft Authenticator, etc.
4. User enters the 6-digit code to verify

---

### POST /api/security/2fa/setup/verify
Verify the TOTP setup by providing a valid code from the authenticator app.

**Authentication Required:** Yes

**Request Body:**
```json
{
  "secret": "string (from setup/generate)",
  "token": "string (6-digit code from authenticator)"
}
```

**Response:**
```json
{
  "message": "Two-factor authentication has been enabled successfully",
  "twoFAEnabled": true
}
```

**Notes:**
- Token must be a 6-digit number
- After successful verification, 2FA is immediately active

---

### POST /api/security/2fa/disable
Disable two-factor authentication for the authenticated user.

**Authentication Required:** Yes

**Request Body:** None

**Response:**
```json
{
  "message": "Two-factor authentication has been disabled",
  "twoFAEnabled": false
}
```

---

## 2. Login with 2FA

### POST /api/auth/login
Login with optional TOTP token for 2FA.

**Authentication Required:** No

**Request Body:**
```json
{
  "email": "string",
  "password": "string",
  "totpToken": "string (optional, required if 2FA is enabled)"
}
```

**Response (if 2FA is enabled and token not provided):**
```json
{
  "error": "Two-factor authentication required",
  "requires_2fa": true,
  "user_id": "uuid",
  "message": "Please provide your authenticator code"
}
```

**Response (successful login with 2FA):**
```json
{
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "email": "string",
    "first_name": "string",
    "last_name": "string",
    "role": "employee|manager|admin",
    "department": "string"
  },
  "confirmationEmailSent": boolean
}
```

**Client Implementation:**
1. First attempt with email and password
2. If `requires_2fa: true`, show TOTP input screen
3. User enters 6-digit code from authenticator
4. Retry login with same email/password + totpToken

---

## 3. Login Confirmation Emails

### GET /api/security/2fa/status
(See section 1 above - includes `confirmationEmailEnabled` field)

---

### POST /api/security/confirmation-email/toggle
Enable or disable login confirmation emails for the authenticated user.

**Authentication Required:** Yes

**Request Body:**
```json
{
  "enabled": boolean
}
```

**Response:**
```json
{
  "message": "Login confirmation emails have been enabled|disabled",
  "confirmationEmailEnabled": boolean
}
```

**Notes:**
- When enabled, an email is sent after every successful login
- Email contains: login time, device info, IP address, session revocation link
- Default is disabled for all users

---

### POST /api/security/sessions/revoke (Public)
Revoke a login session using the revoke token from confirmation email.

**Authentication Required:** No

**Request Body:**
```json
{
  "revokeToken": "string (from confirmation email link)"
}
```

**Response:**
```json
{
  "message": "Session has been revoked successfully"
}
```

**Email Integration:**
- Confirmation emails include a button/link that calls this endpoint
- Link format: `{APP_URL}/api/security/sessions/revoke?token={revokeToken}`
- Clicking the link revokes that specific login session

---

## 4. Admin Endpoints

### GET /api/security/admin/confirmation-email/policy
Get the global confirmation email policy.

**Authentication Required:** Yes  
**Role Required:** admin

**Response:**
```json
{
  "confirmationEmailPolicy": {
    "isEnabled": boolean,
    "description": "Login confirmation emails can be individually enabled by users in their security settings"
  }
}
```

---

### POST /api/security/admin/confirmation-email/enable
Enable confirmation emails for all users (admin bulk action).

**Authentication Required:** Yes  
**Role Required:** admin

**Request Body:** None

**Response:**
```json
{
  "message": "Login confirmation emails enabled for X users",
  "affectedUsers": number
}
```

---

### POST /api/security/admin/confirmation-email/disable
Disable confirmation emails for all users (admin bulk action).

**Authentication Required:** Yes  
**Role Required:** admin

**Request Body:** None

**Response:**
```json
{
  "message": "Login confirmation emails disabled for X users",
  "affectedUsers": number
}
```

---

### GET /api/security/admin/confirmation-email/users
Get list of users who have confirmation emails enabled.

**Authentication Required:** Yes  
**Role Required:** admin

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "string",
      "first_name": "string",
      "last_name": "string",
      "confirmation_email_enabled": true,
      "role": "string"
    }
  ],
  "totalWithConfirmationEmails": number
}
```

---

### GET /api/security/admin/2fa/stats
Get 2FA adoption statistics.

**Authentication Required:** Yes  
**Role Required:** admin

**Response:**
```json
{
  "twoFAStats": {
    "usersWithTwoFA": number,
    "totalUsers": number,
    "percentageWithTwoFA": "XX.XX"
  }
}
```

---

## Frontend Integration Guide

### Setup Page (User Settings)

```tsx
import { useState, useEffect } from 'react';
import { securityAPI } from '../api/client';

export const SecuritySettings = () => {
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [confirmationEmailEnabled, setConfirmationEmailEnabled] = useState(false);

  // Load current settings
  useEffect(() => {
    securityAPI.get2FAStatus().then(data => {
      setTwoFAEnabled(data.twoFAEnabled);
      setConfirmationEmailEnabled(data.confirmationEmailEnabled);
    });
  }, []);

  const handleEnable2FA = async () => {
    const setupData = await securityAPI.generate2FASetup();
    // Display QR code
    // User scans and enters code
    // await securityAPI.verify2FASetup(setupData.secret, userCode);
  };

  const handleToggleConfirmationEmail = async (enabled) => {
    await securityAPI.toggleConfirmationEmail(enabled);
    setConfirmationEmailEnabled(enabled);
  };

  return (
    <div>
      <h2>Security Settings</h2>
      
      <section>
        <h3>Two-Factor Authentication</h3>
        <button onClick={handleEnable2FA}>
          {twoFAEnabled ? 'Disable 2FA' : 'Enable 2FA'}
        </button>
      </section>

      <section>
        <h3>Login Confirmation Emails</h3>
        <label>
          <input 
            type="checkbox" 
            checked={confirmationEmailEnabled}
            onChange={(e) => handleToggleConfirmationEmail(e.target.checked)}
          />
          Send confirmation email after login
        </label>
      </section>
    </div>
  );
};
```

### Login Page (with 2FA support)

```tsx
import { useState } from 'react';
import { authAPI } from '../api/client';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [needsTOTP, setNeedsTOTP] = useState(false);

  const handleLogin = async () => {
    try {
      const result = await authAPI.login(email, password, totp);
      // Login successful
      localStorage.setItem('token', result.token);
    } catch (error) {
      if (error.requires_2fa) {
        setNeedsTOTP(true);
        // Show TOTP input field
      } else {
        console.error('Login failed:', error);
      }
    }
  };

  return (
    <div>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <input 
        type="password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)} 
        placeholder="Password" 
      />
      
      {needsTOTP && (
        <input 
          value={totp} 
          onChange={(e) => setTotp(e.target.value)} 
          placeholder="6-digit code from authenticator"
          maxLength="6"
        />
      )}
      
      <button onClick={handleLogin}>Login</button>
    </div>
  );
};
```

---

## Database Updates Required

Run these SQL commands to update your database:

```sql
-- Add 2FA columns to users table
ALTER TABLE users ADD COLUMN two_fa_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN two_fa_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN confirmation_email_enabled BOOLEAN DEFAULT false;

-- Create login_sessions table
CREATE TABLE IF NOT EXISTS login_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  revoke_token VARCHAR(255) UNIQUE,
  is_revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, token)
);

-- Create indexes
CREATE INDEX idx_users_two_fa_enabled ON users(two_fa_enabled);
CREATE INDEX idx_login_sessions_user_id ON login_sessions(user_id);
CREATE INDEX idx_login_sessions_token ON login_sessions(token);
CREATE INDEX idx_login_sessions_revoke_token ON login_sessions(revoke_token);
```

---

## Environment Variables

```env
# Optional: Set to 'true' to enable confirmation emails by default
CONFIRMATION_EMAILS_ENABLED=false

# Login session token lifetime
JWT_EXPIRATION=7d
```

---

## Notes for Implementation

1. **TOTP Library**: Currently using basic implementation. For production, install `speakeasy`:
   ```bash
   npm install speakeasy qrcode
   ```

2. **QR Code Display**: Use `qrcode.react` library on frontend:
   ```bash
   npm install qrcode.react
   ```

3. **Email Configuration**: Confirmation emails require SMTP setup via `/api/email-config` endpoint

4. **Security Considerations**:
   - TOTP tokens are valid for ~30 seconds
   - Login sessions expire after 7 days by default
   - Revoke tokens are one-time use for security
   - Never store TOTP secrets in plain text in response

5. **Testing 2FA**: For development, accept any 6-digit code. In production, properly implement TOTP verification with time-window tolerance.
