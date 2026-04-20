# Security Specification - Campus Book Firestore Rules

## 1. Data Invariants
- **Users**: 
  - Every user document MUST have a unique `uid` matching the document ID.
  - Role can only be one of: `mahasiswa`, `dosen`, `staff`, `admin`.
  - Roles `admin` and `staff` are restricted and cannot be self-assigned unless the email is in the `role_mappings` collection or is a primary admin.
  - Users can only edit their own profile fields (except for restricted flags like `role` or `deleted`).
- **Rooms**:
  - Only staff and admin can create or fully update rooms.
  - Authenticated users can read room data.
- **Bookings**:
  - Bookings are linked to a user. Users can only create bookings for themselves and cancel their own bookings.
  - Approved bookings cannot be modified except for cancellation by the owner or full management by staff.
- **Issues**:
  - Any authenticated user (verified) can report a room issue.
  - Only staff can manage and resolve reported issues.
- **Audit Logs**:
  - Audit logs are append-only. No one can update or delete them.
  - Only staff/admin can read audit logs.
- **Role Mappings**:
  - Only admin can modify mapping from email to role.

## 2. The "Dirty Dozen" Payloads (Deny Scenarios)

1. **Identity Spoofing**: Regular user tries to create a user document with a different UID.
2. **Privilege Escalation**: New user tries to set their role to 'admin' during registration.
3. **Malicious Role Update**: Normal user tries to change their own role to 'admin' via profile edit.
4. **Unauthorized Room Deletion**: Non-admin user tries to delete a room.
5. **Double Booking Bypass**: Trying to approve a booking without being staff.
6. **Shadow Field Injection**: Adding an `isAdmin: true` field to a user document that doesn't belong in the schema.
7. **Orphaned Booking**: Creating a booking for a room ID that doesn't exist.
8. **PII Leakage**: Authenticated user trying to list all users (including students) and their phone numbers.
9. **History Tampering**: User trying to change the `createdAt` timestamp of an old booking.
10. **Resource Exhaustion**: Sending a 2MB string as a room's description.
11. **Soft-Delete Bypass**: User trying to read their own profile after being marked as `deleted` by an admin.
12. **Notification Hijack**: Creating a notification intended for another user.

## 3. Implementation of the Eight Pillars

- **Master Gate**: All sub-resources (bookings, issues) are evaluated against the current user's role and the target resource's ownership.
- **Validation Blueprints**: `isValidUser`, `isValidRoom`, etc., are defined to enforce strict schema.
- **ID Hardening**: `isValidId` (placeholder) and size checks on all string fields.
- **Tiered Identity**: `isOwner(userId)` vs `isStaff()` logic.
- **Total Array Guarding**: Size limits on `facilities` and other list fields.
- **PII Isolation**: Directory listing (through `list` rule) is restricted to public staff data; private student data is only accessible to staff or the owner.
- **Secure List Queries**: `allow list` explicitly checks `resource.data` to prevent scraping.
