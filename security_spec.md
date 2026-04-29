# Security Specification - ZPL Pro Studio

## 1. Data Invariants
- A User profile must exist for any authenticated operation that requires role-based access.
- Usage logs are scoped to a specific user and date.
- Access requests link a user ID to a status.

## 2. The "Dirty Dozen" Payloads (Anti-Patterns to Block)
1. **Identity Spoofing**: Creating a profile with a UID that doesn't match `auth.uid`.
2. **Privilege Escalation**: Updating own `role` to 'admin'.
3. **Resource Poisoning**: Setting a 1MB string as a `userId` in `usageLogs`.
4. **State Shortcutting**: Updating an `accessRequest` from 'rejected' to 'approved' by a non-admin.
5. **Orphaned Writes**: Creating a `usageLog` without a valid `userId`.
6. **Shadow Fields**: Adding an `isVerified: true` field to a user profile that isn't in the schema.
7. **PII Leak**: A user reading another user's email via a blanket `isSignedIn()` read.
8. **Token Faking**: A user using a non-verified email in a rule that requires `email_verified == true`.
9. **Query Scraping**: A user listing all `usageLogs` without an owner filter.
10. **Immutability Breach**: Changing the `createdAt` timestamp on a profile.
11. **Denial of Wallet**: Sending thousands of 1MB strings in an array to bloat document size.
12. **Future Forgery**: Setting a `requestedAt` timestamp in the future.

## 3. Test Runner Strategy
- Verify `users/{uid}` is only readable by `uid`.
- Verify `usageLogs/{id}` is only readable by owner.
- Verify `accessRequests` can only be updated by admins.
