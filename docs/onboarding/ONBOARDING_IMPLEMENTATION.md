# User Onboarding Flow Implementation

## Overview
Complete authentication + onboarding flow for new users in the SEIP platform.

## Features Implemented

### Backend
1. **User Schema Updates**
   - Added `isProfileComplete` field (Boolean, default: false)
   - Added `onboarding` object with:
     - `branch` (String)
     - `batch` (String)
     - `year` (String)
     - `hasWallet` (Boolean)
     - `monthlyIncome` (Number)
     - `monthlyExpense` (Number)
     - `spendingCategories` (Array of Strings)
   - Added missing fields: `googleId`, `isEmailVerified`, `department`

2. **Google OAuth Integration**
   - New users created with `isProfileComplete: false`
   - JWT token includes `isProfileComplete` flag
   - Existing users unaffected

3. **Onboarding Endpoint**
   - **POST** `/api/auth/onboarding` (Protected Route)
   - Accepts: branch, batch, year, hasWallet, monthlyIncome, monthlyExpense, spendingCategories
   - Validates all inputs using express-validator
   - Updates user profile
   - Sets `isProfileComplete: true`
   - Returns new JWT token with updated status

### Frontend
1. **GoogleCallback Updates**
   - Checks `isProfileComplete` from JWT token
   - If false → redirects to `/onboarding`
   - If true → redirects to role-based dashboard

2. **Onboarding Page** (`/onboarding`)
   - 3-step wizard with progress bar
   - **Step 1: Academic Info**
     - Branch/Department (required)
     - Batch (required)
     - Current Year (dropdown)
   
   - **Step 2: Financial Profile**
     - Enable wallet checkbox
     - Conditional fields: Monthly Income & Expense (only if wallet enabled)
   
   - **Step 3: Spending Categories**
     - Multi-select from 8 predefined categories
     - At least one required
   
   - Beautiful UI with:
     - Glass-morphism design
     - Framer Motion animations
     - Progress indicator
     - Form validation
     - Loading states

3. **Route Protection**
   - `/onboarding` route protected by `ProtectedRoute`
   - Requires authentication

## Files Modified

### Backend
- `server/models/user.js` - Added onboarding fields
- `server/config/passport.js` - Set isProfileComplete: false for new users
- `server/routes/auth.js` - Added onboarding endpoint + JWT updates
- `server/package.json` - Added migration script

### Frontend
- `client/src/components/GoogleCallback.jsx` - Added onboarding redirect logic
- `client/src/App.jsx` - Added `/onboarding` route
- `client/src/pages/Onboarding.jsx` - New onboarding page component

### New Files
- `server/scripts/migrateOnboarding.js` - Migration script for existing users

## Setup Instructions

### 1. Backend Setup
```bash
cd server
npm install
```

### 2. Run Migration (for existing users)
```bash
npm run migrate:onboarding
```

This script:
- Finds all users with `isProfileComplete: false` or undefined
- Sets `isProfileComplete: true`
- Populates default onboarding data from existing fields
- Verifies the migration

### 3. Start Development Servers
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm start
```

## API Documentation

### POST /api/auth/onboarding

**Authentication**: Required (JWT Bearer Token)

**Request Body**:
```json
{
  "branch": "Computer Science",
  "batch": "2023 - 2027",
  "year": "2nd Year",
  "hasWallet": true,
  "monthlyIncome": 5000,
  "monthlyExpense": 3000,
  "spendingCategories": ["Food & Dining", "Transport", "Entertainment"]
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Onboarding completed successfully",
  "data": {
    "user": {
      "_id": "67890abcdef...",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "Student",
      "isProfileComplete": true,
      "onboarding": {
        "branch": "Computer Science",
        "batch": "2023 - 2027",
        "year": "2nd Year",
        "hasWallet": true,
        "monthlyIncome": 5000,
        "monthlyExpense": 3000,
        "spendingCategories": ["Food & Dining", "Transport", "Entertainment"]
      }
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses**:
- 400: Validation failed
- 401: Unauthorized (missing/invalid token)
- 404: User not found
- 500: Server error

## User Flow

1. **First Login (New User)**
   ```
   Google Login → Auth Callback → Check isProfileComplete
     → false → Redirect to /onboarding
     → Complete 3-step form → Submit
     → isProfileComplete = true → Redirect to /student
   ```

2. **Subsequent Logins**
   ```
   Google Login → Auth Callback → Check isProfileComplete
     → true → Redirect to role-based dashboard
   ```

3. **Existing Users (After Migration)**
   ```
   Already have isProfileComplete = true
   → Normal login flow (no onboarding required)
   ```

## Testing

### Test New User Flow
1. Clear localStorage
2. Login with a new Google account
3. Should redirect to `/onboarding`
4. Complete all 3 steps
5. Should redirect to `/student`
6. Check localStorage - user should have `isProfileComplete: true`

### Test Existing User Flow
1. Login with existing Google account
2. Should go directly to dashboard (no onboarding)

### Test API Directly
```bash
# Get token first (login via Google)
TOKEN="your_jwt_token_here"

# Test onboarding endpoint
curl -X POST http://localhost:5000/api/auth/onboarding \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branch": "Computer Science",
    "batch": "2023 - 2027",
    "year": "1st Year",
    "hasWallet": true,
    "monthlyIncome": 5000,
    "monthlyExpense": 3000,
    "spendingCategories": ["Food & Dining", "Transport"]
  }'
```

## Security Considerations

✅ **Implemented**:
- Protected route (requires JWT authentication)
- Input validation with express-validator
- XSS protection via sanitization middleware
- MongoDB injection protection
- Rate limiting applied globally

⚠️ **Recommendations**:
- Add CSRF protection if using cookies in future
- Implement token rotation for enhanced security
- Add audit logging for onboarding events

## Future Enhancements

- [ ] Allow users to edit onboarding data in profile settings
- [ ] Add personalized dashboard based on spending categories
- [ ] Send welcome email after onboarding completion
- [ ] Add analytics tracking for onboarding conversion rate
- [ ] Implement progressive profiling (collect more data over time)
- [ ] Add onboarding completion badge/achievement

## Troubleshooting

### Issue: New users not redirected to onboarding
**Solution**: Check JWT token contains `isProfileComplete: false`

### Issue: Migration script fails
**Solution**: 
- Verify MONGO_URI in .env is correct
- Ensure MongoDB connection is working
- Check user model is properly imported

### Issue: Onboarding form validation errors
**Solution**: 
- Check all required fields are filled
- Verify API endpoint is accessible
- Check network tab for response details

## Support

For issues or questions:
- Check browser console for frontend errors
- Check server logs for backend errors
- Review API response in Network tab
- Verify JWT token is valid and not expired
