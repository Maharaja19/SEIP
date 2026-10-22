import React, { useState, useEffect } from "react";
import ModernLayout from "../components/layout/Layout";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { isAdmin } from "../utils/roles";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  Save, 
  Shield, 
  Coins, 
  Clock, 
  Tag, 
  CheckCircle2,
  Users
} from "lucide-react";

const ORGANIZATION_TYPES = [
  "INDIVIDUAL",
  "STUDENT_GROUP",
  "CLUB",
  "NGO",
  "STARTUP",
  "SMALL_BUSINESS",
  "ASSOCIATION",
  "OTHER"
];

const OrganizationProfile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isOrgAdmin = isAdmin(user?.role);

  const [formData, setFormData] = useState({
    name: "",
    legalName: "",
    displayName: "",
    type: "CLUB",
    description: "",
    industry: "",
    email: "",
    phone: "",
    website: "",
    currency: "INR",
    timezone: "Asia/Kolkata",
    address: {
      street: "",
      city: "",
      state: "",
      country: "India",
      postalCode: ""
    }
  });

  const fetchOrganization = async () => {
    setLoading(true);
    try {
      const res = await api.get("/organizations/me");
      if (res.data.success && res.data.data) {
        const org = res.data.data;
        setFormData({
          name: org.name || "",
          legalName: org.legalName || "",
          displayName: org.displayName || org.name || "",
          type: org.type || "CLUB",
          description: org.description || "",
          industry: org.industry || "",
          email: org.email || "",
          phone: org.phone || "",
          website: org.website || "",
          currency: org.currency || "INR",
          timezone: org.timezone || "Asia/Kolkata",
          address: {
            street: org.address?.street || "",
            city: org.address?.city || "",
            state: org.address?.state || "",
            country: org.address?.country || "India",
            postalCode: org.address?.postalCode || ""
          }
        });
      }
    } catch (err) {
      console.error("Failed to load organization:", err);
      toast.error(err.response?.data?.message || "Failed to load organization profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganization();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      const field = name.split(".")[1];
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [field]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOrgAdmin) {
      toast.error("Only Organization Admins can modify settings");
      return;
    }

    setSaving(true);
    try {
      const res = await api.put("/organizations/me", formData);
      if (res.data.success) {
        toast.success("Organization profile updated successfully");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModernLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <Building2 className="w-8 h-8 text-sky-400" />
              Organization Profile
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Configure tenant identity, location, currency, and financial preferences.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" />
            {isOrgAdmin ? "Admin Privileges Active" : "Read Only Mode"}
          </div>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
            <h2 className="text-lg font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-sky-400" />
              General Identity
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Organization Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  disabled={!isOrgAdmin}
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Legal / Registered Entity Name
                </label>
                <input
                  type="text"
                  name="legalName"
                  disabled={!isOrgAdmin}
                  value={formData.legalName}
                  onChange={handleChange}
                  placeholder="e.g. Acme FinTech Solutions Pvt Ltd"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Organization Type
                </label>
                <select
                  name="type"
                  disabled={!isOrgAdmin}
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                >
                  {ORGANIZATION_TYPES.map(t => (
                    <option key={t} value={t}>{t.replace("_", " ")}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Industry / Sector
                </label>
                <input
                  type="text"
                  name="industry"
                  disabled={!isOrgAdmin}
                  value={formData.industry}
                  onChange={handleChange}
                  placeholder="e.g. Technology, Education, Healthcare, Community"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  disabled={!isOrgAdmin}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Brief summary of organization goals and treasury management..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Financial Parameters */}
            <h2 className="text-lg font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2 pt-4">
              <Coins className="w-4 h-4 text-emerald-400" />
              Financial & Localization
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Operating Currency
                </label>
                <select
                  name="currency"
                  disabled={!isOrgAdmin}
                  value={formData.currency}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="AED">AED (د.إ) - UAE Dirham</option>
                  <option value="SGD">SGD (S$) - Singapore Dollar</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Timezone
                </label>
                <input
                  type="text"
                  name="timezone"
                  disabled={!isOrgAdmin}
                  value={formData.timezone}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Contact & Address */}
            <h2 className="text-lg font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2 pt-4">
              <MapPin className="w-4 h-4 text-purple-400" />
              Contact & Address
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  name="email"
                  disabled={!isOrgAdmin}
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="contact@org.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  name="phone"
                  disabled={!isOrgAdmin}
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 ..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  name="website"
                  disabled={!isOrgAdmin}
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  name="address.street"
                  disabled={!isOrgAdmin}
                  value={formData.address.street}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  name="address.city"
                  disabled={!isOrgAdmin}
                  value={formData.address.city}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  State / Province
                </label>
                <input
                  type="text"
                  name="address.state"
                  disabled={!isOrgAdmin}
                  value={formData.address.state}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  name="address.country"
                  disabled={!isOrgAdmin}
                  value={formData.address.country}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Postal Code
                </label>
                <input
                  type="text"
                  name="address.postalCode"
                  disabled={!isOrgAdmin}
                  value={formData.address.postalCode}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>
            </div>

            {isOrgAdmin && (
              <div className="flex justify-end pt-4 border-t border-white/10">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving Changes..." : "Save Settings"}
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </ModernLayout>
  );
};

export default OrganizationProfile;
