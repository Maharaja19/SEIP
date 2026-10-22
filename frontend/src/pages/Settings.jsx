import React, { useEffect, useState } from "react";
import { User, Bell, Lock, Palette, Smartphone, LogOut, Trash2, Sun, Save } from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/api";
import { getApiData } from "../utils/apiHelpers";
import ModernLayout from "../components/layout/Layout";
import { cn } from "../utils/cn";
import { useAuth } from "../context/AuthContext";
import { clearAuthStorage } from "../utils/authUser";

export default function Settings() {
  const { user, login } = useAuth();

  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    dueReminders: true,
    budgetAlerts: true
  });
  const [privacy, setPrivacy] = useState({
    profileVisibility: "public",
    showTransactions: false,
    showEmail: true
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: ""
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    if (!user) return;

    const loadSettings = async () => {
      try {
        setLoading(true);
        const response = await api.get("/settings");
        const data = getApiData(response);
        const profile = data?.profile || user;

        setFormData({
          name: profile.name || "",
          contactNo: profile.contactNo || "",
          branch: profile.onboarding?.academic?.branch || profile.branch || "",
          batch: profile.onboarding?.academic?.batch || profile.batch || "",
          year: profile.onboarding?.academic?.year || profile.year || "",
          gender: profile.gender || "",
          community: profile.community || "",
          cgpa: profile.cgpa || "",
          firstGraduate: profile.firstGraduate || false,
          otherState: profile.otherState || false,
        });

        if (data?.settings?.notifications) {
          setNotifications((prev) => ({ ...prev, ...data.settings.notifications }));
        }
        if (data?.settings?.privacy) {
          setPrivacy((prev) => ({ ...prev, ...data.settings.privacy }));
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
        setFormData({
          name: user.name || "",
          contactNo: user.contactNo || "",
          branch: user.onboarding?.academic?.branch || "",
          batch: user.onboarding?.academic?.batch || "",
          year: user.onboarding?.academic?.year || "",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  const saveUiPreferences = async () => {
    try {
      setSaving(true);
      const response = await api.put("/settings", { notifications, privacy });
      const data = getApiData(response);
      const token = localStorage.getItem("token");
      if (data?.profile && token) login(data.profile, token);
      toast.success("Preferences saved successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  // Skeleton Loaders
  const FormFieldSkeleton = () => (
    <div className="space-y-2 animate-pulse">
      <div className="h-4 w-24 bg-slate-200 rounded"></div>
      <div className="h-10 w-full bg-slate-200 rounded-lg"></div>
    </div>
  );

  if (!user) {
    return (
      <ModernLayout>
        <div 
          className="flex items-center justify-center h-full px-4 sm:px-6"
          role="alert"
          aria-live="polite"
        >
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">
              <span aria-hidden="true">⚠️</span> Authentication Required
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Please log in to access settings.
            </p>
          </div>
        </div>
      </ModernLayout>
    );
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === "number") {
      setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || "" }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    setNotifications(prev => ({ ...prev, [name]: checked }));
  };

  const handlePrivacyChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPrivacy(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    if (passwordError) setPasswordError("");
    if (passwordSuccess) setPasswordSuccess("");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put("/settings", {
        name: formData.name,
        contactNo: formData.contactNo,
        branch: formData.branch,
        batch: formData.batch,
        year: formData.year,
      });

      const data = getApiData(res);
      const token = localStorage.getItem("token");
      if (data?.profile && token) {
        login(data.profile, token);
      }
      toast.success("Settings updated successfully");
    } catch (err) {
      console.error("Error updating user:", err);
      toast.error(err.response?.data?.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmNewPassword) {
      setPasswordError("Invalid password details.");
      return;
    }

    try {
      setPasswordError("");
      const endpoint = user.role.toLowerCase() === "student"
        ? `/students/${user.registerNumber}/change-password`
        : `/users/${user._id}/change-password`;

      const res = await api.put(endpoint, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (res.status === 200) {
        setPasswordSuccess("Password changed successfully!");
        setPasswordData({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
      }
    } catch (err) {
      setPasswordError(err.response?.data?.error || "Failed to change password.");
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      clearAuthStorage();
      window.location.href = '/login';
    }
  };

  const NavItem = ({ id, label, icon: Icon }) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      role="tab"
      aria-selected={activeTab === id}
      aria-controls={`${id}-panel`}
      className={cn(
        "flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all w-full text-left font-medium text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        activeTab === id
          ? "bg-blue-50 text-blue-600"
          : "hover:bg-slate-50 text-slate-600"
      )}
    >
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );

  return (
    <ModernLayout>
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-8 pb-8 sm:pb-10" role="main" aria-label="Settings">
        <header>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Palette className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" aria-hidden="true" />
            Settings
          </h1>
          <p className="text-slate-600 mt-1 text-sm sm:text-base">
            Manage your account preferences.
          </p>
        </header>

        <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
          {/* Sidebar Navigation */}
          <nav 
            className="w-full md:w-64 bg-white rounded-2xl border border-slate-200 p-2 sm:p-3 space-y-1"
            role="tablist"
            aria-label="Settings navigation"
          >
            <NavItem id="profile" label="Profile" icon={User} />
            <NavItem id="notifications" label="Notifications" icon={Bell} />
            <NavItem id="privacy" label="Privacy" icon={Lock} />
            <NavItem id="appearance" label="Appearance" icon={Palette} />
            <NavItem id="account" label="Account Security" icon={Smartphone} />
          </nav>

          {/* Content Area */}
          <div className="flex-1 w-full bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 md:p-8">

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div 
                id="profile-panel"
                role="tabpanel"
                aria-labelledby="profile-tab"
                className="space-y-5 sm:space-y-6"
              >
                <h2 className="text-base sm:text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 sm:pb-4">
                  Personal Information
                </h2>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <FormFieldSkeleton />
                    <FormFieldSkeleton />
                    <FormFieldSkeleton />
                    <FormFieldSkeleton />
                    <FormFieldSkeleton />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-1.5 sm:space-y-2">
                        <label htmlFor="name" className="text-xs sm:text-sm font-medium text-slate-700">
                          Full Name
                        </label>
                        <input
                          id="name"
                          type="text"
                          name="name"
                          value={formData.name || ""}
                          onChange={handleChange}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base outline-none"
                          placeholder="Your name"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <label htmlFor="branch" className="text-xs sm:text-sm font-medium text-slate-700">
                          Branch
                        </label>
                        <input
                          id="branch"
                          type="text"
                          name="branch"
                          value={formData.branch || ""}
                          onChange={handleChange}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base outline-none"
                          placeholder="Department / Branch"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <label htmlFor="batch" className="text-xs sm:text-sm font-medium text-slate-700">
                          Batch
                        </label>
                        <input
                          id="batch"
                          type="text"
                          name="batch"
                          value={formData.batch || ""}
                          onChange={handleChange}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base outline-none"
                          placeholder="e.g. 2023 - 2027"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <label htmlFor="year" className="text-xs sm:text-sm font-medium text-slate-700">
                          Year
                        </label>
                        <input
                          id="year"
                          type="text"
                          name="year"
                          value={formData.year || ""}
                          onChange={handleChange}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base outline-none"
                          placeholder="e.g. 3rd Year"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <label htmlFor="contactNo" className="text-xs sm:text-sm font-medium text-slate-700">
                          Contact Number
                        </label>
                        <input 
                          id="contactNo"
                          type="tel" 
                          name="contactNo" 
                          value={formData.contactNo || ""} 
                          onChange={handleChange} 
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base outline-none" 
                          placeholder="Enter 10-digit contact number"
                          aria-label="Contact number"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <label htmlFor="gender" className="text-xs sm:text-sm font-medium text-slate-700">
                          Gender
                        </label>
                        <select 
                          id="gender"
                          name="gender" 
                          value={formData.gender || ""} 
                          onChange={handleChange} 
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base outline-none cursor-pointer"
                          aria-label="Gender"
                        >
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <label htmlFor="community" className="text-xs sm:text-sm font-medium text-slate-700">
                          Community
                        </label>
                        <input 
                          id="community"
                          type="text" 
                          name="community" 
                          value={formData.community || ""} 
                          onChange={handleChange} 
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base outline-none" 
                          placeholder="Enter community"
                          aria-label="Community"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <label htmlFor="religion" className="text-xs sm:text-sm font-medium text-slate-700">
                          Religion
                        </label>
                        <input 
                          id="religion"
                          type="text" 
                          name="religion" 
                          value={formData.religion || ""} 
                          onChange={handleChange} 
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base outline-none" 
                          placeholder="Enter religion"
                          aria-label="Religion"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <label htmlFor="cgpa" className="text-xs sm:text-sm font-medium text-slate-700">
                          CGPA
                        </label>
                        <input 
                          id="cgpa"
                          type="number" 
                          name="cgpa" 
                          value={formData.cgpa || ""} 
                          onChange={handleChange} 
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base outline-none" 
                          step="0.01" 
                          min="0" 
                          max="10"
                          placeholder="0.00 - 10.00"
                          aria-label="CGPA"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="mt-4 sm:mt-6 px-5 sm:px-6 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg sm:rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      aria-label="Save profile changes"
                    >
                      <Save size={18} aria-hidden="true" />
                      <span>{saving ? "Saving..." : "Save Changes"}</span>
                    </button>
                  </>
                )}
              </div>
            )}

            {activeTab === "notifications" && (
              <div
                id="notifications-panel"
                role="tabpanel"
                aria-labelledby="notifications-tab"
                className="space-y-5 sm:space-y-6"
              >
                <h2 className="text-base sm:text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 sm:pb-4">
                  Notification Preferences
                </h2>
                <div className="space-y-3">
                  {[
                    { key: "emailNotifications", label: "Email notifications" },
                    { key: "pushNotifications", label: "Push notifications" },
                    { key: "smsNotifications", label: "SMS notifications" },
                    { key: "dueReminders", label: "Due reminders" },
                    { key: "budgetAlerts", label: "Budget alerts" },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50"
                    >
                      <span className="text-sm sm:text-base font-medium text-slate-800">{item.label}</span>
                      <input
                        type="checkbox"
                        name={item.key}
                        checked={!!notifications[item.key]}
                        onChange={handleNotificationChange}
                        className="h-4 w-4 accent-blue-600"
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={saveUiPreferences}
                  className="px-5 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg sm:rounded-xl font-medium hover:bg-blue-700"
                >
                  Save Notification Preferences
                </button>
              </div>
            )}

            {activeTab === "privacy" && (
              <div
                id="privacy-panel"
                role="tabpanel"
                aria-labelledby="privacy-tab"
                className="space-y-5 sm:space-y-6"
              >
                <h2 className="text-base sm:text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 sm:pb-4">
                  Privacy Preferences
                </h2>
                <div className="space-y-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <label htmlFor="profileVisibility" className="text-xs sm:text-sm font-medium text-slate-700">
                      Profile visibility
                    </label>
                    <select
                      id="profileVisibility"
                      name="profileVisibility"
                      value={privacy.profileVisibility}
                      onChange={handlePrivacyChange}
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-200 bg-slate-50"
                    >
                      <option value="public">Public</option>
                      <option value="class_only">Class only</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-sm sm:text-base font-medium text-slate-800">Show transactions on profile</span>
                    <input
                      type="checkbox"
                      name="showTransactions"
                      checked={!!privacy.showTransactions}
                      onChange={handlePrivacyChange}
                      className="h-4 w-4 accent-blue-600"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-sm sm:text-base font-medium text-slate-800">Show email on profile</span>
                    <input
                      type="checkbox"
                      name="showEmail"
                      checked={!!privacy.showEmail}
                      onChange={handlePrivacyChange}
                      className="h-4 w-4 accent-blue-600"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={saveUiPreferences}
                  className="px-5 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg sm:rounded-xl font-medium hover:bg-blue-700"
                >
                  Save Privacy Preferences
                </button>
              </div>
            )}

            {/* APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div 
                id="appearance-panel"
                role="tabpanel"
                aria-labelledby="appearance-tab"
                className="space-y-5 sm:space-y-6"
              >
                <h2 className="text-base sm:text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 sm:pb-4">
                  Display & Access
                </h2>

                <div className="flex items-center justify-between p-4 sm:p-5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-2 sm:p-2.5 bg-white rounded-lg shadow-sm" aria-hidden="true">
                      <Sun className="text-amber-500" size={24} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm sm:text-base">
                        Dark Mode
                      </p>
                      <p className="text-xs sm:text-sm text-slate-600">
                        Easier on the eyes in low light
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer opacity-50" aria-label="Dark mode (disabled)">
                    <input 
                      type="checkbox" 
                      checked={false} 
                      onChange={() => {}} 
                      className="sr-only peer" 
                      aria-label="Dark mode toggle (disabled)"
                      disabled
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 rounded-full"></div>
                  </label>
                  <span className="ml-2 text-xs text-slate-500 italic">Disabled</span>
                </div>
              </div>
            )}

            {/* ACCOUNT TAB */}
            {activeTab === 'account' && (
              <div 
                id="account-panel"
                role="tabpanel"
                aria-labelledby="account-tab"
                className="space-y-5 sm:space-y-6"
              >
                <h2 className="text-base sm:text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 sm:pb-4">
                  Security Settings
                </h2>

                <div className="space-y-4 sm:space-y-5 max-w-md">
                  <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-100" role="note">
                    <p className="text-xs sm:text-sm text-blue-700">
                      <strong>Note:</strong> Password change is available for users with password-based accounts. Google OAuth users don't need to change passwords.
                    </p>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label htmlFor="currentPassword" className="text-xs sm:text-sm font-medium text-slate-700">
                      Current Password
                    </label>
                    <input 
                      id="currentPassword"
                      type="password" 
                      name="currentPassword" 
                      placeholder="Enter current password" 
                      value={passwordData.currentPassword} 
                      onChange={handlePasswordChange} 
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base outline-none" 
                      aria-label="Current password"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label htmlFor="newPassword" className="text-xs sm:text-sm font-medium text-slate-700">
                      New Password
                    </label>
                    <input 
                      id="newPassword"
                      type="password" 
                      name="newPassword" 
                      placeholder="Enter new password" 
                      value={passwordData.newPassword} 
                      onChange={handlePasswordChange} 
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base outline-none" 
                      aria-label="New password"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label htmlFor="confirmNewPassword" className="text-xs sm:text-sm font-medium text-slate-700">
                      Confirm New Password
                    </label>
                    <input 
                      id="confirmNewPassword"
                      type="password" 
                      name="confirmNewPassword" 
                      placeholder="Confirm new password" 
                      value={passwordData.confirmNewPassword} 
                      onChange={handlePasswordChange} 
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base outline-none" 
                      aria-label="Confirm new password"
                    />
                  </div>

                  {passwordError && (
                    <p className="text-rose-600 text-xs sm:text-sm" role="alert" aria-live="polite">
                      {passwordError}
                    </p>
                  )}
                  {passwordSuccess && (
                    <p className="text-emerald-600 text-xs sm:text-sm" role="alert" aria-live="polite">
                      {passwordSuccess}
                    </p>
                  )}

                  <button 
                    type="button"
                    onClick={changePassword} 
                    className="px-5 sm:px-6 py-2.5 sm:py-3 bg-slate-900 text-white rounded-lg sm:rounded-xl font-medium hover:bg-slate-800 active:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                    aria-label="Update password"
                  >
                    Update Password
                  </button>
                </div>

                <div className="pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-slate-100">
                  <h3 className="text-red-600 font-bold mb-3 sm:mb-4 text-sm sm:text-base">
                    Danger Zone
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <button 
                      type="button"
                      onClick={handleLogout} 
                      className="px-4 sm:px-5 py-2 sm:py-2.5 border border-slate-200 text-slate-700 rounded-lg sm:rounded-xl font-medium hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                      aria-label="Logout from account"
                    >
                      <LogOut size={16} aria-hidden="true" />
                      <span>Logout</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => alert("Contact admin to delete account")} 
                      className="px-4 sm:px-5 py-2 sm:py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg sm:rounded-xl font-medium flex items-center justify-center gap-2 border border-rose-200 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                      aria-label="Delete account (contact admin)"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                      <span>Delete Account</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </ModernLayout>
  );
}