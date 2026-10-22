const mongoose = require('mongoose');

// Use the same connection string from .env.example for testing purposes
// In a real scenario, you'd need to create a proper .env file with your credentials
const MONGO_URI = 'mongodb+srv://Maharaja:CSEAtreasurer@cluster.4adqzym.mongodb.net/BudgetDB';

// Import models
const Student = require('./src/models/student');
const Due = require('./src/models/dues');

async function checkDatabase() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB Atlas');

    // Check if students collection exists and has data
    const studentCount = await Student.countDocuments();
    console.log(`📊 Total students in database: ${studentCount}`);

    if (studentCount > 0) {
      console.log('\n📚 Listing all students:');
      const students = await Student.find({}, 'fullName registerNumber email phoneNumber');
      students.forEach((student, index) => {
        console.log(`${index + 1}. ${student.fullName} (Reg: ${student.registerNumber}) - ${student.email}`);
      });

      // Check dues for each student
      console.log('\n💰 Checking dues for each student:');
      for (const student of students) {
        const dues = await Due.find({ student: student._id });
        console.log(`  ${student.fullName} (${student.registerNumber}): ${dues.length} dues`);
        
        for (const due of dues) {
          console.log(`    - ${due.reason}: ₹${due.amount} (Status: ${due.status})`);
        }
      }
    } else {
      console.log('❌ No students found in the database');
      console.log('\n💡 To add sample data, you might need to run one of these scripts:');
      console.log('   npm run import-students');
      console.log('   npm run import-data');
      console.log('   npm run generate-installment-dues');
    }

    // Check installment dues specifically
    const installmentDues = await Due.find({ reason: { $regex: /Semester [5-8] Installment/ } });
    console.log(`\n🎓 Total semester installment dues: ${installmentDues.length}`);
    
    if (installmentDues.length > 0) {
      console.log('📋 Sample installment dues:');
      installmentDues.slice(0, 5).forEach((due, index) => {
        console.log(`  ${index + 1}. ${due.reason}: ₹${due.amount} (Status: ${due.status})`);
      });
    }

  } catch (error) {
    console.error('❌ Error connecting to database:', error.message);
    console.log('\n💡 Make sure you have a proper .env file with valid MongoDB credentials');
    console.log('The connection string in .env.example might be outdated or incorrect.');
  } finally {
    await mongoose.connection.close();
    console.log('\n🔒 Database connection closed');
  }
}

// Run the check
checkDatabase();