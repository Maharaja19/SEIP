# 🔧 Troubleshooting: Onboarding Not Showing

## Problem
After login, you're going directly to dashboard instead of seeing the onboarding page.

## Root Cause
Your user account already has `isProfileComplete: true` in the database, OR the migration already ran.

---

## ✅ Solution 1: Clear Your User's Onboarding Status

### Option A: Using MongoDB Compass/Shell
```javascript
// Find your user
db.users.findOne({ email: "your-email@gmail.com" })

// Reset onboarding
db.users.updateOne(
  { email: "your-email@gmail.com" },
  { 
    $set: { 
      isProfileComplete: false,
      branch: undefined,
      batch: undefined,
      year: undefined,
      hasWallet: undefined,
      monthlyIncome: undefined,
      monthlyExpense: undefined,
      spendingCategories: undefined
    } 
  }
)
```

### Option B: Delete Your User (Create Fresh)
```javascript
// Delete your user
db.users.deleteOne({ email: "your-email@gmail.com" })
```
Then login again with Google - you'll be treated as a new user.

---

## ✅ Solution 2: Test with a NEW Google Account

1. Open **incognito/private browser**
2. Go to `http://localhost:3000/login`
3. Login with a **DIFFERENT Google account** (one that has never used the app)
4. You should be redirected to `/onboarding`

---

## ✅ Solution 3: Check Console Logs

Open browser console (F12) and look for:

**If you see this** → Onboarding should show:
```
User data from JWT: { ..., isProfileComplete: false }
New user detected, redirecting to onboarding page
```

**If you see this** → Going to dashboard (already completed):
```
User data from JWT: { ..., isProfileComplete: true }
```

---

## 🔍 Debug Steps

### 1. Check JWT Token
Open browser console and run:
```javascript
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('isProfileComplete:', payload.isProfileComplete);
```

**Expected for new user**: `false`  
**If shows**: `true` → Your user already completed onboarding

### 2. Check localStorage
```javascript
console.log(JSON.parse(localStorage.getItem('user')));
```

Look for `isProfileComplete` field.

### 3. Check Database
```bash
cd server
node
```

```javascript
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const users = await User.find({}, { email: 1, isProfileComplete: 1, name: 1 });
  console.log('Users:');
  users.forEach(u => {
    console.log(`${u.email} - isProfileComplete: ${u.isProfileComplete}`);
  });
  process.exit();
});
```

---

## 🎯 What Should Happen

### New User Flow:
```
Login with Google
  ↓
Backend creates user with isProfileComplete: false
  ↓
JWT token includes isProfileComplete: false
  ↓
GoogleCallback checks: if (!isProfileComplete)
  ↓
navigate("/onboarding") ✅
  ↓
Complete form → POST /api/auth/onboarding
  ↓
isProfileComplete = true
  ↓
navigate("/student")
```

### Existing User Flow:
```
Login with Google
  ↓
Backend finds user with isProfileComplete: true
  ↓
JWT token includes isProfileComplete: true
  ↓
GoogleCallback checks: if (!isProfileComplete) → FALSE
  ↓
navigate("/student") directly ✅
```

---

## 🚀 Quick Fix (Recommended)

**Delete your user and login fresh:**

```javascript
// In MongoDB
db.users.deleteOne({ email: "your-email@gmail.com" })
```

Then:
1. Clear browser localStorage: `localStorage.clear()`
2. Refresh page
3. Login with Google again
4. Should redirect to `/onboarding` ✅

---

## 📝 Verify Onboarding Page Exists

Check these files exist:
- ✅ `client/src/pages/Onboarding.jsx`
- ✅ `client/src/App.jsx` has route: `<Route path="/onboarding" ...>`
- ✅ `server/routes/auth.js` has: `POST /onboarding` endpoint

---

## Still Not Working?

1. **Check browser console** for errors
2. **Check server logs** for errors
3. **Verify JWT token** contains `isProfileComplete: false`
4. **Try incognito mode** with new Google account
5. **Clear everything**: `localStorage.clear()` + delete user from DB
