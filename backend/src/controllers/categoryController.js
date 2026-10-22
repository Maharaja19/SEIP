const Category = require("../models/category");
const { DEFAULT_CATEGORIES } = require("../models/category");
const APIResponse = require("../utils/apiResponse");
const CustomError = require("../utils/CustomError");

// Seed default categories if none exist in the system
async function ensureSystemCategories() {
  const count = await Category.countDocuments({ scope: "system" });
  if (count === 0) {
    const seedData = DEFAULT_CATEGORIES.map(cat => ({
      ...cat,
      scope: "system",
      isDefault: true,
      isActive: true
    }));
    await Category.insertMany(seedData);
  }
}

// GET /api/categories
const listCategories = async (req, res, next) => {
  try {
    await ensureSystemCategories();

    const query = {
      isActive: true,
      $or: [
        { scope: "system" },
        ...(req.organizationId ? [{ scope: "organization", organization: req.organizationId }] : []),
        { scope: "user", user: req.user._id }
      ]
    };

    const categories = await Category.find(query).sort({ scope: 1, name: 1 });
    return res.status(200).json(APIResponse.success(categories, "Categories retrieved"));
  } catch (error) {
    next(error);
  }
};

// POST /api/categories
const createCategory = async (req, res, next) => {
  try {
    const { name, type, description, icon, color } = req.body;
    if (!name || !name.trim()) {
      throw new CustomError("Category name is required", 400);
    }

    const orgId = req.organizationId || req.user.organizationId || null;

    const category = await Category.create({
      name: name.trim(),
      type: type || "expense",
      description: description?.trim(),
      icon: icon || "Tag",
      color: color || "#3b82f6",
      scope: orgId ? "organization" : "user",
      organization: orgId,
      user: req.user._id,
      isDefault: false,
      isActive: true
    });

    return res.status(201).json(APIResponse.success(category, "Category created successfully"));
  } catch (error) {
    next(error);
  }
};

// PUT /api/categories/:id
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, type, isActive } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      throw new CustomError("Category not found", 404);
    }

    if (category.scope === "system") {
      throw new CustomError("System default categories cannot be modified", 403);
    }

    // Verify ownership
    if (category.scope === "organization" && category.organization && String(category.organization) !== String(req.organizationId)) {
      throw new CustomError("Unauthorized to modify this category", 403);
    }
    if (category.scope === "user" && category.user && String(category.user) !== String(req.user._id)) {
      throw new CustomError("Unauthorized to modify this category", 403);
    }

    if (name) category.name = name.trim();
    if (description !== undefined) category.description = description.trim();
    if (icon) category.icon = icon;
    if (color) category.color = color;
    if (type) category.type = type;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    return res.status(200).json(APIResponse.success(category, "Category updated"));
  } catch (error) {
    next(error);
  }
};

// DELETE /api/categories/:id
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) {
      throw new CustomError("Category not found", 404);
    }

    if (category.scope === "system") {
      throw new CustomError("System default categories cannot be deleted", 403);
    }

    if (category.scope === "organization" && category.organization && String(category.organization) !== String(req.organizationId)) {
      throw new CustomError("Unauthorized to delete this category", 403);
    }
    if (category.scope === "user" && category.user && String(category.user) !== String(req.user._id)) {
      throw new CustomError("Unauthorized to delete this category", 403);
    }

    // Deletion protection: Check if category is already referenced in transactions or budgets
    const Transaction = require("../models/transactions");
    const Budget = require("../models/budget");

    const categoryIdentifiers = [category.name];
    if (category.slug) categoryIdentifiers.push(category.slug);

    const hasTransaction = await Transaction.exists({
      $or: [
        { category: { $in: categoryIdentifiers } },
        { category: String(category._id) }
      ]
    });

    const hasBudget = await Budget.exists({
      $or: [
        { category: { $in: categoryIdentifiers } },
        { "expenses.category": { $in: categoryIdentifiers } }
      ]
    });

    if (hasTransaction || hasBudget) {
      throw new CustomError(
        "Cannot delete category: it is referenced by existing transactions or budgets",
        400,
        "CATEGORY_IN_USE"
      );
    }

    category.isActive = false;
    await category.save();

    return res.status(200).json(APIResponse.success(null, "Category deactivated"));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  ensureSystemCategories
};
