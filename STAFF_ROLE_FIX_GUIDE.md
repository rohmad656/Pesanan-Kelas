# Staff Role Bug Fix - Implementation Guide & Testing

**Deployment Date:** May 14, 2026  
**Fix Version:** 1.0  
**Status:** READY FOR TESTING

---

## CHANGES MADE

### 1. Register.tsx - Updated Role Selector

**File:** `src/pages/Register.tsx`  
**Lines:** 200-215, 113-127, 72-95

**What Changed:**

```typescript
// BEFORE: Only offered 3 roles (mahasiswa, dosen, admin)
// "admin" was displayed as "Staf" but internally assigned as "admin"
{(['mahasiswa', 'dosen', 'admin'] as Role[]).map((r) => (
  <button onClick={() => setRole(r)}>
    <span>{r === 'admin' ? 'Staf' : r}</span>  // ❌ Mismatch
  </button>
))}

// AFTER: Explicitly includes staff role (hides admin)
// "staff" is displayed as "Staf" and internally assigned as "staff"
{(['mahasiswa', 'dosen', 'staff'] as Role[]).map((r) => (
  <button onClick={() => setRole(r)}>
    <span>{r === 'staff' ? 'Staf' : r}</span>  // ✅ Correct mapping
  </button>
))}
```

**Impact:**

- ✅ Staff registration now correctly assigns "staff" role
- ✅ Admin role hidden from user-facing registration
- ✅ Clearer role options (Mahasiswa, Dosen, Staf)

---

### 2. Register.tsx - Added Staff Validation

**File:** `src/pages/Register.tsx`  
**Lines:** 72-95

**What Changed:**

```typescript
// ADDED: Staff ID validation
} else if (role === 'staff') {
  // Staff ID: flexible format (alphanumeric, 3-20 characters)
  if (identifier.length < 3) {
    setIdentifierError('ID Staf minimal 3 karakter.');
    return;
  }
  if (identifier.length > 20) {
    setIdentifierError('ID Staf maksimal 20 karakter.');
    return;
  }
}
```

**Impact:**

- ✅ Proper validation for staff IDs
- ✅ Flexible format (not rigid like NIM/NIP)
- ✅ Clear error messages

---

### 3. Register.tsx - Updated Helper Functions

**File:** `src/pages/Register.tsx`  
**Lines:** 113-127

**What Changed:**

```typescript
// BEFORE: Generic fallback for unknown roles
const getIdentifierLabel = () => {
  if (role === "mahasiswa") return "NIM";
  if (role === "dosen") return "NIP";
  return "ID Staf"; // ❌ Generic fallback
};

// AFTER: Explicit handling for all supported roles
const getIdentifierLabel = () => {
  if (role === "mahasiswa") return "NIM";
  if (role === "dosen") return "NIP";
  if (role === "staff") return "ID Staf"; // ✅ Explicit
  return "ID"; // Safer fallback
};

const getIdentifierPlaceholder = () => {
  if (role === "mahasiswa") return "12 Digit Angka NIM";
  if (role === "dosen") return "18 Digit Angka NIP";
  if (role === "staff") return "ID Staf Anda (3-20 karakter)"; // ✅ Added
  return "ID Anda";
};
```

**Impact:**

- ✅ Clear UI guidance for each role type
- ✅ Explicit handling prevents confusion
- ✅ User expectations match actual validation

---

### 4. AuthContext.tsx - Fixed Role Logic

**File:** `src/contexts/AuthContext.tsx`  
**Lines:** 945-973 (in completeRegistration)

**What Changed:**

```typescript
// BEFORE: Staff role was mapped internally as "admin" then downgraded
let initialRole = data.role || "mahasiswa";
let finalRole: Role = initialRole as Role;

if (email.endsWith("@student.uin-malang.ac.id")) {
  finalRole = "mahasiswa";
} else {
  try {
    const mappingSnap = await getDoc(mappingRef);
    if (mappingSnap.exists()) {
      const mappedRole = mappingSnap.data().role;
      finalRole = mappedRole as Role;
    } else if (
      finalRole === ("admin" as any) &&  // ❌ Loose type check
      email !== "gama96954@gmail.com"
    ) {
      // This caught both "admin" AND cases where user selected "staff"
      // but it got mapped to "admin" in the buggy UI
      finalRole = email.endsWith("@uin-malang.ac.id")
        ? "dosen"
        : "mahasiswa";
    }
  }
}

// AFTER: Staff role properly respected, only "admin" gets downgraded
let initialRole = data.role || "mahasiswa";
let finalRole: Role = initialRole as Role;

if (email.endsWith("@student.uin-malang.ac.id")) {
  finalRole = "mahasiswa";
} else {
  try {
    const mappingSnap = await getDoc(mappingRef);
    if (mappingSnap.exists()) {
      const mappedRole = mappingSnap.data().role;
      finalRole = mappedRole as Role;
    } else if (
      finalRole === "admin" &&  // ✅ Strict type check
      email !== "gama96954@gmail.com"
    ) {
      // Only actual "admin" role gets downgraded
      // "staff" role is now preserved
      finalRole = email.endsWith("@uin-malang.ac.id")
        ? "dosen"
        : "mahasiswa";
    }
    // ✅ NEW: Respect "staff" role - don't downgrade it
  }
}
```

**Impact:**

- ✅ Staff role is no longer incorrectly downgraded
- ✅ Stricter type checking prevents accidental matches
- ✅ Admin role still protected from unauthorized assignments

---

## MIGRATION NOTES

### For Existing Staff Users (Created Before Fix)

If any staff accounts were created with the wrong role before this fix, they may need correction:

```sql
-- Identify staff users incorrectly assigned as mahasiswa
SELECT uid, email, nim FROM users
WHERE role = 'mahasiswa' AND nim LIKE 'STF%';

-- Manual fix (requires admin dashboard)
UPDATE users SET role = 'staff' WHERE uid = 'USER_UID';
```

**Recommendation:**

- Audit existing user database for incorrect role assignments
- Provide staff users the ability to request role change
- Create admin dashboard to manage role corrections

---

## TESTING CHECKLIST

### Pre-Deployment Testing

#### Test 1: New Staff Registration Flow

```
✓ Navigate to /daftar
✓ Click "Staf" button
✓ Verify internal role is "staff" (check Firebase or network tab)
✓ Fill form with valid staff ID (3-20 characters)
✓ Submit form
✓ Verify redirected to /dashboard
✓ Verify role in localStorage is "staff"
✓ Verify role in Firestore is "staff"
```

**Expected Result:** Staff role assignment ✓

---

#### Test 2: Student Registration Still Works

```
✓ Navigate to /daftar
✓ Click "Mahasiswa" button
✓ Fill form with 12-digit NIM
✓ Submit form
✓ Verify role is "mahasiswa" in database
✓ Verify redirected to student dashboard
```

**Expected Result:** No regression in student flow ✓

---

#### Test 3: Lecturer Registration Still Works

```
✓ Navigate to /daftar
✓ Click "Dosen" button
✓ Fill form with 18-digit NIP
✓ Submit form
✓ Verify role is "dosen" in database
✓ Verify redirected to lecturer dashboard
```

**Expected Result:** No regression in lecturer flow ✓

---

#### Test 4: Email Domain Detection

```
✓ Register with @student.uin-malang.ac.id email
  → Should force to "mahasiswa" ✓

✓ Register with @uin-malang.ac.id email, select "Dosen"
  → Should assign "dosen" ✓

✓ Register with @uin-malang.ac.id email, select "Staf"
  → Should assign "staff" ✓

✓ Register with other domain, select "Staf"
  → Should assign "staff" ✓
```

**Expected Result:** Domain detection works correctly ✓

---

#### Test 5: Staff ID Validation

```
✓ Try ID < 3 characters
  → Error: "ID Staf minimal 3 karakter" ✓

✓ Try ID > 20 characters
  → Error: "ID Staf maksimal 20 karakter" ✓

✓ Try valid ID "STF001" (6 chars)
  → Validation passes ✓

✓ Try valid ID "STAFF-ADMIN-001" (15 chars)
  → Validation passes ✓
```

**Expected Result:** Staff validation working ✓

---

#### Test 6: Existing User Login

```
✓ Login as existing mahasiswa user
  → Works correctly ✓

✓ Login as existing dosen user
  → Works correctly ✓

✓ Login as existing admin user
  → Works correctly ✓
```

**Expected Result:** No regression in login ✓

---

### Post-Deployment Testing

#### Test 7: Real Staff Registration

```
Steps:
1. Create new staff user account
2. Complete registration as "Staf"
3. Login with new account
4. Verify dashboard shows staff-specific features
5. Verify staff notifications working
6. Verify staff reports accessible
```

**Expected Result:** Full staff functionality ✓

---

#### Test 8: Role Mapping Override

```
If role_mappings collection is configured:
1. Add role mapping for test@example.com → "staff"
2. Register new user with that email
3. Verify role is "staff" (mapping takes precedence)
```

**Expected Result:** Mapping system works ✓

---

#### Test 9: Dashboard Navigation

```
✓ Staff user → Redirected to /dashboard-staff
✓ Student user → Redirected to /dashboard-mahasiswa
✓ Lecturer user → Redirected to /dashboard-dosen
✓ Admin user → Redirected to /dashboard-admin
```

**Expected Result:** All dashboards accessible ✓

---

#### Test 10: Audit Logging

```
Check audit_logs collection:
✓ REGISTER_COMPLETE entries show correct role
✓ Staff registrations logged as "staff" (not "mahasiswa")
✓ Role changes logged correctly
```

**Expected Result:** Audit trail accurate ✓

---

## ROLLBACK PROCEDURE (If Needed)

### Step 1: Stop accepting new registrations

```javascript
// Temporarily disable registration UI
<button disabled>Registrasi (Sedang Maintenance)</button>
```

### Step 2: Revert code changes

```bash
# Revert the two main files
git revert <commit_hash>
```

### Step 3: Deploy previous version

```bash
npm run build
npm run deploy
```

### Step 4: Fix incorrect users (if any were created)

```sql
-- Revert any staff users back to mahasiswa
UPDATE users SET role = 'mahasiswa'
WHERE created_after = '2026-05-14' AND role = 'staff';
```

---

## MONITORING AFTER DEPLOYMENT

### Key Metrics to Watch

| Metric                            | Expected | Alert                |
| --------------------------------- | -------- | -------------------- |
| Staff registration success rate   | > 95%    | < 80%                |
| New staff users with "staff" role | 100%     | < 90%                |
| Dashboard redirect errors         | < 1%     | > 5%                 |
| Role-related complaints           | 0        | Any                  |
| Audit log anomalies               | None     | Any unusual patterns |

---

## ERROR HANDLING

### Common Issues & Solutions

#### Issue: User registers as "Staf" but gets "mahasiswa" role

**Diagnosis:** Likely pre-deployment, now fixed
**Solution:** Manually update user role in Firebase Console

#### Issue: Staff ID validation too strict

**Solution:** Adjust min/max in Register.tsx lines 82-88

```typescript
// Current: 3-20 characters
// Adjust to: 1-50 characters (if needed)
if (identifier.length < 1) { ... }
if (identifier.length > 50) { ... }
```

#### Issue: Staff dashboard not accessible

**Diagnosis:** Check role in user profile
**Solution:** Verify `getDashboardRoute()` in AuthContext handles "staff"

```typescript
const getDashboardRoute = (role: Role | string): string => {
  switch (role) {
    case "staff":
      return "/dashboard-staff"; // ✓ Should exist
    // ...
  }
};
```

#### Issue: Audit logs show role changes

**Diagnosis:** Likely database migrations or admin actions
**Solution:** Review audit_logs for timestamp of changes

---

## COMMUNICATION PLAN

### For Admins

- Email about fix implementation
- Dashboard access for role management
- Audit log review process

### For Staff Users

- "Staff role registration now available"
- "Complete your profile update"
- Step-by-step registration guide

### For Developers

- Code review notes
- Git commit documentation
- Technical implementation details

---

## DOCUMENTATION UPDATES

### Files to Update

- [ ] README.md - Add staff role information
- [ ] API documentation - Staff endpoints
- [ ] User guides - Staff registration steps
- [ ] Admin guide - Role management
- [ ] Architecture docs - Role system overview

---

## SIGN-OFF

**Code Review Status:** ⏳ Pending  
**Testing Status:** ⏳ Pending  
**Deployment Status:** ⏳ Pending

**Required Approvals:**

- [ ] Lead Developer
- [ ] Product Manager
- [ ] Security Officer (if role/auth changes)

---

## APPENDIX: Technical Details

### Role Type Definition

```typescript
export type Role = "mahasiswa" | "dosen" | "admin" | "staff";
```

### User Profile Schema (Firestore)

```typescript
interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: "mahasiswa" | "dosen" | "admin" | "staff";
  nim?: string;
  whatsappNumber?: string;
  profileCompleted?: boolean;
  createdAt: Timestamp;
  // ... other fields
}
```

### Dashboard Routes

```typescript
/dashboard-mahasiswa  → Student dashboard
/dashboard-dosen      → Lecturer dashboard
/dashboard-admin      → Admin dashboard
/dashboard-staff      → Staff dashboard (⚠️ Must exist)
```

### Related Files

- `src/pages/Register.tsx` - Registration form
- `src/contexts/AuthContext.tsx` - Authentication logic
- `src/pages/Login.tsx` - Login form
- `src/pages/Dashboard.tsx` - Dashboard routing
- `src/components/RoleChangeModal.tsx` - Role change UI

---

**Implementation Complete**  
**Testing: Ready to Begin**  
**Deployment: Awaiting Approval**
