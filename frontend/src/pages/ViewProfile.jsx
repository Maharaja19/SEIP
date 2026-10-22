import React, { useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  BookOpen,
  Hash,
  Flag,
  UserCircle,
} from "lucide-react";
import api from "../utils/api";
import { getApiData, getApiErrorMessage } from "../utils/apiHelpers";
import ModernLayout from "../components/layout/Layout";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function ViewProfile() {
  const { user, login } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    contactNo: "",
    branch: "",
    batch: "",
    year: "",
  });

  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email && !user?._id) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get("/users/profile");
        setStudentData(getApiData(response));
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.email, user?._id]);

  useEffect(() => {
    if (!studentData) return;
    setEditForm({
      name: studentData.name || studentData.fullName || "",
      contactNo: studentData.contactNo || studentData.phone || "",
      branch: studentData.branch || studentData.department || studentData.onboarding?.academic?.branch || "",
      batch: studentData.batch || studentData.onboarding?.academic?.batch || "",
      year: studentData.year || studentData.onboarding?.academic?.year || "",
    });
  }, [studentData]);

  const handleProfileSave = async () => {
    try {
      setSaving(true);
      const response = await api.put("/users/profile", editForm);
      const updated = getApiData(response);
      setStudentData((prev) => ({ ...prev, ...updated, ...editForm }));
      const token = localStorage.getItem("token");
      if (token) login(updated, token);
      setEditing(false);
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update profile"));
    } finally {
      setSaving(false);
    }
  };

  // Skeleton Loaders
  const InfoCardSkeleton = () => (
    <div 
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-full animate-pulse"
      role="status"
      aria-label="Loading profile information"
    >
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
        <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded"></div>
      </div>
      <div className="p-6 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-4">
            <div className="shrink-0 w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // 🚫 Not authenticated
  if (!user) {
    return (
      <ModernLayout>
        <div 
          className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 sm:px-6"
          role="alert"
          aria-live="polite"
        >
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">
            <span aria-hidden="true">⚠️</span> Authentication Required
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm sm:text-base">
            Please log in first to view your profile.
          </p>
        </div>
      </ModernLayout>
    );
  }

  // 🛡️ Helpers
  const safe = (val, fallback = "—") => val || fallback;

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return isNaN(d.getTime())
      ? dateString
      : d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  };

  const InfoCard = ({ title, items }) => (
    <article className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-full">
      <div className="px-5 sm:px-6 py-3 sm:py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
        <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
          {title}
        </h4>
      </div>
      <div className="p-5 sm:p-6 space-y-4 sm:space-y-5">
        {items.map((item, index) => (
          <div key={index} className="flex gap-3 sm:gap-4">
            <div 
              className="shrink-0 p-2 sm:p-2.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 h-fit"
              aria-hidden="true"
            >
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                {item.label}
              </p>
              <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-white break-words">
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );

  // 🧑‍🎓 Profile UI
  return (
    <ModernLayout>
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-8 pb-8 sm:pb-10" role="main" aria-label="Student Profile">
        {/* Header */}
        {loading ? (
          <div 
            className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm animate-pulse"
            role="status"
            aria-label="Loading profile"
          >
            <div className="h-32 sm:h-40 bg-slate-200 dark:bg-slate-700"></div>
            <div className="px-6 sm:px-8 pb-6 sm:pb-8 relative">
              <div className="absolute -top-12 sm:-top-16 left-6 sm:left-8 p-1.5 bg-slate-200 dark:bg-slate-700 rounded-2xl">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl bg-slate-200 dark:bg-slate-700"></div>
              </div>
              <div className="pt-16 sm:pt-20 md:pt-4 md:pl-36 sm:md:pl-40 space-y-3">
                <div className="h-7 sm:h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            </div>
          </div>
        ) : (
          <section className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="h-32 sm:h-40 bg-gradient-to-r from-blue-600 to-indigo-600" aria-hidden="true"></div>
            <div className="px-6 sm:px-8 pb-6 sm:pb-8 relative">
              <div className="absolute -top-12 sm:-top-16 left-6 sm:left-8 p-1.5 bg-white dark:bg-slate-800 rounded-2xl shadow-xl">
                <img
                  src={`https://ui-avatars.com/api/?name=${safe(
                    studentData?.fullName || studentData?.name
                  )}&background=007bff&color=fff&size=200`}
                  alt={`${safe(studentData?.fullName || studentData?.name)} profile picture`}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl object-cover bg-slate-200"
                />
              </div>
              <div className="pt-16 sm:pt-20 md:pt-4 md:pl-36 sm:md:pl-40 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                    {safe(studentData?.fullName || studentData?.name)}
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400 font-medium flex flex-wrap items-center gap-2 mt-1 sm:mt-2 text-sm sm:text-base">
                    <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded text-xs sm:text-sm font-semibold">
                      {safe(studentData?.role, "Student")}
                    </span>
                    <span aria-hidden="true">•</span>
                    <span>{safe(studentData?.registerNumber)}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing((prev) => !prev)}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg sm:rounded-xl font-medium hover:opacity-90 active:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                  aria-label="Edit profile"
                >
                  {editing ? "Cancel" : "Edit Profile"}
                </button>
              </div>
            </div>
          </section>
        )}

        {editing && !loading && (
          <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edit Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: "name", label: "Name", type: "text" },
                { name: "contactNo", label: "Contact Number", type: "tel" },
                { name: "branch", label: "Branch", type: "text" },
                { name: "batch", label: "Batch", type: "text" },
                { name: "year", label: "Year", type: "text" },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    name={field.name}
                    value={editForm[field.name]}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, [field.name]: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleProfileSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </section>
        )}

        {/* Info Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <InfoCardSkeleton />
            <InfoCardSkeleton />
            <InfoCardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <InfoCard
              title="Personal Information"
              items={[
                {
                  label: "Date of Birth",
                  value: formatDate(studentData?.dob),
                  icon: <Calendar size={18} />,
                },
                {
                  label: "Gender",
                  value: safe(studentData?.gender),
                  icon: <User size={18} />,
                },
                {
                  label: "Religion",
                  value: safe(studentData?.religion),
                  icon: <Flag size={18} />,
                },
              ]}
            />

            <InfoCard
              title="Academic Information"
              items={[
                {
                  label: "Register Number",
                  value: safe(studentData?.registerNumber),
                  icon: <Hash size={18} />,
                },
                {
                  label: "Department",
                  value: safe(studentData?.department, "CSE"),
                  icon: <UserCircle size={18} />,
                },
                {
                  label: "Year & Batch",
                  value: `${safe(studentData?.year, "3rd")} Year`,
                  icon: <BookOpen size={18} />,
                },
              ]}
            />

            <InfoCard
              title="Contact Details"
              items={[
                {
                  label: "Email Address",
                  value: safe(studentData?.email),
                  icon: <Mail size={18} />,
                },
                {
                  label: "Phone Number",
                  value: safe(
                    studentData?.phone || studentData?.contactNo
                  ),
                  icon: <Phone size={18} />,
                },
                {
                  label: "Residential Address",
                  value: safe(studentData?.address),
                  icon: <MapPin size={18} />,
                },
              ]}
            />
          </div>
        )}
      </div>
    </ModernLayout>
  );
}
