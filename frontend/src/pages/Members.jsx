import React, { useState, useEffect } from "react";
import ModernLayout from "../components/layout/Layout";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { isAdmin } from "../utils/roles";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { 
  Users, 
  UserPlus, 
  Shield, 
  Mail, 
  Calendar, 
  Search, 
  MoreVertical, 
  CheckCircle2, 
  AlertCircle,
  Building,
  Tag,
  Trash2,
  Edit2
} from "lucide-react";

const Members = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New member form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "Member",
    department: "General",
    title: ""
  });

  const isOrgAdmin = isAdmin(user?.role);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/members");
      if (res.data.success) {
        setMembers(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load members:", err);
      toast.error(err.response?.data?.message || "Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!formData.email) {
      toast.error("Please provide an email");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/members", formData);
      if (res.data.success) {
        toast.success("Member added successfully");
        setShowAddModal(false);
        setFormData({ name: "", email: "", role: "Member", department: "General", title: "" });
        fetchMembers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add member");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      const res = await api.put(`/members/${memberId}/role`, { role: newRole });
      if (res.data.success) {
        toast.success(`Role updated to ${newRole}`);
        fetchMembers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update role");
    }
  };

  const handleStatusChange = async (memberId, newStatus) => {
    try {
      const res = await api.put(`/members/${memberId}/status`, { status: newStatus });
      if (res.data.success) {
        toast.success(`Status updated to ${newStatus}`);
        fetchMembers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName || "this member"} from the organization?`)) {
      return;
    }
    try {
      const res = await api.delete(`/members/${memberId}`);
      if (res.data.success) {
        toast.success("Member removed from organization");
        fetchMembers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove member");
    }
  };

  const filteredMembers = members.filter((m) => {
    const memberUser = m.user || {};
    const nameMatch = (memberUser.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const emailMatch = (memberUser.email || "").toLowerCase().includes(searchTerm.toLowerCase());
    const roleMatch = roleFilter === "all" || m.role === roleFilter || memberUser.role === roleFilter;
    return (nameMatch || emailMatch) && roleMatch;
  });

  return (
    <ModernLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-sky-400" />
              Organization Members
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage member directory, role assignments, and organization access.
            </p>
          </div>
          {isOrgAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
            >
              <UserPlus className="w-4 h-4" />
              Add Member
            </button>
          )}
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search members by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="Organization Admin">Organization Admin</option>
              <option value="Finance Manager">Finance Manager</option>
              <option value="Member">Member</option>
            </select>
          </div>
        </div>

        {/* Members Roster Table */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="py-20 text-center text-slate-400">Loading organization members...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium text-white">No members found</p>
              <p className="text-sm text-slate-500 mt-1">Try refining your search or add new members.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-white/5 border-b border-white/10 text-xs uppercase font-semibold text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Member</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Department / Title</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Joined</th>
                    {isOrgAdmin && <th className="px-6 py-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredMembers.map((member) => {
                    const memberUser = member.user || {};
                    const role = member.role || memberUser.role || "Member";
                    const status = member.status || (memberUser.isActive ? "active" : "suspended");
                    const joinedDate = member.joinedAt || member.createdAt || memberUser.createdAt;

                    return (
                      <tr key={member._id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md flex-shrink-0">
                              {memberUser.profilePicture || memberUser.avatar ? (
                                <img
                                  src={memberUser.profilePicture || memberUser.avatar}
                                  alt=""
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                (memberUser.name || "U")[0].toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-white">
                                {memberUser.name || "Unnamed Member"}
                              </div>
                              <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3" />
                                {memberUser.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {isOrgAdmin ? (
                            <select
                              value={role}
                              onChange={(e) => handleRoleChange(member._id, e.target.value)}
                              className="bg-slate-800 border border-slate-700 text-xs font-semibold rounded-lg px-2.5 py-1 text-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                            >
                              <option value="Member">Member</option>
                              <option value="Finance Manager">Finance Manager</option>
                              <option value="Organization Admin">Organization Admin</option>
                            </select>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                              <Shield className="w-3 h-3" />
                              {role}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-white text-xs font-medium">
                            {member.title || "—"}
                          </div>
                          <div className="text-xs text-slate-400">
                            {member.department || "General"}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {isOrgAdmin ? (
                            <button
                              onClick={() => handleStatusChange(member._id, status === "active" ? "suspended" : "active")}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                                status === "active"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
                              }`}
                            >
                              {status === "active" ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                              <span className="capitalize">{status}</span>
                            </button>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              status === "active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}>
                              <span className="capitalize">{status}</span>
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-xs text-slate-400">
                          {joinedDate ? new Date(joinedDate).toLocaleDateString() : "—"}
                        </td>

                        {isOrgAdmin && (
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleRemoveMember(member._id, memberUser.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="Remove member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Member Modal */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-slate-900 border border-white/20 rounded-2xl p-6 shadow-2xl space-y-4"
              >
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-sky-400" />
                    Add Organization Member
                  </h3>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleAddMember} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="member@organization.com"
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Alex Morgan"
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Role
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Member">Member</option>
                        <option value="Finance Manager">Finance Manager</option>
                        <option value="Organization Admin">Organization Admin</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Department
                      </label>
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        placeholder="e.g. Finance, Tech"
                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                      </input>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Title / Designation
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Lead Accountant, Operations Specialist"
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg disabled:opacity-50"
                    >
                      {submitting ? "Adding..." : "Add Member"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ModernLayout>
  );
};

export default Members;
