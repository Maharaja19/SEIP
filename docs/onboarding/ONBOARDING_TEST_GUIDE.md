# Onboarding Flow - Quick Test Guide

## ✅ Pre-flight Checklist

1. **Backend Running**: `http://localhost:5000`
2. **Frontend Running**: `http://localhost:3000`
3. **MongoDB Connected**: Check server logs
4. **Google OAuth Configured**: Client ID & Secret in .env

---

## 🧪 Test Scenario 1: New User First Login

### Steps:
1. Open browser in incognito/private mode
2. Navigate to `http://localhost:3000/login`
3. Click "Sign in with Google"
4. Use a **NEW** Google account (not previously registered)

### Expected Results:
- ✅ User created in MongoDB with `isProfileComplete: false`
- ✅ JWT token generated with `isProfileComplete: false`
- ✅ Redirected to `http://localhost:3000/onboarding`
- ✅ Onboarding page displays with Step 1 active

### Verify in Database:
```javascript
// MongoDB Shell
db.users.findOne({ email: "newuser@gmail.com" }, { email: 1, isProfileComplete: 1, onboarding: 1 })
```

Expected:
```json
{
  "_id": ObjectId("..."),
  "email": "newuser@gmail.com",
  "isProfileComplete": false,
  "onboarding": {}
}
```

---

## 🧪 Test Scenario 2: Complete Onboarding

### Steps:
1. **Step 1 - Academic Info**:
   - Branch: "Computer Science"
   - Batch: "2023 - 2027"
   - Year: Select "1st Year"
   - Click "Next"

2. **Step 2 - Financial Profile**:
   - Check "Enable wallet features"
   - Monthly Income: 5000
   - Monthly Expense: 3000
   - Click "Next"

3. **Step 3 - Spending Categories**:
   - Select: "Food & Dining", "Transport", "Entertainment"
   - Click "Complete Setup"

### Expected Results:
- ✅ API call to `POST /api/auth/onboarding` with 200 status
- ✅ User updated: `isProfileComplete: true`
- ✅ New JWT token received
- ✅ localStorage updated with new token and user data
- ✅ Redirected to `http://localhost:3000/student`

### Verify API Response:
```json
{
  "success": true,
  "message": "Onboarding completed successfully",
  "data": {
    "user": {
      "_id": "...",
      "email": "newuser@gmail.com",
      "name": "Test User",
      "role": "Student",
      "isProfileComplete": true,
      "onboarding": {
        "branch": "Computer Science",
        "batch": "2023 - 2027",
        "year": "1st Year",
        "hasWallet": true,
        "monthlyIncome": 5000,
        "monthlyExpense": 3000,
        "spendingCategories": ["Food & Dining", "Transport", "Entertainment"]
      }
    },
    "token": "eyJhbGci..."
  }
}
```

### Verify in Database:
```javascript
db.users.findOne({ email: "newuser@gmail.com" }, { email: 1, isProfileComplete: 1, onboarding: 1 })
```

Expected:
```json
{
  "_id": ObjectId("..."),
  "email": "newuser@gmail.com",
  "isProfileComplete": true,
  "onboarding": {
    "branch": "Computer Science",
    "batch": "2023 - 2027",
    "year": "1st Year",
    "hasWallet": true,
    "monthlyIncome": 5000,
    "monthlyExpense": 3000,
    "spendingCategories": ["Food & Dining", "Transport", "Entertainment"]
  }
}
```

---

## 🧪 Test Scenario 3: Existing User Login (After Onboarding)

### Steps:
1. Logout (clear localStorage)
2. Login again with the same Google account

### Expected Results:
- ✅ JWT token has `isProfileComplete: true`
- ✅ NO redirect to `/onboarding`
- ✅ Direct redirect to `/student` dashboard

---

## 🧪 Test Scenario 4: Existing Users (Before Migration)

### Steps:
1. Login with an existing user (created before onboarding feature)
2. Check if they're redirected to onboarding

### Expected Results:
- ❌ **PROBLEM**: Will be redirected to onboarding (isProfileComplete is undefined/false)

### Solution:
Run migration script:
```bash
cd server
npm run migrate:onboarding
```

### After Migration:
- ✅ Existing users have `isProfileComplete: true`
- ✅ No redirect to onboarding
- ✅ Direct access to dashboard

---

## 🧪 Test Scenario 5: API Validation Errors

### Test Missing Required Fields:
```bash
curl -X POST http://localhost:5000/api/auth/onboarding \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branch": "",
    "batch": ""
  }'
```

Expected: 400 Bad Request with validation errors

### Test Invalid Data Types:
```bash
curl -X POST http://localhost:5000/api/auth/onboarding \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "monthlyIncome": -500,
    "monthlyExpense": "invalid"
  }'
```

Expected: 400 Bad Request with validation errors

---

## 🧪 Test Scenario 6: Form Validation (Frontend)

### Step 1 Validation:
- Leave branch/batch empty → "Next" button disabled
- Fill both fields → "Next" button enabled

### Step 3 Validation:
- Select 0 categories → "Complete Setup" button disabled
- Select 1+ categories → "Complete Setup" button enabled

---

## 🐛 Common Issues & Fixes

### Issue: "Cannot read properties of undefined (reading 'isProfileComplete')"
**Fix**: Clear localStorage and login again

### Issue: "JWT token not found"
**Fix**: 
1. Check if Google OAuth callback is working
2. Verify token is stored in localStorage
3. Check AuthContext is properly initialized

### Issue: "API returns 401 Unauthorized"
**Fix**:
1. Verify JWT_SECRET matches in .env
2. Check token expiration
3. Ensure Authorization header is set correctly

### Issue: "Migration script fails"
**Fix**:
1. Verify MONGO_URI in .env
2. Check MongoDB is running
3. Ensure user model path is correct

---

## 📊 Success Criteria

✅ **All tests pass if**:
1. New users complete onboarding in < 2 minutes
2. Form validation works correctly
3. Database updates properly
4. JWT token refreshes with new status
5. Existing users not affected (after migration)
6. No console errors in browser
7. No server errors in logs

---

## 🔍 Debugging Tips

### Frontend:
```javascript
// Check localStorage
console.log(JSON.parse(localStorage.getItem('user')))
console.log(localStorage.getItem('token'))

// Check JWT payload
const token = localStorage.getItem('token')
const payload = JSON.parse(atob(token.split('.')[1]))
console.log(payload)
```

### Backend:
```javascript
// Check user in database
const user = await User.findById(userId)
console.log(user.isProfileComplete)
console.log(user.onboarding)
```

### Network Tab:
1. Check POST /api/auth/onboarding request
2. Verify request payload
3. Check response status and body
4. Verify new token in response

---

## 📝 Test Results Template

```
Test Date: ___________
Tester: ___________

Scenario 1 (New User Login):
- Redirect to onboarding: ☐ Pass ☐ Fail
- Notes: ___________

Scenario 2 (Complete Onboarding):
- Form submission: ☐ Pass ☐ Fail
- Database update: ☐ Pass ☐ Fail
- Token refresh: ☐ Pass ☐ Fail
- Redirect to dashboard: ☐ Pass ☐ Fail
- Notes: ___________

Scenario 3 (Existing User Login):
- Direct dashboard access: ☐ Pass ☐ Fail
- Notes: ___________

Scenario 4 (Migration):
- Script runs successfully: ☐ Pass ☐ Fail
- All users updated: ☐ Pass ☐ Fail
- Notes: ___________

Overall Status: ☐ All Pass ☐ Issues Found
Issues: ___________
```
