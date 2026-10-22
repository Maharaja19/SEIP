const request = require('supertest');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const app = require('../server');

const User = require('../src/models/user');
const Organization = require('../src/models/organization');
const Membership = require('../src/models/membership');
const Wallet = require('../src/models/wallet');
const WalletLedger = require('../src/models/walletLedger');
const Transaction = require('../src/models/transactions');
const Budget = require('../src/models/budget');
const Category = require('../src/models/category');
const AuditLog = require('../src/models/auditLog');
const { USER_ROLES } = require('../src/utils/roles');

describe('Financial Core Verification Suite', () => {
  let orgA;
  let orgB;
  let hashedPassword;

  let memberUserA;
  let memberTokenA;

  let memberUserA2;
  let memberTokenA2;

  let financeManagerA;
  let financeManagerTokenA;

  let orgAdminA;
  let orgAdminTokenA;

  let superAdminUser;
  let superAdminToken;

  let memberUserB;
  let memberTokenB;

  beforeEach(async () => {
    hashedPassword = await bcrypt.hash('password123', 10);

    // Create Organizations
    orgA = await Organization.create({
      name: 'Acme Corp',
      legalName: 'Acme Corporation Ltd.',
      slug: 'acme-corp',
      type: 'COMPANY',
      currency: 'INR'
    });

    orgB = await Organization.create({
      name: 'Beta Global',
      legalName: 'Beta Global Inc.',
      slug: 'beta-global',
      type: 'STARTUP',
      currency: 'USD'
    });

    // 1. Member in Org A
    memberUserA = await User.create({
      sNo: 101,
      name: 'Alice Member',
      email: 'alice@acme.com',
      password: hashedPassword,
      role: USER_ROLES.MEMBER,
      organizationId: orgA._id,
      isActive: true
    });
    memberTokenA = global.createTestToken(memberUserA);

    // 2. Second Member in Org A (for transfer tests)
    memberUserA2 = await User.create({
      sNo: 102,
      name: 'Bob Peer',
      email: 'bob@acme.com',
      password: hashedPassword,
      role: USER_ROLES.MEMBER,
      organizationId: orgA._id,
      isActive: true
    });
    memberTokenA2 = global.createTestToken(memberUserA2);

    // 3. Finance Manager in Org A
    financeManagerA = await User.create({
      sNo: 103,
      name: 'Fiona Finance',
      email: 'fiona@acme.com',
      password: hashedPassword,
      role: USER_ROLES.FINANCE_MANAGER,
      organizationId: orgA._id,
      isActive: true
    });
    financeManagerTokenA = global.createTestToken(financeManagerA);

    // 4. Org Admin in Org A
    orgAdminA = await User.create({
      sNo: 104,
      name: 'Adam Admin',
      email: 'admin@acme.com',
      password: hashedPassword,
      role: USER_ROLES.ORGANIZATION_ADMIN,
      organizationId: orgA._id,
      isActive: true
    });
    orgAdminTokenA = global.createTestToken(orgAdminA);

    // 5. Super Admin
    superAdminUser = await User.create({
      sNo: 999,
      name: 'Sam SuperAdmin',
      email: 'super@platform.com',
      password: hashedPassword,
      role: USER_ROLES.SUPER_ADMIN,
      isActive: true
    });
    superAdminToken = global.createTestToken(superAdminUser);

    // 6. Member in Org B (for cross-tenant checks)
    memberUserB = await User.create({
      sNo: 201,
      name: 'Charlie Beta',
      email: 'charlie@beta.com',
      password: hashedPassword,
      role: USER_ROLES.MEMBER,
      organizationId: orgB._id,
      isActive: true
    });
    memberTokenB = global.createTestToken(memberUserB);

    // Create default memberships
    await Membership.create({
      organization: orgA._id,
      user: memberUserA._id,
      role: USER_ROLES.MEMBER,
      status: 'active'
    });

    await Membership.create({
      organization: orgA._id,
      user: memberUserA2._id,
      role: USER_ROLES.MEMBER,
      status: 'active'
    });

    await Membership.create({
      organization: orgA._id,
      user: financeManagerA._id,
      role: USER_ROLES.FINANCE_MANAGER,
      status: 'active'
    });

    await Membership.create({
      organization: orgA._id,
      user: orgAdminA._id,
      role: USER_ROLES.ORGANIZATION_ADMIN,
      status: 'active'
    });

    await Membership.create({
      organization: orgB._id,
      user: memberUserB._id,
      role: USER_ROLES.MEMBER,
      status: 'active'
    });
  });

  // ==========================================
  // 1. WALLET + LEDGER VERIFICATION
  // ==========================================
  describe('1. Wallet & Ledger Behavior', () => {
    it('should initialize and resolve wallet balance to 0 for a new member', async () => {
      const res = await request(app)
        .get('/api/wallet/balance')
        .set('Authorization', `Bearer ${memberTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.balance).toBe(0);
    });

    it('should credit/topup wallet, update balance, create TOPUP ledger entry and audit log', async () => {
      const res = await request(app)
        .post('/api/wallet/topup')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({ amount: 1500, note: 'Initial funding', reference: 'TOPUP-REF-1001' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.balance).toBe(1500);

      // Verify wallet document in database
      const wallet = await Wallet.findOne({ owner: memberUserA._id });
      expect(wallet).toBeDefined();
      expect(wallet.balance).toBe(1500);

      // Verify ledger entry
      const ledgerEntry = await WalletLedger.findOne({ reference: 'TOPUP-REF-1001' });
      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry.type).toBe('TOPUP');
      expect(ledgerEntry.amount).toBe(1500);
      expect(ledgerEntry.balanceBefore).toBe(0);
      expect(ledgerEntry.balanceAfter).toBe(1500);

      // Verify audit log
      const audit = await AuditLog.findOne({ action: 'WALLET_TOPUP', entityId: wallet._id });
      expect(audit).toBeDefined();
      expect(audit.entityType).toBe('WALLET');
    });

    it('should protect against replayed/duplicate credit transactions using reference', async () => {
      // First credit
      await request(app)
        .post('/api/wallet/topup')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({ amount: 1000, reference: 'IDEMPOTENT-KEY-001' });

      // Duplicate submission
      const replayRes = await request(app)
        .post('/api/wallet/topup')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({ amount: 1000, reference: 'IDEMPOTENT-KEY-001' });

      expect(replayRes.status).toBe(200);
      expect(replayRes.body.data.duplicate).toBe(true);

      // Balance must remain 1000, not 2000
      const wallet = await Wallet.findOne({ owner: memberUserA._id });
      expect(wallet.balance).toBe(1000);
    });

    it('should reject invalid or negative amounts on topup', async () => {
      const res = await request(app)
        .post('/api/wallet/topup')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({ amount: -500 });

      expect(res.status).toBe(400);
      expect(res.body.message || res.body.error).toMatch(/positive/i);
    });

    it('should debit wallet with sufficient balance and record DEBIT ledger entry', async () => {
      // Setup balance of 2000
      await request(app)
        .post('/api/wallet/topup')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({ amount: 2000, reference: 'SETUP-TOPUP' });

      // Perform debit of 750
      const debitRes = await request(app)
        .post('/api/wallet/debit')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({ amount: 750, note: 'Cafeteria expense', reference: 'DEBIT-REF-1002' });

      expect(debitRes.status).toBe(200);
      expect(debitRes.body.data.balance).toBe(1250);

      // Verify DB balance
      const wallet = await Wallet.findOne({ owner: memberUserA._id });
      expect(wallet.balance).toBe(1250);

      // Verify DEBIT ledger entry
      const ledger = await WalletLedger.findOne({ reference: 'DEBIT-REF-1002' });
      expect(ledger.type).toBe('DEBIT');
      expect(ledger.amount).toBe(750);
      expect(ledger.balanceBefore).toBe(2000);
      expect(ledger.balanceAfter).toBe(1250);
    });

    it('should reject debit when balance is insufficient (negative protection)', async () => {
      // Wallet has 0 balance initially
      const debitRes = await request(app)
        .post('/api/wallet/debit')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({ amount: 500 });

      expect(debitRes.status).toBe(400);
      expect(debitRes.body.message || debitRes.body.error).toMatch(/insufficient/i);
    });

    it('should transfer funds to another member within the same organization with double-entry ledger', async () => {
      // Give sender 1000
      await request(app)
        .post('/api/wallet/topup')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({ amount: 1000 });

      // Transfer 400 from Alice (memberUserA) to Bob (memberUserA2)
      const transferRes = await request(app)
        .post('/api/wallet/transfer')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({
          recipientId: memberUserA2._id.toString(),
          amount: 400,
          note: 'Project contribution',
          reference: 'TX-TRANSFER-55'
        });

      expect(transferRes.status).toBe(200);
      expect(transferRes.body.data.balance).toBe(600);

      // Check recipient balance
      const bobWallet = await Wallet.findOne({ owner: memberUserA2._id });
      expect(bobWallet.balance).toBe(400);

      // Check double-entry ledgers
      const outLedger = await WalletLedger.findOne({ reference: 'TX-TRANSFER-55_OUT' });
      expect(outLedger.type).toBe('TRANSFER_OUT');
      expect(outLedger.amount).toBe(400);
      expect(outLedger.balanceBefore).toBe(1000);
      expect(outLedger.balanceAfter).toBe(600);

      const inLedger = await WalletLedger.findOne({ reference: 'TX-TRANSFER-55_IN' });
      expect(inLedger.type).toBe('TRANSFER_IN');
      expect(inLedger.amount).toBe(400);
      expect(inLedger.balanceBefore).toBe(0);
      expect(inLedger.balanceAfter).toBe(400);
    });

    it('should reject self-transfer', async () => {
      const res = await request(app)
        .post('/api/wallet/transfer')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({
          recipientId: memberUserA._id.toString(),
          amount: 100
        });

      expect(res.status).toBe(400);
      expect(res.body.message || res.body.error).toMatch(/yourself/i);
    });

    it('should enforce organization isolation: prevent transfer to member of different organization', async () => {
      // Topup sender
      await request(app)
        .post('/api/wallet/topup')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({ amount: 1000 });

      // Attempt transfer to Charlie in Org B
      const res = await request(app)
        .post('/api/wallet/transfer')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({
          recipientId: memberUserB._id.toString(),
          amount: 250
        });

      expect(res.status).toBe(403);
      expect(res.body.message || res.body.error).toMatch(/cross-organization/i);
    });

    it('should retrieve chronological ledger history scoped to user', async () => {
      await request(app)
        .post('/api/wallet/topup')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({ amount: 500, note: 'Step 1' });

      await request(app)
        .post('/api/wallet/debit')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({ amount: 200, note: 'Step 2' });

      const res = await request(app)
        .get('/api/wallet/ledger')
        .set('Authorization', `Bearer ${memberTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.balance).toBe(300);
      expect(res.body.data.ledgerItems.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.ledgerItems[0].balanceAfter).toBe(300);
    });
  });

  // ==========================================
  // 2. TRANSACTIONS VERIFICATION
  // ==========================================
  describe('2. Transaction CRUD, Types, and Isolation', () => {
    it('should create income, expense, and transfer transactions with currency support', async () => {
      // 1. Income transaction
      const incomeRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({
          type: 'income',
          amount: 5000,
          category: 'salary',
          description: 'Consulting revenue',
          currency: 'INR'
        });

      expect(incomeRes.status).toBe(201);
      expect(incomeRes.body.data.type).toBe('income');
      expect(incomeRes.body.data.amount).toBe(5000);
      expect(incomeRes.body.data.currency).toBe('INR');

      // 2. Expense transaction
      const expenseRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({
          type: 'expense',
          amount: 350,
          category: 'food',
          description: 'Team lunch',
          currency: 'INR'
        });

      expect(expenseRes.status).toBe(201);
      expect(expenseRes.body.data.type).toBe('expense');
      expect(expenseRes.body.data.amount).toBe(350);

      // 3. Transfer transaction
      const transferRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({
          type: 'transfer',
          amount: 1200,
          category: 'misc',
          description: 'Internal transfer',
          currency: 'INR'
        });

      expect(transferRes.status).toBe(201);
      expect(transferRes.body.data.type).toBe('transfer');
      expect(transferRes.body.data.amount).toBe(1200);
    });

    it('should reject transactions with invalid amounts (negative or zero)', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({
          type: 'expense',
          amount: -100,
          category: 'food'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject transactions with invalid dates', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({
          type: 'expense',
          amount: 100,
          date: 'not-a-valid-date-string'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should allow reading own transaction, but reject unauthorized Member reading another Member transaction (IDOR)', async () => {
      // Alice creates transaction
      const tx = await Transaction.create({
        user: memberUserA._id,
        organization: orgA._id,
        type: 'expense',
        amount: 250,
        category: 'food',
        description: 'Secret lunch'
      });

      // Alice reads her own transaction -> 200
      const aliceRes = await request(app)
        .get(`/api/transactions/${tx._id}`)
        .set('Authorization', `Bearer ${memberTokenA}`);
      expect(aliceRes.status).toBe(200);
      expect(aliceRes.body.data.amount).toBe(250);

      // Bob (memberUserA2) attempts to read Alice's transaction -> 403 Forbidden
      const bobRes = await request(app)
        .get(`/api/transactions/${tx._id}`)
        .set('Authorization', `Bearer ${memberTokenA2}`);
      expect(bobRes.status).toBe(403);
    });

    it('should allow owner to update personal transaction, but reject other Members (IDOR)', async () => {
      const tx = await Transaction.create({
        user: memberUserA._id,
        organization: orgA._id,
        type: 'expense',
        amount: 150,
        category: 'books',
        description: 'Tech book',
        isStudentEntry: true
      });

      // Bob tries to update Alice's transaction -> 403
      const bobUpdate = await request(app)
        .put(`/api/transactions/${tx._id}`)
        .set('Authorization', `Bearer ${memberTokenA2}`)
        .send({ amount: 999 });
      expect(bobUpdate.status).toBe(403);

      // Alice updates her own transaction -> 200
      const aliceUpdate = await request(app)
        .put(`/api/transactions/${tx._id}`)
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({ description: 'Updated Tech Book' });
      expect(aliceUpdate.status).toBe(200);
      expect(aliceUpdate.body.data.description).toBe('Updated Tech Book');
    });

    it('should allow voiding a transaction and log TRANSACTION_VOIDED audit', async () => {
      const tx = await Transaction.create({
        user: memberUserA._id,
        organization: orgA._id,
        type: 'expense',
        amount: 80,
        category: 'food',
        status: 'completed'
      });

      const res = await request(app)
        .post(`/api/transactions/${tx._id}/void`)
        .set('Authorization', `Bearer ${memberTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('voided');

      // Verify audit log entry
      const audit = await AuditLog.findOne({ action: 'TRANSACTION_VOIDED', entityId: tx._id });
      expect(audit).toBeDefined();
      expect(audit.details.status).toBe('voided');
    });

    it('should enforce organization isolation: cannot read transaction from another organization', async () => {
      // Transaction in Org B
      const txB = await Transaction.create({
        user: memberUserB._id,
        organization: orgB._id,
        type: 'expense',
        amount: 300,
        category: 'bills'
      });

      // Alice in Org A tries to fetch txB -> 404 Not Found (scoped out by org filter)
      const res = await request(app)
        .get(`/api/transactions/${txB._id}`)
        .set('Authorization', `Bearer ${memberTokenA}`);

      expect(res.status).toBe(404);
    });
  });

  // ==========================================
  // 3. BUDGETS VERIFICATION
  // ==========================================
  describe('3. Budget Determinism, Utilization, and Boundaries', () => {
    it('should calculate deterministic spent, remaining, and utilization percentage', async () => {
      const budgetRes = await request(app)
        .post('/api/budget')
        .set('Authorization', `Bearer ${financeManagerTokenA}`)
        .send({
          title: 'Q4 Marketing Budget',
          total_budget: 10000,
          period: 'MONTHLY',
          category: 'marketing',
          expenses: [
            { item: 'Google Ads', amount: 3500, category: 'marketing' },
            { item: 'Design Assets', amount: 1500, category: 'marketing' }
          ]
        });

      expect(budgetRes.status).toBe(201);
      const budget = budgetRes.body.data;
      expect(budget.spent).toBe(5000);
      expect(budget.remaining).toBe(5000);
      expect(budget.utilizationPercentage).toBe(50);

      // Verify DB calculations via model
      const dbBudget = await Budget.findById(budget._id);
      expect(dbBudget.spent).toBe(5000);
      expect(dbBudget.remaining).toBe(5000);
      expect(dbBudget.utilizationPercentage).toBe(50);
    });

    it('should isolate budgets by organization', async () => {
      // Create budget in Org A
      const budgetA = await Budget.create({
        title: 'Org A Budget',
        organization: orgA._id,
        total_budget: 20000,
        allocated: 20000,
        status: 'approved'
      });

      // Org B member queries Org A budget -> 404
      const res = await request(app)
        .get(`/api/budget/${budgetA._id}`)
        .set('Authorization', `Bearer ${memberTokenB}`);

      expect(res.status).toBe(404);
    });
  });

  // ==========================================
  // 4. CATEGORIES VERIFICATION
  // ==========================================
  describe('4. Categories Scoping, Protection & Deletion Safety', () => {
    it('should list default system categories and organization custom categories', async () => {
      // Finance Manager creates custom organization category
      const createRes = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${financeManagerTokenA}`)
        .send({
          name: 'Cloud Infrastructure',
          type: 'expense',
          color: '#10b981'
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.name).toBe('Cloud Infrastructure');
      expect(createRes.body.data.scope).toBe('organization');

      // Member in Org A lists categories
      const listRes = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${memberTokenA}`);

      expect(listRes.status).toBe(200);
      const names = listRes.body.data.map(c => c.name);
      expect(names).toContain('Cloud Infrastructure');
      expect(names).toContain('Food & Dining'); // System category
    });

    it('should prevent cross-organization modification of categories', async () => {
      const catA = await Category.create({
        name: 'Private Org A Cat',
        scope: 'organization',
        organization: orgA._id,
        isActive: true
      });

      // Member B attempts to update Org A category -> 403
      const res = await request(app)
        .put(`/api/categories/${catA._id}`)
        .set('Authorization', `Bearer ${memberTokenB}`)
        .send({ name: 'Hacked Cat' });

      expect(res.status).toBe(403);
    });

    it('should protect category from deletion if it is referenced in an existing transaction', async () => {
      const cat = await Category.create({
        name: 'Equipment Hardware',
        slug: 'equipment-hardware',
        scope: 'organization',
        organization: orgA._id,
        isActive: true
      });

      // Create a transaction referencing this category
      await Transaction.create({
        user: memberUserA._id,
        organization: orgA._id,
        type: 'expense',
        amount: 2400,
        category: 'equipment-hardware',
        description: 'New monitors'
      });

      // Attempt to deactivate/delete category by Org Admin -> Should be rejected with 400
      const deleteRes = await request(app)
        .delete(`/api/categories/${cat._id}`)
        .set('Authorization', `Bearer ${orgAdminTokenA}`);

      expect(deleteRes.status).toBe(400);
      expect(deleteRes.body.message || deleteRes.body.error).toMatch(/referenced|in use/i);
    });
  });

  // ==========================================
  // 5. MEMBERSHIP / RBAC MATRIX ENFORCEMENT
  // ==========================================
  describe('5. Role-Based Access Control (RBAC) Enforcement', () => {
    it('should enforce Member restrictions (Member CANNOT invite members, update roles, or view org transactions)', async () => {
      // Member tries to invite member -> 403
      const inviteRes = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({ email: 'newmember@acme.com', name: 'Newbie' });
      expect(inviteRes.status).toBe(403);

      // Member tries to view org transactions list -> 403
      const txListRes = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${memberTokenA}`);
      expect(txListRes.status).toBe(403);

      // Member tries to create budget -> 403
      const budgetRes = await request(app)
        .post('/api/budget')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({ title: 'Rogue Budget', total_budget: 1000 });
      expect(budgetRes.status).toBe(403);
    });

    it('should enforce Finance Manager permissions (Can create budget, view org transactions, but CANNOT modify member roles)', async () => {
      // Finance Manager views org transactions -> 200
      const txRes = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${financeManagerTokenA}`);
      expect(txRes.status).toBe(200);

      // Finance Manager CANNOT invite member -> 403
      const inviteRes = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${financeManagerTokenA}`)
        .send({ email: 'recruit@acme.com' });
      expect(inviteRes.status).toBe(403);

      // Finance Manager CANNOT update member role -> 403
      const roleRes = await request(app)
        .put(`/api/members/${memberUserA._id}/role`)
        .set('Authorization', `Bearer ${financeManagerTokenA}`)
        .send({ role: USER_ROLES.ORGANIZATION_ADMIN });
      expect(roleRes.status).toBe(403);
    });

    it('should allow Organization Admin to manage members and modify roles', async () => {
      // Org Admin invites new member
      const addRes = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${orgAdminTokenA}`)
        .send({ email: 'newhire@acme.com', name: 'New Hire', role: USER_ROLES.MEMBER });

      expect(addRes.status).toBe(201);
      expect(addRes.body.data.user.email).toBe('newhire@acme.com');

      // Org Admin updates role of Bob to Finance Manager
      const updateRoleRes = await request(app)
        .put(`/api/members/${memberUserA2._id}/role`)
        .set('Authorization', `Bearer ${orgAdminTokenA}`)
        .send({ role: USER_ROLES.FINANCE_MANAGER });

      expect(updateRoleRes.status).toBe(200);
      expect(updateRoleRes.body.data.role).toBe(USER_ROLES.FINANCE_MANAGER);
    });
  });

  // ==========================================
  // 6. IDOR SECURITY VERIFICATION
  // ==========================================
  describe('6. IDOR & Tenant Spoofing Defense', () => {
    it('should reject request when client provides unauthorized organizationId in body', async () => {
      // Alice belongs to Org A, but specifies Org B in request body
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({
          type: 'expense',
          amount: 100,
          organizationId: orgB._id.toString() // Spoofed
        });

      expect(res.status).toBe(403);
      expect(res.body.message || res.body.error).toMatch(/cross-tenant|prohibited/i);
    });

    it('should reject request when client provides unauthorized organizationId in query params', async () => {
      const res = await request(app)
        .get(`/api/transactions/me?organizationId=${orgB._id}`)
        .set('Authorization', `Bearer ${memberTokenA}`);

      expect(res.status).toBe(403);
      expect(res.body.message || res.body.error).toMatch(/cross-tenant|prohibited/i);
    });
  });

  // ==========================================
  // 7. AUDIT LOG VERIFICATION
  // ==========================================
  describe('7. Mutation Audit Logging', () => {
    it('should generate audit entries for transaction, budget, and membership mutations', async () => {
      // 1. Transaction mutation
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({ type: 'expense', amount: 420, category: 'food' });

      const txAudit = await AuditLog.findOne({
        action: 'TRANSACTION_CREATED',
        performedBy: memberUserA._id
      });
      expect(txAudit).toBeDefined();
      expect(txAudit.entityType).toBe('TRANSACTION');

      // 2. Budget mutation
      await request(app)
        .post('/api/budget')
        .set('Authorization', `Bearer ${financeManagerTokenA}`)
        .send({
          title: 'Audited Budget Plan',
          total_budget: 15000,
          expenses: [{ item: 'Hosting', amount: 500 }]
        });

      const budgetAudit = await AuditLog.findOne({
        action: 'BUDGET_CREATED',
        performedBy: financeManagerA._id
      });
      expect(budgetAudit).toBeDefined();
      expect(budgetAudit.entityType).toBe('BUDGET');

      // 3. Member mutation
      await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${orgAdminTokenA}`)
        .send({ email: 'auditmember@acme.com', name: 'Audit Member' });

      const memberAudit = await AuditLog.findOne({
        action: 'MEMBER_ADDED',
        performedBy: orgAdminA._id
      });
      expect(memberAudit).toBeDefined();
      expect(memberAudit.entityType).toBe('MEMBERSHIP');
    });
  });

  // ==========================================
  // 8. AI READINESS VERIFICATION
  // ==========================================
  describe('8. AI Readiness Contract Verification', () => {
    it('should persist and structure clean inputs required for AI intelligence pipeline', async () => {
      const tx = await Transaction.create({
        user: memberUserA._id,
        organization: orgA._id,
        type: 'expense',
        amount: 2450.75,
        currency: 'INR',
        category: 'technology',
        merchant: 'GitHub Inc',
        payee: 'GitHub Inc',
        description: 'Monthly Copilot Subscription for Development Team',
        date: new Date('2026-10-01'),
        paymentMethod: 'Corporate Credit Card',
        tags: ['saas', 'engineering', 'recurring'],
        metadata: {
          invoiceId: 'INV-2026-99',
          vendorTaxId: 'US-98765432'
        },
        AIClassification: {
          category: 'Software & Cloud Services',
          confidence: 0.98,
          classifiedAt: new Date()
        }
      });

      const retrieved = await Transaction.findById(tx._id).lean();

      // Feature extraction contract verification
      expect(typeof retrieved.amount).toBe('number');
      expect(retrieved.amount).toBe(2450.75);
      expect(retrieved.currency).toBe('INR');
      expect(retrieved.type).toBe('expense');
      expect(retrieved.category).toBe('technology');
      expect(retrieved.merchant).toBe('GitHub Inc');
      expect(retrieved.payee).toBe('GitHub Inc');
      expect(retrieved.description).toBe('Monthly Copilot Subscription for Development Team');
      expect(Array.isArray(retrieved.tags)).toBe(true);
      expect(retrieved.tags).toContain('saas');
      expect(retrieved.metadata.invoiceId).toBe('INV-2026-99');
      expect(retrieved.AIClassification.category).toBe('Software & Cloud Services');
      expect(retrieved.AIClassification.confidence).toBe(0.98);
    });
  });
});
