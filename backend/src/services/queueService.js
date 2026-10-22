const { Queue, Worker } = require("bullmq");
const notificationService = require("./notificationService");
const Transaction = require("../models/transactions");
const Budget = require("../models/budget");
const Organization = require("../models/organization");

let reportQueue = null;
let reportWorker = null;
let useRedisQueue = false;

const redisConfig = process.env.REDIS_URL 
  ? { connection: { url: process.env.REDIS_URL } }
  : null;

// Initialize BullMQ if Redis is available
if (redisConfig) {
  try {
    reportQueue = new Queue("seip-reports", redisConfig);
    
    reportWorker = new Worker("seip-reports", async (job) => {
      console.log(`Processing background job: ${job.name} (id: ${job.id})`);
      await executeScheduledTask(job.name, job.data);
    }, redisConfig);

    reportWorker.on("completed", (job) => {
      console.log(`Job ${job.id} completed successfully`);
    });

    reportWorker.on("failed", (job, err) => {
      console.error(`Job ${job.id} failed with error:`, err);
    });

    useRedisQueue = true;
    console.log("BullMQ initialized successfully.");
  } catch (err) {
    console.warn("Failed to initialize BullMQ. Falling back to local scheduler.", err.message);
    useRedisQueue = false;
  }
} else {
  console.log("No REDIS_URL provided. BullMQ disabled. Using memory scheduler.");
}

/**
 * Executes a scheduled job (e.g., summary generation, budget alert checks)
 */
async function executeScheduledTask(taskName, data = {}) {
  const organizations = await Organization.find();
  
  for (const org of organizations) {
    try {
      if (taskName === "daily-summary") {
        console.log(`Generating daily summary for organization: ${org.name}`);
        // Fetch daily expenses
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const dailyExpenses = await Transaction.find({
          organization: org._id,
          type: "expense",
          date: { $gte: startOfDay }
        });
        
        const totalAmount = dailyExpenses.reduce((sum, tx) => sum + tx.amount, 0);
        
        if (totalAmount > 0) {
          await notificationService.sendNotification({
            userId: org.createdBy,
            type: "daily_summary",
            title: "Daily Spending Summary",
            message: `Your organization spent ₹${totalAmount.toLocaleString()} today across ${dailyExpenses.length} transaction(s).`
          });
        }
      } else if (taskName === "weekly-budget-check") {
        console.log(`Checking budget utilization alerts for: ${org.name}`);
        // Fetch active budgets
        const budgets = await Budget.find({ organization: org._id, status: "approved" });
        
        for (const budget of budgets) {
          const percentage = (budget.spent / budget.allocated) * 100;
          if (percentage >= 90) {
            await notificationService.sendNotification({
              userId: org.createdBy,
              type: "budget_alert",
              title: "🚨 Critical Budget Alert",
              message: `Budget "${budget.title}" is ${percentage.toFixed(1)}% utilized (Spent ₹${budget.spent.toLocaleString()} / Allocated ₹${budget.allocated.toLocaleString()}).`
            });
          } else if (percentage >= 75) {
            await notificationService.sendNotification({
              userId: org.createdBy,
              type: "budget_alert",
              title: "⚠️ Budget Warning",
              message: `Budget "${budget.title}" is ${percentage.toFixed(1)}% utilized (Spent ₹${budget.spent.toLocaleString()} / Allocated ₹${budget.allocated.toLocaleString()}).`
            });
          }
        }
      }
    } catch (orgErr) {
      console.error(`Error executing job ${taskName} for organization ${org.name}:`, orgErr.message);
    }
  }
}

// Memory scheduler fallback for running reports without Redis
if (!useRedisQueue) {
  // Run daily check every 24 hours
  setInterval(() => {
    executeScheduledTask("daily-summary").catch(console.error);
  }, 24 * 60 * 60 * 1000);

  // Run weekly budget check every week
  setInterval(() => {
    executeScheduledTask("weekly-budget-check").catch(console.error);
  }, 7 * 24 * 60 * 60 * 1000);
  
  console.log("Memory schedulers set up for daily and weekly jobs.");
}

/**
 * Add a new task to the queue
 */
async function scheduleJob(name, data = {}, options = {}) {
  if (useRedisQueue && reportQueue) {
    await reportQueue.add(name, data, options);
  } else {
    // Immediate execution fallback
    console.log(`Executing task ${name} synchronously due to no Redis Queue`);
    executeScheduledTask(name, data).catch(console.error);
  }
}

module.exports = {
  scheduleJob,
  executeScheduledTask
};
