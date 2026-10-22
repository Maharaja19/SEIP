# API Documentation

## Authentication

### Google OAuth Login
**GET** `/api/auth/google`
Initiates Google OAuth authentication flow.

**Response:**
- Redirects to Google OAuth consent screen

### Google OAuth Callback
**GET** `/api/auth/google/callback`
Handles Google OAuth callback and generates JWT token.

**Query Parameters:**
- `code` - Authorization code from Google

**Response:**
- Redirects to frontend with JWT token in URL parameters

### Logout
**GET** `/api/auth/google/logout`
Logs out the user by clearing session.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Students

### Get All Students
**GET** `/api/students`
Retrieves all students with pagination.

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 10)

**Response:**
```json
{
  "students": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalStudents": 50,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Get Student by Register Number
**GET** `/api/students/:regNo`
Retrieves a specific student by register number.

**Response:**
```json
{
  "fullName": "John Doe",
  "registerNumber": "21CSE001",
  "dob": "2000-01-01T00:00:00.000Z",
  "gender": "Male",
  "department": "CSE",
  "year": "III",
  "email": "john@example.com",
  "phoneNumber": "9876543210",
  "address": "123 Main St"
}
```

### Get Student Financial Summary
**GET** `/api/students/:regNo/financial-summary`
Retrieves financial summary for a student.

**Response:**
```json
{
  "financialSummary": {
    "totalIncome": 5000,
    "totalExpense": 2000,
    "balance": 3000,
    "totalTransactions": 15
  },
  "duesSummary": {
    "totalDues": 10,
    "paidDues": 8,
    "unpaidDues": 2,
    "pendingDues": 0,
    "totalDuesAmount": 5000,
    "paidDuesAmount": 4000
  }
}
```

### Get Student Installment Dues
**GET** `/api/students/:regNo/installment-dues`
Retrieves installment dues for a student.

**Response:**
```json
[
  {
    "_id": "due_id",
    "amount": 150,
    "reason": "Semester 5 Installment",
    "dueDate": "2023-06-01T00:00:00.000Z",
    "status": "Unpaid"
  }
]
```

### Create Student
**POST** `/api/students`
Creates a new student record.

**Request Body:**
```json
{
  "fullName": "John Doe",
  "registerNumber": "21CSE001",
  "dob": "2000-01-01",
  "gender": "Male",
  "department": "CSE",
  "year": "III",
  "email": "john@example.com",
  "phoneNumber": "9876543210",
  "address": "123 Main St"
}
```

**Response:**
```json
{
  "message": "Student created successfully",
  "student": { ... }
}
```

### Update Student
**PUT** `/api/students/:regNo`
Updates a student record.

**Request Body:**
```json
{
  "address": "456 New St",
  "phoneNumber": "9999999999"
}
```

**Response:**
```json
{
  "message": "Student updated successfully",
  "student": { ... }
}
```

### Change Student Password
**PUT** `/api/students/:regNo/change-password`
Changes a student's password.

**Request Body:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

**Response:**
```json
{
  "message": "Password changed successfully"
}
```

### Delete Student
**DELETE** `/api/students/:regNo`
Deletes a student record.

**Response:**
```json
{
  "message": "Student deleted successfully"
}
```

## Budgets

### Get All Budgets
**GET** `/api/budgets`
Retrieves all budgets.

**Response:**
```json
[
  {
    "_id": "budget_id",
    "title": "Class Budget 2023",
    "description": "Annual class budget",
    "total_budget": 10000,
    "spent": 5000,
    "remaining": 5000,
    "status": "approved",
    "expenses": [...]
  }
]
```

### Get Current Budget
**GET** `/api/budgets/current`
Retrieves the current approved budget.

**Response:**
```json
{
  "_id": "budget_id",
  "title": "Class Budget 2023",
  "description": "Annual class budget",
  "total_budget": 10000,
  "spent": 5000,
  "remaining": 5000,
  "status": "approved",
  "expenses": [...]
}
```

### Get Budget by ID
**GET** `/api/budgets/:id`
Retrieves a specific budget by ID.

**Response:**
```json
{
  "_id": "budget_id",
  "title": "Class Budget 2023",
  "description": "Annual class budget",
  "total_budget": 10000,
  "spent": 5000,
  "remaining": 5000,
  "status": "approved",
  "expenses": [...]
}
```

### Create/Update Budget
**POST** `/api/budgets`
Creates or updates a budget.

**Request Body:**
```json
{
  "title": "Class Budget 2023",
  "description": "Annual class budget",
  "total_budget": 10000,
  "expenses": [
    {
      "item": "Stationery",
      "amount": 2000
    }
  ]
}
```

**Response:**
```json
{
  "_id": "budget_id",
  "title": "Class Budget 2023",
  "description": "Annual class budget",
  "total_budget": 10000,
  "spent": 2000,
  "remaining": 8000,
  "status": "pending",
  "expenses": [...]
}
```

### Update Budget
**PUT** `/api/budgets/:id`
Updates a specific budget.

**Request Body:**
```json
{
  "title": "Updated Budget Title"
}
```

**Response:**
```json
{
  "title": "Updated Budget Title",
  ...
}
```

### Approve/Reject Budget
**PUT** `/api/budgets/:id/status`
Approves or rejects a budget.

**Request Body:**
```json
{
  "status": "Approved",
  "approvedBy": "user_id"
}
```

**Response:**
```json
{
  "_id": "budget_id",
  "status": "Approved",
  ...
}
```

### Delete Budget
**DELETE** `/api/budgets/:id`
Deletes a budget.

**Response:**
```json
{
  "message": "Budget deleted",
  "budget": { ... }
}
```

## Dues

### Get All Dues
**GET** `/api/dues`
Retrieves all dues with pagination.

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 10)

**Response:**
```json
{
  "dues": [...],
  "pagination": { ... }
}
```

### Get Student Dues
**GET** `/api/dues/:regNo`
Retrieves dues for a specific student.

**Response:**
```json
{
  "dues": [...],
  "pagination": { ... }
}
```

### Get Pending Verification Dues
**GET** `/api/dues/pending-verification`
Retrieves dues pending verification.

**Response:**
```json
[
  {
    "_id": "due_id",
    "studentName": "John Doe",
    "amount": 150,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "transactionRef": "TXN123",
    "upiTransactionId": "UPI123"
  }
]
```

### Create Due
**POST** `/api/dues`
Creates a new due.

**Request Body:**
```json
{
  "studentRegNo": "21CSE001",
  "amount": 150,
  "reason": "Library Fee",
  "dueDate": "2023-12-31"
}
```

**Response:**
```json
{
  "_id": "due_id",
  "amount": 150,
  "reason": "Library Fee",
  "dueDate": "2023-12-31T00:00:00.000Z",
  "status": "Unpaid"
}
```

### Submit UPI Payment
**PUT** `/api/dues/:dueID/pay-via-upi`
Submits a UPI payment for a due.

**Request Body:**
```json
{
  "transactionRef": "TXN123",
  "upiTransactionId": "UPI123",
  "studentRegNo": "21CSE001"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment submitted successfully! Waiting for treasurer verification.",
  "due": { ... }
}
```

### Verify Payment
**PUT** `/api/dues/:dueID/verify`
Verifies a payment (treasurer only).

**Request Body:**
```json
{
  "action": "approve",
  "treasurerNotes": "Payment verified"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment approved successfully!",
  "due": { ... }
}
```

### Update Due
**PUT** `/api/dues/:dueID`
Updates a due (treasurer only).

**Request Body:**
```json
{
  "amount": 200
}
```

**Response:**
```json
{
  "amount": 200,
  ...
}
```

### Delete Due
**DELETE** `/api/dues/:dueID`
Deletes a due (treasurer only).

**Response:**
```json
{
  "message": "Due deleted successfully",
  "due": { ... }
}
```

## Transactions

### Get All Transactions
**GET** `/api/transactions`
Retrieves all transactions with pagination.

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 10)

**Response:**
```json
{
  "transactions": [...],
  "pagination": { ... }
}
```

### Get Transaction by ID
**GET** `/api/transactions/:id`
Retrieves a specific transaction by ID.

**Response:**
```json
{
  "_id": "transaction_id",
  "type": "income",
  "amount": 150,
  "category": "dues",
  "description": "Library fee payment",
  "createdAt": "2023-01-01T00:00:00.000Z"
}
```

### Get User Transactions
**GET** `/api/transactions/user/:identifier`
Retrieves transactions for a specific user.

**Path Parameters:**
- `identifier` - User ID or register number

**Response:**
```json
{
  "transactions": [...],
  "pagination": { ... }
}
```

### Get Transaction Summary
**GET** `/api/transactions/summary/:identifier`
Retrieves transaction summary for a user.

**Response:**
```json
{
  "totalIncome": 5000,
  "totalExpense": 2000,
  "totalTransactions": 15,
  "incomeTransactions": 10,
  "expenseTransactions": 5,
  "expenseByCategory": {
    "food": 500,
    "transport": 300
  },
  "balance": 3000
}
```

### Create Transaction
**POST** `/api/transactions`
Creates a new transaction.

**Request Body:**
```json
{
  "user": "user_id",
  "type": "expense",
  "category": "food",
  "amount": 150,
  "description": "Lunch expense"
}
```

**Response:**
```json
{
  "_id": "transaction_id",
  "type": "expense",
  "amount": 150,
  "category": "food",
  "description": "Lunch expense"
}
```

### Update Transaction
**PUT** `/api/transactions/:id`
Updates a transaction.

**Request Body:**
```json
{
  "description": "Updated lunch expense"
}
```

**Response:**
```json
{
  "description": "Updated lunch expense",
  ...
}
```

### Delete Transaction
**DELETE** `/api/transactions/:id`
Deletes a transaction.

**Response:**
```json
{
  "message": "Transaction deleted successfully"
}
```

## Payments

### Generate UPI Link
**POST** `/api/payments/generate-upi-link`
Generates a UPI payment link.

**Request Body:**
```json
{
  "amount": 150,
  "dueId": "due_id",
  "studentRegNo": "21CSE001"
}
```

**Response:**
```json
{
  "success": true,
  "upiLink": "upi://pay?pa=...",
  "qrCodeUrl": "https://...",
  "amount": 150
}
```

### Submit UPI Payment
**POST** `/api/payments/submit-upi-payment`
Submits a UPI payment.

**Request Body:**
```json
{
  "dueId": "due_id",
  "transactionRef": "TXN123",
  "upiTransactionId": "UPI123",
  "studentRegNo": "21CSE001"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment submitted successfully"
}
```

## Users

### Get All Users
**GET** `/api/users`
Retrieves all users.

**Response:**
```json
[
  {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Student",
    "registerNumber": "21CSE001"
  }
]
```

### Get User by ID
**GET** `/api/users/:id`
Retrieves a specific user by ID.

**Response:**
```json
{
  "_id": "user_id",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "Student",
  "registerNumber": "21CSE001"
}
```

### Get Current User Profile
**GET** `/api/users/me`
Retrieves the current user's profile.

**Response:**
```json
{
  "success": true,
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Student",
    "registerNumber": "21CSE001"
  }
}
```

### Create User
**POST** `/api/users`
Creates a new user.

**Request Body:**
```json
{
  "sNo": 1,
  "name": "John Doe",
  "registerNumber": "21CSE001",
  "email": "john@example.com",
  "contactNo": "9876543210",
  "role": "Student",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": { ... }
}
```

### Update User
**PUT** `/api/users/:id`
Updates a user.

**Request Body:**
```json
{
  "name": "Updated Name"
}
```

**Response:**
```json
{
  "message": "User updated successfully",
  "user": { ... }
}
```

### Change User Password
**PUT** `/api/users/:id/change-password`
Changes a user's password.

**Request Body:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

**Response:**
```json
{
  "message": "Password changed successfully",
  "user": { ... }
}
```

### Delete User
**DELETE** `/api/users/:id`
Deletes a user.

**Response:**
```json
{
  "message": "User deleted successfully"
}
```

## Settings

### Get Student Settings
**GET** `/api/settings/:regNo`
Retrieves student settings.

**Response:**
```json
{
  "fullName": "John Doe",
  "registerNumber": "21CSE001",
  "community": "General",
  "gender": "Male",
  "firstGraduate": false,
  "quota": "Merit",
  "religion": "Hindu",
  "otherState": false,
  "dues": 0,
  "cgpa": 8.5
}
```

### Update Student Settings
**PUT** `/api/settings/:regNo`
Updates student settings.

**Request Body:**
```json
{
  "community": "OBC",
  "firstGraduate": true,
  "contactNo": "9999999999"
}
```

**Response:**
```json
{
  "message": "Student updated successfully",
  "student": { ... }
}
```