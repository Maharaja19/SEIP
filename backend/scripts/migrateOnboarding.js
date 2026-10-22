/**
 * Migration script to set isProfileComplete = true for existing users
 * Run this once after deploying the onboarding feature
 * 
 * Usage: npm run migrate:onboarding
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/user");

const migrateOnboarding = async () => {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find all users where isProfileComplete is undefined or false
    const usersToUpdate = await User.find({
      $or: [
        { isProfileComplete: { $exists: false } },
        { isProfileComplete: false }
      ]
    });

    console.log(`\n📊 Found ${usersToUpdate.length} users to update\n`);

    if (usersToUpdate.length === 0) {
      console.log("✅ No users need updating. Migration complete!");
      process.exit(0);
    }

    // Update users in batches
    const batchSize = 50;
    let updatedCount = 0;

    for (let i = 0; i < usersToUpdate.length; i += batchSize) {
      const batch = usersToUpdate.slice(i, i + batchSize);
      
      const bulkOps = batch.map((user) => ({
        updateOne: {
          filter: { _id: user._id },
          update: {
            $set: {
              isProfileComplete: true,
              branch: user.department || user.branch || "Computer Science",
              batch: user.batch || "2023 - 2027",
              year: user.year || "1",
              hasWallet: false,
              monthlyIncome: 0,
              monthlyExpense: 0,
              spendingCategories: ["Others"]
            }
          }
        }
      }));

      const result = await User.bulkWrite(bulkOps);
      updatedCount += result.modifiedCount;
      
      console.log(`✓ Updated batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(usersToUpdate.length / batchSize)} (${result.modifiedCount} users)`);
    }

    console.log(`\n✅ Migration complete! Updated ${updatedCount}/${usersToUpdate.length} users\n`);

    // Verify the migration
    const updatedUsers = await User.countDocuments({ isProfileComplete: true });
    const remainingUsers = await User.countDocuments({ isProfileComplete: false });
    
    console.log("📊 Verification:");
    console.log(`   - Users with isProfileComplete=true: ${updatedUsers}`);
    console.log(`   - Users with isProfileComplete=false: ${remainingUsers}`);
    console.log(`   - Total users: ${updatedUsers + remainingUsers}\n`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

migrateOnboarding();
