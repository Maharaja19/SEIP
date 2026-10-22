const Student = require('../models/student');
const Wallet = require('../models/wallet');
const CustomError = require('../utils/CustomError');

const YEAR_MAP = {
  '1st Year': 'I',
  '2nd Year': 'II',
  '3rd Year': 'III',
  '4th Year': 'IV',
};

const mapYearToStudentYear = (year) => YEAR_MAP[year] || year || 'III';

const buildStudentPayloadFromUser = (user) => ({
  user: user._id,
  fullName: user.name,
  registerNumber: user.registerNumber,
  email: user.email,
  phoneNumber: user.contactNo || undefined,
  contactNo: user.contactNo || undefined,
  department: user.onboarding?.academic?.branch || 'General',
  year: mapYearToStudentYear(user.onboarding?.academic?.year),
  dob: user.dob || new Date('2000-01-01'),
  gender: user.gender || 'Other',
  organization: user.organizationId,
});

const findStudentForUser = async (user) => {
  if (!user) return null;

  const byUser = await Student.findOne({ user: user._id });
  if (byUser) return byUser;

  if (user.email) {
    const byEmail = await Student.findOne({ email: user.email.toLowerCase() });
    if (byEmail) {
      if (!byEmail.user) {
        byEmail.user = user._id;
        await byEmail.save();
      }
      return byEmail;
    }
  }

  if (user.registerNumber) {
    const byReg = await Student.findOne({ registerNumber: user.registerNumber });
    if (byReg) {
      if (!byReg.user) {
        byReg.user = user._id;
        await byReg.save();
      }
      return byReg;
    }
  }

  return null;
};

/**
 * Resolve or provision a Student record for an authenticated User.
 * Student profile is optional; users without a registerNumber remain valid Members.
 */
const ensureStudentForUser = async (user, { createIfMissing = true } = {}) => {
  if (!user) {
    throw new CustomError('Authentication required', 401, 'UNAUTHORIZED');
  }

  // Only Member role accounts with an identifier get a Student record.
  const { isStudent } = require("../utils/roles");
  if (!isStudent(user.role)) {
    return null;
  }

  if (!user.registerNumber) {
    return null; // Valid general member without an institutional student record
  }

  let student = await findStudentForUser(user);
  if (student) return student;

  if (!createIfMissing) return null;

  student = new Student(buildStudentPayloadFromUser(user));
  await student.save();
  console.log('[STUDENT_SYNC] Created student record:', student._id);
  return student;
};

/**
 * Auto-create wallet for a student if missing.
 */
const ensureWalletForStudent = async (student) => {
  if (!student?._id) return null;

  let wallet = await Wallet.findOne({ $or: [{ student: student._id }, { owner: student.user }] });
  if (!wallet) {
    wallet = await Wallet.create({
      student: student._id,
      owner: student.user,
      organization: student.organization,
      balance: 0,
    });
    console.log('[WALLET] Created wallet for student:', student._id);
  } else if (!wallet.student) {
    wallet.student = student._id;
    await wallet.save();
  }
  return wallet;
};

/**
 * Auto-create wallet for a general user if missing.
 */
const ensureWalletForUser = async (user) => {
  if (!user?._id) return null;

  let wallet = await Wallet.findOne({ owner: user._id });
  if (!wallet) {
    wallet = await Wallet.create({
      owner: user._id,
      organization: user.organizationId,
      balance: 0,
    });
    console.log('[WALLET] Created wallet for general member:', user._id);
  }
  return wallet;
};

const resolveStudentContext = async (req, { createIfMissing = true } = {}) => {
  const student = await ensureStudentForUser(req.user, { createIfMissing });
  const wallet = student ? await ensureWalletForStudent(student) : await ensureWalletForUser(req.user);
  return { student, wallet };
};

const logUserAccess = (req, routeLabel) => {
  console.log(`[AUTH] route=${routeLabel} userId=${req.user?._id || 'n/a'} role=${req.user?.role || 'n/a'}`);
};

const logProfileCompleteness = (user) => {
  const required = ['name', 'email', 'role', 'registerNumber', 'onboardingCompleted', 'createdAt'];
  const missing = required.filter((field) => {
    const val = user[field];
    return val === undefined || val === null || val === '';
  });

  if (!user.onboarding?.academic?.branch) missing.push('onboarding.academic.branch');
  if (!user.onboarding?.consent?.acceptedAt && user.onboardingCompleted) {
    missing.push('onboarding.consent.acceptedAt');
  }

  if (missing.length) {
    console.warn(`[PROFILE] Incomplete user ${user._id}: missing ${missing.join(', ')}`);
  } else {
    console.log(`[PROFILE] Complete user profile for ${user._id}`);
  }
};

module.exports = {
  ensureStudentForUser,
  ensureWalletForStudent,
  ensureWalletForUser,
  resolveStudentContext,
  findStudentForUser,
  logUserAccess,
  logProfileCompleteness,
};
