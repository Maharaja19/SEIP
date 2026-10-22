require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Transaction = require("../models/transactions");
const User = require("../models/user");

const categories = ["event", "printing", "food", "misc"];
const departments = ["Operations", "Events", "Marketing", "Admin", "Logistics"];

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomPastDate = () => {
  const now = new Date();
  const monthsBack = randomInt(0, 7);
  const day = randomInt(1, 28);
  return new Date(now.getFullYear(), now.getMonth() - monthsBack, day);
};

const buildSeedData = (userId, count = 40) => {
  return Array.from({ length: count }).map(() => {
    const date = randomPastDate();
    const amount = randomInt(200, 7000);
    const category = categories[randomInt(0, categories.length - 1)];
    const department = departments[randomInt(0, departments.length - 1)];

    return {
      user: userId,
      createdBy: userId,
      type: "expense",
      amount,
      category,
      department,
      date,
      description: `${category} expense for ${department.toLowerCase()} activity`,
      isStudentEntry: false
    };
  });
};

const run = async () => {
  try {
    await connectDB();
    const seedUser = await User.findOne({ role: { $in: ["Admin", "Treasurer"] } });

    if (!seedUser) {
      throw new Error("No Admin/Treasurer user found for seeding.");
    }

    const records = buildSeedData(seedUser._id, randomInt(30, 50));
    await Transaction.insertMany(records);

    console.log(`Seeded ${records.length} SEIP expense records.`);
    process.exit(0);
  } catch (error) {
    console.error("SEIP expense seed failed:", error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

run();
