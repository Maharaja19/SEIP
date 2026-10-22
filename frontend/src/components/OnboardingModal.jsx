import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet, Check } from "lucide-react";

const OnboardingModal = ({ isOpen, onComplete, userData }) => {
  const [formData, setFormData] = useState({
    branch: "",
    batch: "",
    year: "",
    hasWallet: false,
    monthlyIncome: "",
    monthlyExpense: "",
    spendingCategories: []
  });

  const [loading, setLoading] = useState(false);

  const categoryOptions = [
    "Food",
    "Travel",
    "Events",
    "Shopping",
    "Books",
    "Entertainment",
    "Health",
    "Others"
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value
    });
  };

  const toggleCategory = (category) => {
    setFormData((prev) => {
      const categories = prev.spendingCategories.includes(category)
        ? prev.spendingCategories.filter((c) => c !== category)
        : [...prev.spendingCategories, category];
      return { ...prev, spendingCategories: categories };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onComplete(formData);
    } catch (error) {
      console.error("Submission failed:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <button
              onClick={() => window.location.href = "/student"}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold mb-1">Welcome, {userData?.name}! 👋</h2>
            <p className="text-blue-100 text-sm">Complete your profile to get started</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Branch */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Branch / Department *
              </label>
              <input
                type="text"
                name="branch"
                value={formData.branch}
                onChange={handleInputChange}
                placeholder="e.g., Computer Science"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>

            {/* Batch */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Batch *
              </label>
              <input
                type="text"
                name="batch"
                value={formData.batch}
                onChange={handleInputChange}
                placeholder="e.g., 2023 - 2027"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>

            {/* Year */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Current Year *
              </label>
              <select
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              >
                <option value="">Select Year</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>

            {/* Wallet Toggle */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Enable Wallet</p>
                    <p className="text-xs text-gray-600">Track expenses & budget</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="hasWallet"
                    checked={formData.hasWallet}
                    onChange={handleInputChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
            </div>

            {/* Conditional Wallet Fields */}
            {formData.hasWallet && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200"
              >
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Monthly Income (₹)
                  </label>
                  <input
                    type="number"
                    name="monthlyIncome"
                    value={formData.monthlyIncome}
                    onChange={handleInputChange}
                    placeholder="e.g., 5000"
                    min="0"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Monthly Expense (₹)
                  </label>
                  <input
                    type="number"
                    name="monthlyExpense"
                    value={formData.monthlyExpense}
                    onChange={handleInputChange}
                    placeholder="e.g., 3000"
                    min="0"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </motion.div>
            )}

            {/* Spending Categories */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Spending Categories *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {categoryOptions.map((category) => {
                  const isSelected = formData.spendingCategories.includes(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                        isSelected
                          ? "bg-blue-500 text-white border-blue-500"
                          : "bg-white text-gray-700 border-gray-300 hover:border-blue-300"
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4 inline mr-1" />}
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !formData.branch || !formData.batch || !formData.year || formData.spendingCategories.length === 0}
              className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  Complete Profile
                  <Check className="w-5 h-5" />
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray-500">
              You can update these details later in settings
            </p>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default OnboardingModal;
