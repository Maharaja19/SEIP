require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Models
const User = require('../src/models/user');
const Student = require('../src/models/student');
const Organization = require('../src/models/organization');
const Wallet = require('../src/models/wallet');
const WalletLedger = require('../src/models/walletLedger');
const Transaction = require('../src/models/transactions');
const Budget = require('../src/models/budget');
const Due = require('../src/models/dues');
const AIInsight = require('../src/models/aiInsight');

const { signAuthToken } = require('../src/utils/jwtHelper');

const BASE_URL = 'http://localhost:5000/api';

async function runVerification() {
  console.log('\n================================================================');
  console.log('🚀 SEIP BASELINE COMPREHENSIVE VERIFICATION SUITE');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB:', process.env.MONGO_URI);

  const results = {
    authAndSync: false,
    settingsPersistence: false,
    rbac: false,
    multiTenantIsolation: false,
    modelsPersistence: false
  };

  // -------------------------------------------------------------
  // 1. Multi-Tenant Setup: Create Org A and Org B
  // -------------------------------------------------------------
  console.log('\n--- [1] Setting up Multi-Tenant Organizations ---');
  let adminCreator = await User.findOne({ email: 'superadmin@gct.ac.in' });
  if (!adminCreator) {
    const lastUser = await User.findOne({}, { sNo: 1 }).sort({ sNo: -1 });
    adminCreator = await User.create({
      sNo: (lastUser?.sNo || 5000) + 1,
      name: 'Super Admin',
      email: 'superadmin@gct.ac.in',
      role: 'Super Admin',
      onboardingCompleted: true
    });
  }

  let orgA = await Organization.findOne({ name: 'Department of CSE (Org A)' });
  if (!orgA) {
    orgA = await Organization.create({
      name: 'Department of CSE (Org A)',
      type: 'Department',
      createdBy: adminCreator._id
    });
  }
  let orgB = await Organization.findOne({ name: 'Department of ECE (Org B)' });
  if (!orgB) {
    orgB = await Organization.create({
      name: 'Department of ECE (Org B)',
      type: 'Department',
      createdBy: adminCreator._id
    });
  }
  console.log('✅ Org A ID:', orgA._id.toString());
  console.log('✅ Org B ID:', orgB._id.toString());

  // -------------------------------------------------------------
  // 2. Authenticated Flow & User/Student/Wallet Sync
  // -------------------------------------------------------------
  console.log('\n--- [2] Google OAuth Simulation, Onboarding & Student/Wallet Sync ---');
  let studentUser = await User.findOne({ email: 'verify.student@gct.ac.in' });
  if (!studentUser) {
    const lastUser = await User.findOne({}, { sNo: 1 }).sort({ sNo: -1 });
    const sNo = lastUser?.sNo ? lastUser.sNo + 1 : 1001;
    studentUser = await User.create({
      sNo,
      email: 'verify.student@gct.ac.in',
      name: 'Verification Student',
      googleId: 'google_verify_student_99',
      role: 'Member',
      organizationId: orgA._id,
      onboardingCompleted: false
    });
  } else {
    studentUser.onboardingCompleted = false;
    studentUser.registerNumber = undefined;
    studentUser.organizationId = orgA._id;
    await studentUser.save();
    await Student.deleteOne({ user: studentUser._id });
  }

  const studentToken = signAuthToken(studentUser);
  console.log('🔑 Generated Student JWT Token');

  // Verify GET /auth/me
  const meRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  const meData = await meRes.json();
  if (meRes.status === 200 && meData.user?.email === 'verify.student@gct.ac.in') {
    console.log('✅ GET /api/auth/me verified successfully');
  } else {
    throw new Error('GET /api/auth/me failed: ' + JSON.stringify(meData));
  }

  // Submit Onboarding
  const onboardingPayload = {
    registerNumber: '727823TUEE099',
    branch: 'CSE',
    batch: '2023-2027',
    year: '3rd Year',
    hasWallet: true,
    monthlyIncome: 6000,
    monthlyExpense: 3500,
    savingsGoal: 2500,
    spendingCategories: ['Food & Dining', 'Books & Study'],
    aiPreferences: { insights: true, forecasting: true, recommendations: true },
    termsAccepted: true,
    privacyAccepted: true,
    analyticsConsent: true
  };

  const obRes = await fetch(`${BASE_URL}/auth/onboarding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify(onboardingPayload)
  });
  const obData = await obRes.json();
  if (obRes.status !== 200 || !obData.success) {
    throw new Error('Onboarding failed: ' + JSON.stringify(obData));
  }
  console.log('✅ POST /api/auth/onboarding succeeded');

  const refreshedToken = obData.token || studentToken;

  // Verify Student Document in DB
  const verifiedStudent = await Student.findOne({ user: studentUser._id });
  if (!verifiedStudent || verifiedStudent.registerNumber !== '727823TUEE099') {
    throw new Error('Student document not provisioned or mismatch');
  }
  console.log('✅ Student record verified in MongoDB (ID:', verifiedStudent._id.toString(), 'Reg:', verifiedStudent.registerNumber, ')');

  // Verify Wallet in DB
  const verifiedWallet = await Wallet.findOne({ student: verifiedStudent._id });
  if (!verifiedWallet) {
    throw new Error('Wallet not auto-provisioned for student');
  }
  console.log('✅ Wallet record verified in MongoDB (ID:', verifiedWallet._id.toString(), 'Balance:', verifiedWallet.balance, ')');

  // Verify /api/students/me
  const studentMeRes = await fetch(`${BASE_URL}/students/me`, {
    headers: { 'Authorization': `Bearer ${refreshedToken}` }
  });
  const studentMeData = await studentMeRes.json();
  if (studentMeRes.status === 200 && studentMeData.success) {
    console.log('✅ GET /api/students/me resolved without "User not found" error');
  } else {
    throw new Error('GET /api/students/me failed: ' + JSON.stringify(studentMeData));
  }

  // Verify /api/features/wallet/balance
  const walletRes = await fetch(`${BASE_URL}/features/wallet/balance`, {
    headers: { 'Authorization': `Bearer ${refreshedToken}` }
  });
  const walletData = await walletRes.json();
  if (walletRes.status === 200 && walletData.success) {
    console.log('✅ GET /api/features/wallet/balance resolved successfully (Balance: ' + walletData.data?.balance + ')');
  } else {
    throw new Error('GET /api/features/wallet/balance failed: ' + JSON.stringify(walletData));
  }

  results.authAndSync = true;

  // -------------------------------------------------------------
  // 3. Settings & Profile Persistence Test
  // -------------------------------------------------------------
  console.log('\n--- [3] Testing Profile & Settings Persistence ---');
  const updateSettingsRes = await fetch(`${BASE_URL}/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${refreshedToken}`
    },
    body: JSON.stringify({
      name: 'Verification Student Updated',
      contactNo: '9876543219',
      branch: 'CSE',
      year: '4th Year',
      notifications: { emailNotifications: true, smsNotifications: true },
      appearance: { theme: 'dark' }
    })
  });
  const updateSettingsData = await updateSettingsRes.json();
  if (updateSettingsRes.status === 200 && updateSettingsData.success) {
    console.log('✅ PUT /api/settings updated successfully');
  } else {
    throw new Error('PUT /api/settings failed: ' + JSON.stringify(updateSettingsData));
  }

  // Verify persistence in both User and Student DB records
  const dbUserAfter = await User.findById(studentUser._id);
  const dbStudentAfter = await Student.findOne({ user: studentUser._id });
  if (
    dbUserAfter.name === 'Verification Student Updated' &&
    dbUserAfter.contactNo === '9876543219' &&
    dbUserAfter.settings?.appearance?.theme === 'dark' &&
    dbStudentAfter.fullName === 'Verification Student Updated' &&
    dbStudentAfter.phoneNumber === '9876543219'
  ) {
    console.log('✅ Persistent sync verified across both User and Student MongoDB documents');
    results.settingsPersistence = true;
  } else {
    throw new Error('Settings persistence mismatch in database');
  }

  // -------------------------------------------------------------
  // 4. Role-Based Access Control (RBAC) Verification
  // -------------------------------------------------------------
  console.log('\n--- [4] Testing Role-Based Access Control (Member, Treasurer, Admin, Super Admin) ---');

  // Create or retrieve Finance Manager (Treasurer)
  let treasurerUser = await User.findOne({ email: 'treasurer.verify@gct.ac.in' });
  if (!treasurerUser) {
    const lastUser = await User.findOne({}, { sNo: 1 }).sort({ sNo: -1 });
    treasurerUser = await User.create({
      sNo: (lastUser?.sNo || 2000) + 1,
      email: 'treasurer.verify@gct.ac.in',
      name: 'Treasurer Verify',
      role: 'Finance Manager',
      organizationId: orgA._id,
      onboardingCompleted: true
    });
  }
  const treasurerToken = signAuthToken(treasurerUser);

  // Create or retrieve Organization Admin
  let adminUser = await User.findOne({ email: 'admin.verify@gct.ac.in' });
  if (!adminUser) {
    const lastUser = await User.findOne({}, { sNo: 1 }).sort({ sNo: -1 });
    adminUser = await User.create({
      sNo: (lastUser?.sNo || 3000) + 1,
      email: 'admin.verify@gct.ac.in',
      name: 'Admin Verify',
      role: 'Organization Admin',
      organizationId: orgA._id,
      onboardingCompleted: true
    });
  }
  const adminToken = signAuthToken(adminUser);

  // Member should get 403 on /api/dues (Treasurer/Admin only)
  const memberDuesRes = await fetch(`${BASE_URL}/dues`, {
    headers: { 'Authorization': `Bearer ${refreshedToken}` }
  });
  console.log('🔒 Member accessing /api/dues -> Status:', memberDuesRes.status, '(Expected: 403)');
  if (memberDuesRes.status !== 403) throw new Error('RBAC Failed: Member accessed /api/dues without 403');

  // Treasurer should get 200 on /api/dues
  const treasurerDuesRes = await fetch(`${BASE_URL}/dues`, {
    headers: { 'Authorization': `Bearer ${treasurerToken}` }
  });
  console.log('🔓 Treasurer accessing /api/dues -> Status:', treasurerDuesRes.status, '(Expected: 200)');
  if (treasurerDuesRes.status !== 200) throw new Error('RBAC Failed: Treasurer rejected on /api/dues');

  // Treasurer should get 200 on /api/transactions
  const treasurerTxnRes = await fetch(`${BASE_URL}/transactions`, {
    headers: { 'Authorization': `Bearer ${treasurerToken}` }
  });
  console.log('🔓 Treasurer accessing /api/transactions -> Status:', treasurerTxnRes.status, '(Expected: 200)');
  if (treasurerTxnRes.status !== 200) throw new Error('RBAC Failed: Treasurer rejected on /api/transactions');

  // Admin should get 200 on /api/students
  const adminStudentsRes = await fetch(`${BASE_URL}/students`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log('🔓 Admin accessing /api/students -> Status:', adminStudentsRes.status, '(Expected: 200)');
  if (adminStudentsRes.status !== 200) throw new Error('RBAC Failed: Admin rejected on /api/students');

  results.rbac = true;

  // -------------------------------------------------------------
  // 5. Multi-Tenant Data Isolation Verification
  // -------------------------------------------------------------
  console.log('\n--- [5] Testing Multi-Tenant Data Isolation (Org A vs Org B) ---');

  // Create Org B Treasurer
  let treasurerB = await User.findOne({ email: 'treasurer.orgb@gct.ac.in' });
  if (!treasurerB) {
    const lastUser = await User.findOne({}, { sNo: 1 }).sort({ sNo: -1 });
    treasurerB = await User.create({
      sNo: (lastUser?.sNo || 4000) + 1,
      email: 'treasurer.orgb@gct.ac.in',
      name: 'Treasurer Org B',
      role: 'Finance Manager',
      organizationId: orgB._id,
      onboardingCompleted: true
    });
  }
  const tokenOrgB = signAuthToken(treasurerB);

  // Clear existing dues in both orgs for test determinism
  await Due.deleteMany({ organization: { $in: [orgA._id, orgB._id] } });

  // Create a Due in Org A
  const dueA = await Due.create({
    reason: 'Org A Annual Fee',
    amount: 1500,
    dueDate: new Date(Date.now() + 864000000),
    organization: orgA._id,
    student: verifiedStudent._id
  });

  // Create a Due in Org B
  let dummyStudentB = await Student.findOne({ registerNumber: '727823TUEE998' });
  if (!dummyStudentB) {
    dummyStudentB = await Student.create({
      fullName: 'Student Org B',
      registerNumber: '727823TUEE998',
      email: 'student.b@gct.ac.in',
      phoneNumber: '9876543211',
      dob: new Date('2000-01-01'),
      gender: 'Other',
      organization: orgB._id
    });
  }
  const dueB = await Due.create({
    reason: 'Org B Lab Equipment Due',
    amount: 3000,
    dueDate: new Date(Date.now() + 864000000),
    organization: orgB._id,
    student: dummyStudentB._id
  });

  // Query dues as Org A Treasurer
  const duesOrgARes = await fetch(`${BASE_URL}/dues`, {
    headers: { 'Authorization': `Bearer ${treasurerToken}` }
  });
  const duesOrgA = await duesOrgARes.json();
  const orgAItems = duesOrgA.data || [];

  // Query dues as Org B Treasurer
  const duesOrgBRes = await fetch(`${BASE_URL}/dues`, {
    headers: { 'Authorization': `Bearer ${tokenOrgB}` }
  });
  const duesOrgB = await duesOrgBRes.json();
  const orgBItems = duesOrgB.data || [];

  const orgAHasOrgBData = orgAItems.some(d => d.reason === 'Org B Lab Equipment Due');
  const orgBHasOrgAData = orgBItems.some(d => d.reason === 'Org A Annual Fee');

  if (orgAHasOrgBData || orgBHasOrgAData) {
    throw new Error('Tenant isolation breach detected!');
  }
  console.log('✅ Multi-tenant isolation verified: Org A see only Org A records (Count:', orgAItems.length, '), Org B see only Org B records (Count:', orgBItems.length, ')');
  results.multiTenantIsolation = true;

  // -------------------------------------------------------------
  // 6. MongoDB Persistence Check Across All Core Models
  // -------------------------------------------------------------
  console.log('\n--- [6] Testing Model Persistence Across Database Collections ---');

  // Budget
  const budget = await Budget.create({
    title: 'Verification Budget 2026',
    allocated: 50000,
    remaining: 50000,
    total_budget: 50000,
    category: 'Events',
    organization: orgA._id,
    proposedBy: studentUser._id
  });
  console.log('✅ Budget created & persisted (ID:', budget._id.toString(), ')');

  // Transaction
  const txn = await Transaction.create({
    user: studentUser._id,
    organization: orgA._id,
    amount: 250,
    type: 'expense',
    category: 'food',
    paymentMethod: 'UPI'
  });
  console.log('✅ Transaction created & persisted (ID:', txn._id.toString(), ')');

  // WalletLedger
  const ledger = await WalletLedger.create({
    user: studentUser._id,
    student: verifiedStudent._id,
    organization: orgA._id,
    type: 'TOPUP',
    amount: 500,
    balanceBefore: 0,
    balanceAfter: 500,
    note: 'Initial deposit verification'
  });
  console.log('✅ WalletLedger created & persisted (ID:', ledger._id.toString(), ')');

  // AIInsight
  const insight = await AIInsight.create({
    organization: orgA._id,
    title: 'Spending Pattern Detected',
    message: 'Food & Dining is the primary expense category.',
    type: 'alert',
    severity: 'medium'
  });
  console.log('✅ AIInsight created & persisted (ID:', insight._id.toString(), ')');

  results.modelsPersistence = true;

  console.log('\n================================================================');
  console.log('📊 FINAL BASELINE VERIFICATION RESULTS:');
  console.log('================================================================');
  console.log('1. Auth, Onboarding & User/Student/Wallet Sync:', results.authAndSync ? 'PASSED ✅' : 'FAILED ❌');
  console.log('2. Profile & Settings Persistence:', results.settingsPersistence ? 'PASSED ✅' : 'FAILED ❌');
  console.log('3. Role-Based Access Control (RBAC):', results.rbac ? 'PASSED ✅' : 'FAILED ❌');
  console.log('4. Multi-Tenant Data Isolation:', results.multiTenantIsolation ? 'PASSED ✅' : 'FAILED ❌');
  console.log('5. Core Models DB Persistence:', results.modelsPersistence ? 'PASSED ✅' : 'FAILED ❌');
  console.log('================================================================\n');

  process.exit(0);
}

runVerification().catch(err => {
  console.error('\n❌ VERIFICATION RUN FAILED:', err);
  process.exit(1);
});
