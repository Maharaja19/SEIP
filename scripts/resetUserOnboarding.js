require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');

const resetUser = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected!\n');

    // Find all users
    const users = await User.find({}, { email: 1, isProfileComplete: 1, name: 1 });
    
    console.log('📊 Current Users:');
    users.forEach(u => {
      console.log(`   - ${u.email} | isProfileComplete: ${u.isProfileComplete}`);
    });

    if (users.length === 0) {
      console.log('\n⚠️  No users found in database');
      console.log('💡 Login with Google first to create a user');
      process.exit(0);
    }

    // Reset the first user
    const user = users[0];
    user.isProfileComplete = false;
    user.branch = undefined;
    user.batch = undefined;
    user.year = undefined;
    user.hasWallet = undefined;
    user.monthlyIncome = undefined;
    user.monthlyExpense = undefined;
    user.spendingCategories = undefined;

    await user.save();

    console.log(`\n✅ Successfully reset user: ${user.email}`);
    console.log('   isProfileComplete is now: false\n');
    console.log('📋 Next steps:');
    console.log('   1. Clear browser localStorage');
    console.log('   2. Go to http://localhost:3000/login');
    console.log('   3. Login with Google');
    console.log('   4. You should be redirected to /onboarding\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

resetUser();
