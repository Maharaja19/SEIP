require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');

const checkUser = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const user = await User.findOne({ email: "maha.71772317127@gct.ac.in" });
    
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('\n📊 User Details:');
    console.log('   Email:', user.email);
    console.log('   Name:', user.name);
    console.log('   isProfileComplete:', user.isProfileComplete);
    console.log('   branch:', user.branch);
    console.log('   batch:', user.batch);
    console.log('   year:', user.year);
    console.log('   hasWallet:', user.hasWallet);
    console.log('   monthlyIncome:', user.monthlyIncome);
    console.log('   monthlyExpense:', user.monthlyExpense);
    console.log('   spendingCategories:', user.spendingCategories);
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkUser();
