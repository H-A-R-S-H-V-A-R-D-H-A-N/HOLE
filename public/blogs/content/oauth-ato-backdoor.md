# Account Takeover via Unverified Email Claim & Permanent SSO Backdoor

## Overview

During a recent bug bounty engagement on a major media streaming platform, I uncovered a critical vulnerability chain in their account management flow. By combining a logic flaw in their Single Sign-On (SSO) implementation with a lack of basic email verification, I was able to permanently hijack any unregistered email address on the platform.

The most dangerous aspect of this vulnerability was the **persistent SSO backdoor**. Even if the victim managed to reset their password or change their email address later, the attacker's Google SSO linkage remained permanently tied to the account, granting the attacker silent, continuous access that could not be revoked by the victim.

## The Vulnerability Chain

The attack relies on three distinct security failures that, when chained together, result in a full Account Takeover (ATO):

### 1. Payment Bypass via OAuth
The target application enforced a strict paywall during traditional email-based registration—users had to provide payment details before an account was provisioned. However, the application offered a "Sign in with Google" option. Completing the OAuth flow bypassed the payment requirement entirely, instantly provisioning a free, active account.

### 2. Unverified and Silent Email Changes
Once inside the free account, a user could navigate to Account Settings and change their email address. 
The fatal flaw: **The application did not verify the new email address, nor did it notify the old one.** It also did not require re-authentication (like prompting for a password). The change was instant and completely silent.

### 3. Permanent OAuth Linkage
When a user changed their email or password, the original Google OAuth linkage was never severed or re-validated. There was also no interface for users to view or revoke linked social accounts. This meant the attacker's Google account remained a permanent "skeleton key" to the profile.

## Steps to Reproduce

*Let's assume the attacker controls `attacker@gmail.com` and the victim (who does not yet have an account) owns `victim@gmail.com`.*

1. **The Setup:** The attacker navigates to the signup page and clicks "Sign in with Google", authenticating with `attacker@gmail.com`. A free account is created, bypassing the paywall.
2. **The Hijack:** The attacker goes to Account Settings and changes the email address to `victim@gmail.com`. The platform accepts this immediately without sending any confirmation link to the victim.
3. **The Trap:** The attacker logs out.

At this point, the trap is set. 

When the victim eventually tries to register for the platform using their legitimate email (`victim@gmail.com`), they are greeted with an "Account already exists" error. 

Assuming they simply forgot they made an account, the victim initiates a password reset. They receive the reset link, set a new password, and log in. The victim now believes they have successfully recovered or claimed their account.

4. **The Backdoor:** The attacker returns to the platform and clicks "Sign in with Google" using their original `attacker@gmail.com` account. Because the OAuth linkage was never severed during the email change or the password reset, **the login succeeds immediately**. 

The attacker is back inside the victim's account. They can now silently read all account notifications, view sensitive billing info, or change the email address again—all without needing the new password the victim just set.

## Attack Flow Diagram

```bash
Attacker                     Platform                     Victim
   |                            |                           |
   |-- Sign up via Google SSO ----->|                           |
   |<-- Free account created -------|                           |
   |                            |                           |
   |-- Change email to victim ----->|                           |
   |<-- Changed, no verify, no alert|                           |
   |                            |                           |
   |   Log out                  |                           |
   |                            |                           |
   |                            |<--- Register victim@gmail --|
   |                            |---- "Account already exists"|
   |                            |                           |
   |                            |<--- Password reset request--|
   |                            |---- Reset link to victim -->|
   |                            |   Victim resets password  |
   |                            |   (resets attacker acct)  |
   |                            |                           |
   |-- Login via Google SSO ------->|                           |
   |<-- Logged in (SSO permanent) --|                           |
   |   Full access regained     |                           |
```

## Impact

This vulnerability chain leads to several severe consequences:
- **Email Identity Theft:** An attacker can claim and use any email address on the platform without the real owner's consent.
- **Permanent Registration Block:** The victim can never create a legitimate, clean account using their own email address.
- **Persistent Unauthorized Access:** The SSO backdoor cannot be removed by the victim through password resets, email changes, or any other self-service action.
- **Privacy Violation:** All platform communications (receipts, subscription info, notifications) belong to an account the attacker fully controls.

## Remediation

To fix this vulnerability chain, the platform must implement the following defenses:
1. **Require Verification:** Send a cryptographic confirmation link to the *new* email address and require it to be clicked before the email change takes effect.
2. **Notify on Change:** Send an immediate security notification to the *old* email address when a change is requested.
3. **Require Re-authentication:** Require the user's current password or an SSO re-confirmation before allowing sensitive changes like email updates.
4. **Enforce Paywalls Uniformly:** Apply the same payment or subscription gate to all account creation paths, including OAuth flows.
5. **Manage Linked Accounts:** Provide an interface for users to view, manage, and revoke linked OAuth providers from their account settings.
