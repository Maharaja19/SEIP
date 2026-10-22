const mongoose = require('mongoose');
require('dotenv').config();

// Import all models
const User = require('../src/models/user');
const Student = require('../src/models/student');
const Due = require('../src/models/dues');
const Transaction = require('../src/models/transactions');
const Budget = require('../src/models/budget');
const PaymentOrder = require('../src/models/PaymentOrder');
const StudentDetails = require('../src/models/studentDetails');

async function viewDatabase() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Function to safely fetch and display documents
    const displayCollection = async (modelName, model, limit = 10) => {
      try {
        const count = await model.countDocuments();
        console.log(`\n📊 ${modelName} Collection (${count} total documents):`);
        console.log('='.repeat(60));
        
        if (count === 0) {
          console.log('No documents found in this collection.');
          return;
        }

        const documents = await model.find().limit(limit).lean();
        documents.forEach((doc, index) => {
          console.log(`\nDocument ${index + 1}:`);
          console.log(JSON.stringify(doc, null, 2));
        });
        
        if (count > limit) {
          console.log(`\n... and ${count - limit} more documents`);
        }
      } catch (error) {
        console.log(`❌ Error fetching ${modelName} collection:`, error.message);
      }
    };

    // Display all collections
    await displayCollection('Users', User);
    await displayCollection('Students', Student);
    await displayCollection('Dues', Due);
    await displayCollection('Transactions', Transaction);
    await displayCollection('Budgets', Budget);
    await displayCollection('Payment Orders', PaymentOrder);
    await displayCollection('Student Details', StudentDetails);

    console.log('\n✅ Database viewing completed');
  } catch (error) {
    console.error('❌ Error connecting to database:', error.message);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Function to view a specific collection
async function viewSpecificCollection(collectionName) {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ Connected to MongoDB - Viewing ${collectionName} collection\n`);

    let model;
    let modelName;
    
    switch(collectionName.toLowerCase()) {
      case 'users':
        model = User;
        modelName = 'Users';
        break;
      case 'students':
        model = Student;
        modelName = 'Students';
        break;
      case 'dues':
        model = Due;
        modelName = 'Dues';
        break;
      case 'transactions':
        model = Transaction;
        modelName = 'Transactions';
        break;
      case 'budgets':
        model = Budget;
        modelName = 'Budgets';
        break;
      case 'paymentorders':
      case 'payment_orders':
        model = PaymentOrder;
        modelName = 'Payment Orders';
        break;
      case 'studentdetails':
      case 'student_details':
        model = StudentDetails;
        modelName = 'Student Details';
        break;
      default:
        console.log(`❌ Unknown collection: ${collectionName}`);
        console.log('Available collections: users, students, dues, transactions, budgets, paymentorders, studentdetails');
        mongoose.connection.close();
        return;
    }

    await displaySingleCollection(modelName, model);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

async function displaySingleCollection(modelName, model) {
  try {
    const count = await model.countDocuments();
    console.log(`${modelName} Collection (${count} total documents):`);
    console.log('='.repeat(60));
    
    if (count === 0) {
      console.log('No documents found in this collection.');
      return;
    }

    const documents = await model.find().lean();
    documents.forEach((doc, index) => {
      console.log(`\nDocument ${index + 1}:`);
      console.log(JSON.stringify(doc, null, 2));
    });
    
    console.log(`\nTotal documents in ${modelName}: ${count}`);
  } catch (error) {
    console.log(`❌ Error fetching ${modelName} collection:`, error.message);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('📖 Usage:');
  console.log('node view_database.js                    # View all collections (limited to 10 docs each)');
  console.log('node view_database.js all               # View all collections (full content)');
  console.log('node view_database.js <collection_name> # View specific collection');
  console.log('\nAvailable collections: users, students, dues, transactions, budgets, paymentorders, studentdetails');
  viewDatabase();
} else if (args[0].toLowerCase() === 'all') {
  console.log('Viewing all collections with full content...');
  viewDatabaseFull();
} else {
  viewSpecificCollection(args[0]);
}

async function viewDatabaseFull() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB (Full View)\n');

    const displayFullCollection = async (modelName, model) => {
      try {
        const count = await model.countDocuments();
        console.log(`\n📊 ${modelName} Collection (${count} total documents):`);
        console.log('='.repeat(60));
        
        if (count === 0) {
          console.log('No documents found in this collection.');
          return;
        }

        const documents = await model.find().lean();
        documents.forEach((doc, index) => {
          console.log(`\nDocument ${index + 1}:`);
          console.log(JSON.stringify(doc, null, 2));
        });
        
        console.log(`\n--- End of ${modelName} collection ---\n`);
      } catch (error) {
        console.log(`❌ Error fetching ${modelName} collection:`, error.message);
      }
    };

    await displayFullCollection('Users', User);
    await displayFullCollection('Students', Student);
    await displayFullCollection('Dues', Due);
    await displayFullCollection('Transactions', Transaction);
    await displayFullCollection('Budgets', Budget);
    await displayFullCollection('Payment Orders', PaymentOrder);
    await displayFullCollection('Student Details', StudentDetails);

    console.log('\n✅ Full database viewing completed');
  } catch (error) {
    console.error('❌ Error connecting to database:', error.message);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}