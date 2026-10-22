import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { isAdmin, isTreasurer } from "../../utils/roles";
import {
    LayoutDashboard,
    User,
    Wallet,
    FileText,
    Settings,
    Users,
    CreditCard,
    PieChart,
    ClipboardList,
    Menu,
    X,
    LogOut,
    ChevronRight,
    BookOpen, // Added for Reports specifically
    Calendar,
    Building2
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../utils/cn";

const SidebarItem = ({ icon: Icon, label, path, active, collapsed }) => {
    return (
        <Link
            to={path}
            className={cn(
                "relative flex items-center px-4 py-3 rounded-xl transition-all duration-300 group mb-2 border border-transparent",
                active
                    ? "text-white bg-white/10 border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
        >
            {active && (
                <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-xl opacity-50"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
            )}

            <div className="relative z-10 flex items-center w-full">
                <Icon className={cn("w-5 h-5 transition-transform", active && "scale-110")} />

                {!collapsed && (
                    <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="ml-3 font-medium text-sm whitespace-nowrap"
                    >
                        {label}
                    </motion.span>
                )}
            </div>

            {!collapsed && active && (
                <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute right-3 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                />
            )}
        </Link>
    );
};

const Sidebar = ({ isOpen, setIsOpen, isMobile }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);

    // Define navigation based on role with STRICT user request
    const getNavItems = () => {
        const role = user?.role || "";

        if (isAdmin(role)) {
            return [
                { icon: LayoutDashboard, label: "Financial Overview", path: "/dashboard" },
                { icon: Building2, label: "Organization", path: "/organization" },
                { icon: Users, label: "Members", path: "/members" },
                { icon: FileText, label: "Transactions", path: "/transactions" },
                { icon: PieChart, label: "Budgets", path: "/class-budget" },
                { icon: CreditCard, label: "Manage Dues", path: "/manage-dues" },
                { icon: FileText, label: "Monthly Report", path: "/monthly-report" },
                { icon: Calendar, label: "Event Timeline", path: "/events" },
                { icon: PieChart, label: "Analytics", path: "/analytics" },
                { icon: Settings, label: "Settings", path: "/settings" },
                { icon: User, label: "Profile", path: "/profile" },
            ];
        } else if (isTreasurer(role)) {
            return [
                { icon: LayoutDashboard, label: "Financial Overview", path: "/dashboard" },
                { icon: FileText, label: "Transactions", path: "/transactions" },
                { icon: PieChart, label: "Budgets", path: "/class-budget" },
                { icon: Wallet, label: "Wallet", path: "/wallet" },
                { icon: Users, label: "Members", path: "/members" },
                { icon: CreditCard, label: "Manage Dues", path: "/manage-dues" },
                { icon: Calendar, label: "Event Timeline", path: "/events" },
                { icon: PieChart, label: "Analytics", path: "/analytics" },
                { icon: Settings, label: "Settings", path: "/settings" },
                { icon: User, label: "Profile", path: "/profile" },
            ];
        } else {
            // Member View
            return [
                { icon: LayoutDashboard, label: "Financial Overview", path: "/dashboard" },
                { icon: Wallet, label: "Wallet", path: "/wallet" },
                { icon: FileText, label: "My Transactions", path: "/my-transactions" },
                { icon: PieChart, label: "Budgets", path: "/class-budget" },
                { icon: Users, label: "Members", path: "/members" },
                { icon: CreditCard, label: "Dues", path: "/dues" },
                { icon: Calendar, label: "Event Timeline", path: "/events" },
                { icon: FileText, label: "Wallet Activity", path: "/wallet-ledger" },
                { icon: BookOpen, label: "Reports", path: "/reports" },
                { icon: Settings, label: "Settings", path: "/settings" },
                { icon: User, label: "Profile", path: "/profile" },
            ];
        }
    };

    const navItems = getNavItems();

    const sidebarWidth = collapsed ? "w-20" : "w-64";

    return (
        <>
            <AnimatePresence>
                {(isOpen || !isMobile) && (
                    <motion.aside
                        initial={isMobile ? { x: -300 } : false}
                        animate={{ x: 0 }}
                        exit={{ x: -300 }}
                        className={cn(
                            "fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-in-out border-r border-white/10 glass-panel",
                            isMobile ? "w-64 shadow-2xl" : sidebarWidth
                        )}
                    >
                        <div className="flex flex-col h-full">
                            {/* Logo Area */}
                            <div className="h-[76px] flex items-center justify-between px-5 border-b border-white/10">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/30 ring-1 ring-white/20 hover:scale-105 transition-transform duration-300">
                                        <Wallet className="w-5 h-5 text-white" />
                                    </div>
                                    {!collapsed && (
                                        <motion.span
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400 tracking-tight"
                                        >
                                            SEIP Platform
                                        </motion.span>
                                    )}
                                </div>
                                {!isMobile && (
                                    <button
                                        onClick={() => setCollapsed(!collapsed)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        {collapsed ? <ChevronRight size={18} /> : <Menu size={18} />}
                                    </button>
                                )}
                                {isMobile && (
                                    <button onClick={() => setIsOpen(false)}>
                                        <X size={20} className="text-slate-500" />
                                    </button>
                                )}
                            </div>

                            {/* Navigation */}
                            <div className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar">
                                <nav className="space-y-1">
                                    {navItems.map((item) => (
                                        <SidebarItem
                                            key={item.path}
                                            {...item}
                                            active={location.pathname === item.path}
                                            collapsed={collapsed && !isMobile}
                                        />
                                    ))}
                                </nav>
                            </div>

                            {/* User Profile */}
                            <div className="p-4 border-t border-white/10">
                                <div className={cn(
                                    "flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all",
                                    collapsed ? "justify-center" : ""
                                )}>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold shrink-0 shadow-lg shadow-cyan-500/20">
                                        {user?.name?.[0] || "U"}
                                    </div>
                                    {!collapsed && (
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-bold text-slate-200 truncate">{user?.name}</p>
                                            <p className="text-xs font-medium text-sky-400 truncate capitalize">{user?.role}</p>
                                        </div>
                                    )}
                                    {!collapsed && (
                                        <button
                                            onClick={logout}
                                            className="ml-auto p-2 rounded-lg text-slate-400 hover:text-white hover:bg-rose-500/80 transition-all duration-300 group"
                                            title="Logout"
                                        >
                                            <LogOut size={18} className="group-hover:scale-110 transition-transform" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Overlay for mobile */}
            {isMobile && isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsOpen(false)}
                    className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
                />
            )}
        </>
    );
};

export default Sidebar;
