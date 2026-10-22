import React, { useState, useEffect } from "react";
import api from "../utils/api";
import ModernLayout from "../components/layout/Layout";
import { Search, Filter, RefreshCw, UserPlus, Trash2, Edit2, X, Mail, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterYear, setFilterYear] = useState("all");
  const [newStudent, setNewStudent] = useState({
    fullName: "",
    registerNumber: "",
    dob: "",
    gender: "",
    department: "CSE",
    year: "III",
    email: "",
    phoneNumber: "",
    address: ""
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/students");
      setStudents(response.data?.data || response.data || []);
    } catch (err) {
      setError("Failed to fetch students: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      await api.post("/students", newStudent);
      alert("✅ Student added successfully!");
      setNewStudent({
        fullName: "",
        registerNumber: "",
        dob: "",
        gender: "",
        department: "CSE",
        year: "III",
        email: "",
        phoneNumber: "",
        address: ""
      });
      setShowAddForm(false);
      fetchStudents();
    } catch (err) {
      alert("❌ Failed to add student: " + (err.response?.data?.error || err.message));
    }
  };

  const handleEditStudent = async (student) => {
    try {
      await api.put(`/students/${student.registerNumber}`, student);
      alert("✅ Student updated successfully!");
      setEditingStudent(null);
      fetchStudents();
    } catch (err) {
      alert("❌ Failed to update student: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteStudent = async (registerNumber) => {
    if (!window.confirm("Are you sure you want to delete this student?")) return;
    try {
      await api.delete(`/students/${registerNumber}`);
      fetchStudents();
    } catch (err) {
      alert("❌ Failed to delete student");
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.registerNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = filterYear === "all" || student.year === filterYear;
    return matchesSearch && matchesYear;
  });

  return (
    <ModernLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-blue-600" /> Manage Students
            </h1>
            <p className="text-slate-500 mt-1">Add, edit, or remove student records.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25 font-medium"
            >
              <UserPlus size={18} /> Add Student
            </button>
            <button
              onClick={fetchStudents}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </header>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-slate-400" />
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="px-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              <option value="all">All Years</option>
              <option value="I">Year I</option>
              <option value="II">Year II</option>
              <option value="III">Year III</option>
              <option value="IV">Year IV</option>
            </select>
          </div>
        </div>

        {/* Student List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredStudents.map((student) => (
              <motion.div
                key={student._id || student.registerNumber}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative group"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                      {student.fullName?.[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 line-clamp-1">{student.fullName}</h3>
                      <p className="text-xs text-slate-500 font-mono">{student.registerNumber}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingStudent(student)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                    <button onClick={() => handleDeleteStudent(student.registerNumber)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2"><div className="w-4"><Mail size={14} /></div> <span className="truncate">{student.email}</span></div>
                  <div className="flex items-center gap-2"><div className="w-4"><Phone size={14} /></div> <span>{student.phoneNumber}</span></div>
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-semibold">{student.department}</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-semibold">Year {student.year}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {loading && <div className="text-center py-10">Loading...</div>}
        {!loading && filteredStudents.length === 0 && (
          <div className="text-center py-12 text-slate-500">No students found.</div>
        )}

        {/* Add/Edit Modal */}
        {(showAddForm || editingStudent) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                <h2 className="text-xl font-bold text-slate-900">{editingStudent ? "Edit Student" : "Add New Student"}</h2>
                <button onClick={() => { setShowAddForm(false); setEditingStudent(null); }} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
              </div>
              <form onSubmit={editingStudent ? (e) => { e.preventDefault(); handleEditStudent(editingStudent); } : handleAddStudent} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Form fields here - reusing state logic */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Full Name</label>
                    <input required type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50"
                      value={editingStudent ? editingStudent.fullName : newStudent.fullName}
                      onChange={(e) => editingStudent ? setEditingStudent({ ...editingStudent, fullName: e.target.value }) : setNewStudent({ ...newStudent, fullName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Register Number</label>
                    <input required type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50"
                      value={editingStudent ? editingStudent.registerNumber : newStudent.registerNumber}
                      onChange={(e) => editingStudent ? setEditingStudent({ ...editingStudent, registerNumber: e.target.value }) : setNewStudent({ ...newStudent, registerNumber: e.target.value })}
                      disabled={!!editingStudent}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Email</label>
                    <input required type="email" className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50"
                      value={editingStudent ? editingStudent.email : newStudent.email}
                      onChange={(e) => editingStudent ? setEditingStudent({ ...editingStudent, email: e.target.value }) : setNewStudent({ ...newStudent, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Phone</label>
                    <input required type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50"
                      value={editingStudent ? editingStudent.phoneNumber : newStudent.phoneNumber}
                      onChange={(e) => editingStudent ? setEditingStudent({ ...editingStudent, phoneNumber: e.target.value }) : setNewStudent({ ...newStudent, phoneNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-sm font-medium">Address</label>
                    <input className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50"
                      value={editingStudent ? editingStudent.address : newStudent.address}
                      onChange={(e) => editingStudent ? setEditingStudent({ ...editingStudent, address: e.target.value }) : setNewStudent({ ...newStudent, address: e.target.value })}
                    />
                  </div>
                </div>

                {!editingStudent && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">DOB</label>
                      <input required type="date" className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50"
                        value={newStudent.dob}
                        onChange={(e) => setNewStudent({ ...newStudent, dob: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Gender</label>
                      <select required className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50"
                        value={newStudent.gender}
                        onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })}
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => { setShowAddForm(false); setEditingStudent(null); }} className="px-5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/25">Save Student</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ModernLayout>
  );
}