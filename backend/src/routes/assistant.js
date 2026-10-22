const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { tenantContext } = require("../middleware/tenant");
const Transaction = require("../models/transactions");
const Budget = require("../models/budget");
const geminiService = require("../services/geminiService");
const APIResponse = require("../utils/apiResponse");

router.post(
  "/chat",
  authenticateToken,
  tenantContext,
  async (req, res, next) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json(APIResponse.error("Message query is required", "VALIDATION_ERROR"));
      }

      // 1. Compile context from database
      const txs = await Transaction.find({ organization: req.organizationId }).sort({ date: -1 }).limit(30);
      const budgets = await Budget.find({ organization: req.organizationId, status: "approved" });

      const txSummary = txs.map(t => `${t.date.toISOString().split('T')[0]} | ${t.description} | ${t.category} | ${t.amount} INR | ${t.type}`).join("\n");
      const budgetSummary = budgets.map(b => `${b.title} budget: Allocated=${b.allocated} Spent=${b.spent} Remaining=${b.remaining}`).join("\n");

      let aiResponse = "";

      if (geminiService.useGemini) {
        try {
          const model = geminiService.getGeminiModel();

          const prompt = `You are "SEIP AI", the AI financial assistant for the Smart Expense Intelligence Platform (SEIP). 
Here is the organization's financial data context:
Budgets:
${budgetSummary}

Recent Transactions:
${txSummary}

User question: "${message}"
Answer the question concisely and professionally, offering relevant budget optimization tips where possible.`;

          const result = await model.generateContent(prompt);
          aiResponse = result.response.text();
        } catch (gemErr) {
          console.warn("Gemini chatbot failed, using heuristics fallback:", gemErr.message);
        }
      }

      // Heuristics Fallback if Gemini is not active or errored
      if (!aiResponse) {
        const query = message.toLowerCase();
        let totalSpent = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        let categoryMap = {};
        txs.filter(t => t.type === 'expense').forEach(t => {
          categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
        });
        
        let biggestCategory = "N/A";
        let biggestAmt = 0;
        Object.entries(categoryMap).forEach(([cat, amt]) => {
          if (amt > biggestAmt) {
            biggestAmt = amt;
            biggestCategory = cat;
          }
        });

        if (query.includes("spend") || query.includes("expense") || query.includes("what did i")) {
          aiResponse = `According to recent records, you spent a total of ₹${totalSpent.toLocaleString()} INR. Your largest spending category was "${biggestCategory}" at ₹${biggestAmt.toLocaleString()} INR.`;
        } else if (query.includes("save") || query.includes("reduce")) {
          aiResponse = `You can save money by reducing expenses in your top category: "${biggestCategory}" (₹${biggestAmt.toLocaleString()} spent). Try reducing dining out and xerox services by 15% next week.`;
        } else if (query.includes("forecast") || query.includes("predict")) {
          const expenseTxs = txs.filter(t => t.type === 'expense');
          const last30 = expenseTxs.filter(t => {
            const d = new Date(t.date);
            return d >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          });
          const dailyAverage = last30.length > 0 ? last30.reduce((s, t) => s + t.amount, 0) / 30 : 0;
          const predicted = dailyAverage > 0 ? Math.round(dailyAverage * 30) : null;
          aiResponse = predicted
            ? `Based on your actual expenses over the last 30 days (₹${Math.round(dailyAverage * 30).toLocaleString()}), next month's spending is estimated at approximately ₹${predicted.toLocaleString()} INR. This is a simple daily-average projection from your recorded transactions.`
            : `There is not enough transaction history yet to estimate next month's spending. Add some expenses and ask again.`;
        } else {
          aiResponse = `Hello! I'm SEIP AI. I can help you analyze your transactions, predict next month's spending, and suggest budget strategies. Ask me about your expenses, savings opportunities, or forecasts!`;
        }
      }

      return res.status(200).json(
        APIResponse.success({ response: aiResponse }, "Chat assistant reply received")
      );
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
