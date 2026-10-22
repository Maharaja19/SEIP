const Transaction = require("../models/transactions");
const Budget = require("../models/budget");
const Wallet = require("../models/wallet");
const FinancialHealth = require("../models/financialHealth");

// Initialize Gemini API client if key is configured
let aiClient = null;
let useGemini = false;

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

if (process.env.GEMINI_API_KEY) {
  try {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    aiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    useGemini = true;
  } catch (err) {
    useGemini = false;
  }
}

/**
 * Get the configured Gemini model instance (returns null when AI is disabled).
 */
function getGeminiModel() {
  if (!useGemini || !aiClient) return null;
  return aiClient.getGenerativeModel({ model: GEMINI_MODEL });
}

/**
 * Auto-categorize a transaction description using Gemini or rule-based heuristics.
 * Rules run FIRST (deterministic); Gemini only enhances when it is available.
 */
async function classifyTransaction(description, amount) {
  const categories = ["dues", "budget", "food", "transport", "books", "entertainment", "shopping", "health", "education", "misc"];

  // Fallback Rule-based engine (deterministic)
  const desc = String(description || "").toLowerCase();
  let category = "misc";
  let confidence = 0.5;
  let source = "rules";

  if (desc.includes("food") || desc.includes("canteen") || desc.includes("hotel") || desc.includes("restaurant") || desc.includes("dinner") || desc.includes("lunch") || desc.includes("cafe")) {
    category = "food";
    confidence = 0.9;
  } else if (desc.includes("bus") || desc.includes("cab") || desc.includes("auto") || desc.includes("train") || desc.includes("travel") || desc.includes("fuel") || desc.includes("petrol") || desc.includes("uber") || desc.includes("ola")) {
    category = "transport";
    confidence = 0.85;
  } else if (desc.includes("due") || desc.includes("semester") || desc.includes("fee") || desc.includes("subscription") || desc.includes("contribution")) {
    category = "dues";
    confidence = 0.9;
  } else if (desc.includes("xerox") || desc.includes("print") || desc.includes("paper") || desc.includes("ink") || desc.includes("binding") || desc.includes("poster")) {
    category = "budget";
    confidence = 0.85;
  } else if (desc.includes("book") || desc.includes("course") || desc.includes("exam") || desc.includes("stationery") || desc.includes("notebook")) {
    category = "books";
    confidence = 0.8;
  } else if (desc.includes("movie") || desc.includes("game") || desc.includes("fun") || desc.includes("party") || desc.includes("concert")) {
    category = "entertainment";
    confidence = 0.75;
  } else if (desc.includes("shop") || desc.includes("store") || desc.includes("amazon") || desc.includes("flipkart") || desc.includes("mall")) {
    category = "shopping";
    confidence = 0.7;
  } else if (desc.includes("pharmacy") || desc.includes("medical") || desc.includes("doctor") || desc.includes("hospital")) {
    category = "health";
    confidence = 0.85;
  }

  if (useGemini && aiClient && (category === "misc" || confidence < 0.75)) {
    try {
      const model = getGeminiModel();
      const prompt = `Classify this transaction description: "${description}" with amount ${amount} INR into exactly one of these categories: ${categories.join(", ")}. Return only the category name in lowercase.`;
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim().toLowerCase();
      if (categories.includes(text)) {
        return { category: text, confidence: 0.8, source: "ai" };
      }
    } catch (err) {
      // Fall back to rules
    }
  }

  return { category, confidence, source };
}

/**
 * Deterministic monthly window helpers (local month boundaries).
 */
const monthStart = (offset = 0) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + offset, 1);
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Calculates a deterministic Financial Health Score (0-100) for a user/org.
 *
 * Weighted sub-scores:
 *  - budgetAdherence (0-40): how well actual spending fits allocated budgets.
 *  - savings (0-20): wallet balance relative to typical monthly spending.
 *  - expenseStability (0-20): lower month-over-month variance scores higher.
 *  - cashFlow (0-20): positive net income (income minus expense) scores higher.
 *
 * Gemini NEVER changes the numbers — it may only add an advisory explanation.
 */
async function calculateFinancialHealth(orgId, userId) {
  try {
    const orgQuery = orgId ? { organization: orgId } : {};
    const userQuery = userId ? { ...orgQuery, user: userId } : orgQuery;

    const [transactions, budgets, wallets] = await Promise.all([
      Transaction.find(orgQuery).sort({ date: -1 }).limit(500).lean(),
      Budget.find({ ...orgQuery, status: "approved" }).lean(),
      Wallet.find(orgQuery).lean(),
    ]);

    const userTransactions = userId
      ? transactions.filter((t) => String(t.user) === String(userId))
      : transactions;

    // --- Budget adherence -------------------------------------------------
    let totalAllocated = 0;
    let totalSpent = 0;
    let overspent = 0;
    budgets.forEach((b) => {
      const allocated = b.allocated || b.total_budget || 0;
      const spent = b.spent || 0;
      totalAllocated += allocated;
      totalSpent += spent;
      if (spent > allocated) overspent += spent - allocated;
    });

    let budgetAdherence = 40;
    if (totalAllocated > 0) {
      const utilization = totalSpent / totalAllocated;
      if (utilization <= 1) {
        // Below or at budget: scale 40 -> 26
        budgetAdherence = Math.round(40 - utilization * 14);
      } else {
        // Over budget: scale 26 -> 0
        budgetAdherence = Math.round(26 - Math.min(1, (utilization - 1)) * 26);
      }
    }
    budgetAdherence = clamp(budgetAdherence, 0, 40);

    // --- Savings ----------------------------------------------------------
    const walletBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
    const thisMonthExpenses = userTransactions
      .filter((t) => t.type === "expense" && new Date(t.date) >= monthStart(0))
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const monthlySpend = thisMonthExpenses || totalSpent || 0;

    let savings = 10; // neutral baseline
    if (monthlySpend > 0) {
      const monthsOfBuffer = walletBalance / monthlySpend;
      savings = Math.round(clamp(monthsOfBuffer, 0, 2) * 10); // 0 -> 20 for 2+ months buffer
    } else if (walletBalance > 0) {
      savings = 15;
    }
    savings = clamp(savings, 0, 20);

    // --- Expense stability ------------------------------------------------
    const currentMonthTotal = userTransactions
      .filter((t) => t.type === "expense" && new Date(t.date) >= monthStart(0))
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const lastMonthTotal = userTransactions
      .filter((t) => t.type === "expense" && new Date(t.date) >= monthStart(-1) && new Date(t.date) < monthStart(0))
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    let stability = 14;
    if (lastMonthTotal > 0 && currentMonthTotal > 0) {
      const ratio = Math.min(currentMonthTotal, lastMonthTotal) / Math.max(currentMonthTotal, lastMonthTotal);
      stability = Math.round(ratio * 20); // stable months -> ~20, divergent -> lower
    }
    stability = clamp(stability, 0, 20);

    // --- Cash flow ---------------------------------------------------------
    const currentIncome = userTransactions
      .filter((t) => t.type === "income" && new Date(t.date) >= monthStart(0))
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    let cashFlow = 10;
    if (currentIncome > 0 || currentMonthTotal > 0) {
      const net = currentIncome - currentMonthTotal;
      const gross = currentIncome + currentMonthTotal;
      cashFlow = gross > 0 ? Math.round((0.5 + net / gross / 2) * 20) : 10; // -0.5..1.5 -> 0..20
    }
    cashFlow = clamp(cashFlow, 0, 20);

    const score = clamp(
      Math.round(budgetAdherence + savings + stability + cashFlow),
      0,
      100
    );

    // --- Deterministic insights / recommendations -------------------------
    const insights = [];
    const recommendations = [];

    if (budgets.length === 0) {
      insights.push({
        type: "budget",
        message: "No approved budgets yet. Budgets help SEIP measure adherence.",
        impact: "neutral",
      });
      recommendations.push({
        action: "Create an approved budget so spending can be tracked against a plan.",
        estimatedSavings: 0,
        priority: "low",
      });
    } else if (totalAllocated > 0 && totalSpent > totalAllocated) {
      insights.push({
        type: "spending",
        message: `Spending (₹${Math.round(totalSpent).toLocaleString()}) exceeded the approved allocation (₹${Math.round(totalAllocated).toLocaleString()}).`,
        impact: "negative",
      });
      recommendations.push({
        action: "Freeze non-essential expenses and review budget allocations.",
        estimatedSavings: Math.round(totalSpent * 0.15),
        priority: "high",
      });
    } else if (totalAllocated > 0 && totalSpent / totalAllocated > 0.8) {
      insights.push({
        type: "spending",
        message: `Spending is at ${((totalSpent / totalAllocated) * 100).toFixed(0)}% of the approved allocation.`,
        impact: "neutral",
      });
      recommendations.push({
        action: "Monitor remaining funds closely and postpone discretionary purchases.",
        estimatedSavings: Math.round(totalAllocated * 0.05),
        priority: "medium",
      });
    }

    if (monthlySpend > 0 && walletBalance < monthlySpend * 0.5) {
      insights.push({
        type: "savings",
        message: `Wallet buffer (₹${Math.round(walletBalance).toLocaleString()}) covers less than half of a typical month's spending.`,
        impact: "neutral",
      });
      recommendations.push({
        action: "Build a wallet buffer equal to at least one month of expenses.",
        estimatedSavings: Math.round(monthlySpend * 0.5),
        priority: "medium",
      });
    }

    if (insights.length === 0) {
      insights.push({
        type: "general",
        message: "Financial posture is stable across budget adherence, savings, stability and cash flow.",
        impact: "positive",
      });
      recommendations.push({
        action: "Maintain current discipline and review budgets monthly.",
        estimatedSavings: 0,
        priority: "low",
      });
    }

    // --- Advisory-only Gemini explanation (never changes numbers) ---------
    let explanation = null;
    if (useGemini && aiClient) {
      try {
        const model = getGeminiModel();
        const analysisPrompt =
          `You are a financial advisor. Given the deterministic score of ${score}/100 ` +
          `(budgetAdherence=${budgetAdherence}/40, savings=${savings}/20, expenseStability=${stability}/20, cashFlow=${cashFlow}/20) ` +
          `for an organization with allocation ${Math.round(totalAllocated)} INR, spent ${Math.round(totalSpent)} INR, ` +
          `wallet balance ${Math.round(walletBalance)} INR, produce exactly one short paragraph (max 60 words) of general, non-numerical advice. ` +
          `Do NOT invent specific rupee amounts or new figures.`;
        const result = await model.generateContent(analysisPrompt);
        explanation = result.response.text().trim();
      } catch (gemErr) {
        explanation = null;
      }
    }

    // Save record to DB
    const healthRecord = await FinancialHealth.create({
      organization: orgId,
      user: userId,
      score,
      insights,
      recommendations,
      explanation,
      factors: { budgetAdherence, savings, expenseStability, cashFlow },
    });

    return healthRecord.toObject();
  } catch (err) {
    throw err;
  }
}

/**
 * Deterministic spending forecast for next week / month / quarter.
 *
 * Uses a simple linear projection of the actual daily average from the last
 * 90 days of recorded expenses. Returns 0 when there is no history.
 * Gemini does NOT invent the numbers — it may only add a qualitative note.
 */
async function predictSpendingForecast(orgId) {
  const orgQuery = orgId ? { organization: orgId } : {};

  const expenses = await Transaction.find({ ...orgQuery, type: "expense" })
    .select("amount date")
    .lean();

  const now = new Date();
  const historyStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const relevant = expenses.filter((t) => new Date(t.date) >= historyStart && new Date(t.date) <= now);

  const total = relevant.reduce((sum, t) => sum + (t.amount || 0), 0);
  const dailyAverage = relevant.length > 0 ? total / 90 : 0;

  const nextWeek = Math.round(dailyAverage * 7);
  const nextMonth = Math.round(dailyAverage * 30);
  const nextQuarter = Math.round(dailyAverage * 90);

  let note = null;
  if (useGemini && aiClient && relevant.length >= 30) {
    try {
      const model = getGeminiModel();
      const prompt =
        `Given a projected average daily spend of ${Math.round(dailyAverage)} INR computed from real transaction history, ` +
        `write one short sentence (max 30 words) of qualitative guidance about managing the next month. ` +
        `Do NOT provide any specific numbers or amounts.`;
      const result = await model.generateContent(prompt);
      note = result.response.text().trim();
    } catch (gemErr) {
      note = null;
    }
  }

  return { nextWeek, nextMonth, nextQuarter, note, dataPoints: relevant.length };
}

/**
 * Receipt OCR Intelligence using Gemini's native image support.
 *
 * Returns structured data OR null. It NEVER returns fabricated data:
 * if the AI is unavailable or parsing fails, callers must prompt for manual entry.
 */
async function extractReceiptData(fileBuffer, mimeType) {
  if (!useGemini || !aiClient) {
    return null;
  }

  try {
    const model = getGeminiModel();

    const imagePart = {
      inlineData: {
        data: fileBuffer.toString("base64"),
        mimeType,
      },
    };

    const prompt =
      "Analyze this receipt image. Extract: 1. Merchant name, 2. Transaction Amount, 3. Date, " +
      "4. Category (choose from: dues, budget, food, transport, books, entertainment, shopping, health, education, misc). " +
      "Return strictly in JSON format: { \"merchant\": \"string\", \"amount\": number, \"date\": \"YYYY-MM-DD\", \"category\": \"string\" }. " +
      "If the image is not a clear receipt, return the JSON object with all values null.";

    const result = await model.generateContent([prompt, imagePart]);
    const jsonText = result.response.text().replace(/```json|```/gi, "").trim();
    const parsed = JSON.parse(jsonText);

    if (!parsed || parsed.amount === null || parsed.amount === undefined) {
      return null;
    }

    return {
      merchant: parsed.merchant || null,
      amount: Number(parsed.amount) || null,
      date: parsed.date || null,
      category: parsed.category || "misc",
    };
  } catch (err) {
    return null;
  }
}

module.exports = {
  classifyTransaction,
  calculateFinancialHealth,
  predictSpendingForecast,
  extractReceiptData,
  getGeminiModel,
  useGemini,
};
