# Database Schema Documentation

## Overview
The CSEA Treasury Management System uses MongoDB as its primary database with the following collections:

1. **users** - Authentication and basic user information
2. **students** - Extended student information
3. **budgets** - Class budget proposals and approvals
4. **dues** - Student fee management
5. **transactions** - Financial transaction records
6. **studentdetails** - Additional student demographic information

## Users Collection

### Schema
```javascript
{
  _id: ObjectId,
  sNo: Number,                    // Serial number
  rollNo: String,                 // Roll number (optional for Admin/Treasurer)
  registerNumber: String,         // Register number (unique, 13 digits)
  name: String,                   // Full name (max 100 chars)
  email: String,                  // Email address (unique, lowercase)
  contactNo: String,              // Contact number (10 digits, starts with 6-9)
  role: String,                   // Role: "Admin", "Treasurer", "Student"
  password: String,               // Hashed password (min 6 chars)
  lastLogin: Date,                // Last login timestamp
  isActive: Boolean,              // Account status
  createdAt: Date,                // Creation timestamp
  updatedAt: Date                 // Last update timestamp
}
```

### Indexes
- `registerNumber` - Unique index
- `email` - Unique index
- `role` - Index for role-based queries
- `createdAt` - Index for time-based queries

## Students Collection

### Schema
```javascript
{
  _id: ObjectId,
  fullName: String,               // Full name (max 100 chars)
  registerNumber: String,         // Register number (unique, 13 digits)
  dob: Date,                      // Date of birth
  gender: String,                 // Gender: "Male", "Female", "Other"
  department: String,             // Department (default: "CSE", max 10 chars)
  year: String,                   // Year (default: "III", max 10 chars)
  email: String,                  // Email address (unique, lowercase)
  phoneNumber: String,            // Phone number (10 digits, starts with 6-9)
  address: String,                // Address (paragraph text, max 500 chars)
  religion: String,               // Religion (max 50 chars)
  quota: String,                  // Quota (max 50 chars)
  community: String,              // Community (max 50 chars)
  firstGraduate: Boolean,         // First graduate (default: false)
  otherState: Boolean,            // From other state (default: false)
  contactNo: String,              // Contact number (10 digits, starts with 6-9)
  section: String,                // Section (max 10 chars)
  dues: Number,                   // Total dues (default: 0, min: 0)
  cgpa: Number,                   // CGPA (min: 0, max: 10)
  createdAt: Date,                // Creation timestamp
  updatedAt: Date                 // Last update timestamp
}
```

### Virtual Fields
- `paidDuesAmount` - Calculated total of paid dues
- `pendingDuesAmount` - Calculated total of unpaid/pending dues

### Indexes
- `registerNumber` - Unique index
- `email` - Unique index
- Compound indexes:
  - `registerNumber, email`
  - `department, year`
  - `fullName, registerNumber`
  - `createdAt`

## Budgets Collection

### Schema
```javascript
{
  _id: ObjectId,
  budgetID: String,               // Unique budget ID
  title: String,                  // Budget title (max 200 chars)
  description: String,            // Budget description (max 1000 chars)
  total_budget: Number,           // Total budget amount (min: 0)
  spent: Number,                  // Amount spent (default: 0, min: 0)
  remaining: Number,              // Remaining amount (min: 0)
  expenses: [                     // Expense items
    {
      item: String,               // Expense item name (max 100 chars)
      amount: Number,             // Expense amount (min: 0)
      category: String            // Expense category (max 50 chars)
    }
  ],
  status: String,                 // Status: "pending", "approved", "rejected"
  proposedBy: ObjectId,           // Reference to User who proposed
  approvedBy: ObjectId,           // Reference to User who approved
  last_updated: Date,             // Last update timestamp
  approvedAt: Date,               // Approval timestamp
  createdAt: Date,                // Creation timestamp
  updatedAt: Date                 // Last update timestamp
}
```

### Virtual Fields
- `utilizationPercentage` - Percentage of budget utilized
- `totalExpenses` - Total of all expense items

### Indexes
- `budgetID` - Unique index
- `status` - Index for status-based queries
- `proposedBy` - Reference index
- `approvedBy` - Reference index
- `createdAt` - Index for time-based queries

## Dues Collection

### Schema
```javascript
{
  _id: ObjectId,
  dueID: Number,                  // Unique due ID
  student: ObjectId,              // Reference to Student
  amount: Number,                 // Due amount (min: 0)
  reason: String,                 // Reason for due (max 200 chars)
  dueDate: Date,                  // Due date
  status: String,                 // Status: "Unpaid", "Paid", "Pending Verification"
  paymentMethod: String,          // Payment method: "UPI", "Cash", "Bank Transfer"
  transactionRef: String,         // Transaction reference (max 100 chars)
  paidDate: Date,                 // Payment date
  verifiedDate: Date,             // Verification date
  verifiedBy: ObjectId,           // Reference to User who verified
  treasurerNotes: String,         // Treasurer notes (max 500 chars)
  upiTransactionId: String,       // UPI transaction ID (max 100 chars)
  paymentScreenshot: String,      // URL to payment screenshot (max 500 chars)
  createdAt: Date,                // Creation timestamp
  updatedAt: Date                 // Last update timestamp
}
```

### Virtual Fields
- `daysUntilDue` - Days remaining until due date
- `isOverdue` - Whether the due is past its due date

### Indexes
- `student` - Reference index
- `status` - Index for status-based queries
- `dueDate` - Index for date-based queries
- `createdAt` - Index for time-based queries
- Compound indexes:
  - `student, status`
  - `student, dueDate`
  - `status, dueDate`
  - `dueDate, status`
  - `verifiedBy, status`

## Transactions Collection

### Schema
```javascript
{
  _id: ObjectId,
  student: ObjectId,              // Reference to Student
  user: ObjectId,                 // Reference to User (required)
  due: ObjectId,                  // Reference to Due
  budget: ObjectId,               // Reference to Budget
  type: String,                   // Type: "income", "expense"
  category: String,               // Category: "dues", "budget", "food", "transport", etc.
  amount: Number,                 // Transaction amount (min: 0)
  description: String,            // Transaction description (max 500 chars)
  isStudentEntry: Boolean,        // Whether entry was made by student (default: false)
  paymentMethod: String,          // Payment method: "UPI", "Cash", "Bank Transfer"
  transactionRef: String,         // Transaction reference (max 100 chars)
  createdAt: Date,                // Creation timestamp
  updatedAt: Date                 // Last update timestamp
}
```

### Virtual Fields
- `typeDescription` - Human-readable description of transaction type
- `categoryDescription` - Human-readable description of category

### Indexes
- `user` - Reference index
- `type` - Index for type-based queries
- `category` - Index for category-based queries
- `createdAt` - Index for time-based queries
- `student` - Reference index
- `due` - Reference index
- `budget` - Reference index
- Compound indexes:
  - `user, type`
  - `user, category`
  - `user, createdAt`
  - `type, category`
  - `student, type`
  - `createdAt, type`

## StudentDetails Collection

### Schema
```javascript
{
  _id: ObjectId,
  registerNumber: String,         // Register number (unique, references Student)
  gender: String,                 // Gender: "Male", "Female", "Other"
  religion: String,               // Religion (max 50 chars)
  quota: String,                  // Quota (max 50 chars)
  community: String,              // Community (max 50 chars)
  firstGraduate: Boolean,         // First graduate (default: false)
  otherState: Boolean,            // From other state (default: false)
  contactNo: String,              // Contact number (10 digits, starts with 6-9)
  createdAt: Date,                // Creation timestamp
  updatedAt: Date                 // Last update timestamp
}
```

### Indexes
- `registerNumber` - Unique index
- `community` - Index for community-based queries
- `quota` - Index for quota-based queries
- `firstGraduate` - Index for first graduate queries
- `otherState` - Index for state-based queries

## Relationships

### User - Student
- One-to-One relationship
- `users.registerNumber` links to `students.registerNumber`

### Student - Dues
- One-to-Many relationship
- `dues.student` references `students._id`

### User - Budget
- One-to-Many relationship
- `budgets.proposedBy` and `budgets.approvedBy` reference `users._id`

### Student - Transactions
- One-to-Many relationship
- `transactions.student` references `students._id`

### User - Transactions
- One-to-Many relationship
- `transactions.user` references `users._id`

### Due - Transaction
- One-to-One relationship
- `transactions.due` references `dues._id`

### Budget - Transaction
- One-to-Many relationship
- `transactions.budget` references `budgets._id`

## Optimizations Implemented

### 1. Enhanced Validation
- Added length constraints on text fields
- Improved regex patterns for phone numbers and register numbers
- Added min/max constraints on numeric fields
- Added lowercase transformation for email fields

### 2. Improved Indexing
- Added createdAt indexes for time-based queries
- Added compound indexes for common query patterns
- Optimized existing indexes for better performance

### 3. Virtual Fields
- Added calculated fields for better data access
- Added descriptive fields for better UX

### 4. Data Consistency
- Added proper referencing between collections
- Added sparse indexes for optional unique fields
- Added default values for boolean fields

### 5. Performance Improvements
- Reduced unnecessary fields
- Added proper data types and constraints
- Optimized schema structure for common operations

## Sample Data

### User Document
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "sNo": 1,
  "registerNumber": "21CSE001",
  "name": "John Doe",
  "email": "john@example.com",
  "contactNo": "9876543210",
  "role": "Student",
  "password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S",
  "lastLogin": ISODate("2023-06-01T10:30:00.000Z"),
  "isActive": true,
  "createdAt": ISODate("2023-01-01T00:00:00.000Z"),
  "updatedAt": ISODate("2023-06-01T10:30:00.000Z")
}
```

### Student Document
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439012"),
  "fullName": "John Doe",
  "registerNumber": "21CSE001",
  "dob": ISODate("2000-01-01T00:00:00.000Z"),
  "gender": "Male",
  "department": "CSE",
  "year": "III",
  "email": "john@example.com",
  "phoneNumber": "9876543210",
  "address": "123 Main Street, City, State",
  "religion": "Hindu",
  "quota": "Merit",
  "community": "General",
  "firstGraduate": false,
  "otherState": false,
  "contactNo": "9876543210",
  "section": "A",
  "dues": 0,
  "cgpa": 8.5,
  "createdAt": ISODate("2023-01-01T00:00:00.000Z"),
  "updatedAt": ISODate("2023-01-01T00:00:00.000Z")
}
```

### Budget Document
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439013"),
  "budgetID": "BUDGET-2023-001",
  "title": "Class Budget 2023",
  "description": "Annual class budget for 2023",
  "total_budget": 10000,
  "spent": 2500,
  "remaining": 7500,
  "expenses": [
    {
      "item": "Stationery",
      "amount": 1000,
      "category": "supplies"
    },
    {
      "item": "Events",
      "amount": 1500,
      "category": "activities"
    }
  ],
  "status": "approved",
  "proposedBy": ObjectId("507f1f77bcf86cd799439014"),
  "approvedBy": ObjectId("507f1f77bcf86cd799439015"),
  "last_updated": ISODate("2023-06-01T00:00:00.000Z"),
  "approvedAt": ISODate("2023-06-01T00:00:00.000Z"),
  "createdAt": ISODate("2023-01-01T00:00:00.000Z"),
  "updatedAt": ISODate("2023-06-01T00:00:00.000Z")
}
```

### Due Document
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439016"),
  "dueID": 1234567890,
  "student": ObjectId("507f1f77bcf86cd799439012"),
  "amount": 150,
  "reason": "Library Fee",
  "dueDate": ISODate("2023-12-31T00:00:00.000Z"),
  "status": "Unpaid",
  "paymentMethod": null,
  "transactionRef": null,
  "paidDate": null,
  "verifiedDate": null,
  "verifiedBy": null,
  "treasurerNotes": "",
  "upiTransactionId": null,
  "paymentScreenshot": null,
  "createdAt": ISODate("2023-01-01T00:00:00.000Z"),
  "updatedAt": ISODate("2023-01-01T00:00:00.000Z")
}
```

### Transaction Document
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439017"),
  "student": ObjectId("507f1f77bcf86cd799439012"),
  "user": ObjectId("507f1f77bcf86cd799439011"),
  "due": ObjectId("507f1f77bcf86cd799439016"),
  "type": "income",
  "category": "dues",
  "amount": 150,
  "description": "Library fee payment - John Doe",
  "isStudentEntry": false,
  "paymentMethod": "UPI",
  "transactionRef": "TXN1234567890",
  "createdAt": ISODate("2023-01-15T00:00:00.000Z"),
  "updatedAt": ISODate("2023-01-15T00:00:00.000Z")
}
```

### StudentDetail Document
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439018"),
  "registerNumber": "21CSE001",
  "gender": "Male",
  "religion": "Hindu",
  "quota": "Merit",
  "community": "General",
  "firstGraduate": false,
  "otherState": false,
  "contactNo": "9876543210",
  "createdAt": ISODate("2023-01-01T00:00:00.000Z"),
  "updatedAt": ISODate("2023-01-01T00:00:00.000Z")
}
```