import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./Sidebar";
import { Menu, Bell, LogOut } from "lucide-react";
import { cn } from "../../utils/cn";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ModernLayout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const location = useLocation();
    
    // Get user authentication context
    const authContext = useAuth();
    const user = authContext?.user;
    const logout = authContext?.logout;

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1024);
            if (window.innerWidth >= 1024) {
                setIsSidebarOpen(true);
            } else {
                setIsSidebarOpen(false);
            }
        };

        // Initial check
        handleResize();

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Close sidebar on route change on mobile
    useEffect(() => {
        if (isMobile) {
            setIsSidebarOpen(false);
        }
    }, [location, isMobile]);
    
    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isDropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen, dropdownRef]);

    return (
        <div className="min-h-screen text-slate-200 bg-transparent relative overflow-hidden">
            {/* Ambient background glow elements */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/30 rounded-full mix-blend-screen filter blur-[100px] animate-blob z-0"></div>
            <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-sky-600/30 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000 z-0"></div>
            <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-indigo-600/30 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-4000 z-0"></div>
            
            <Sidebar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                isMobile={isMobile}
            />

            <div className={cn(
                "transition-all duration-300 min-h-screen flex flex-col relative z-10",
                !isMobile ? "pl-20 lg:pl-64" : ""
            )}>
                {/* Top Navbar */}
                <header className={cn(
                    "sticky top-0 z-20 px-4 sm:px-6 py-3 transition-all duration-300",
                    scrolled ? "glass-panel shadow-glass border-b border-white/10" : "bg-transparent"
                )}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {isMobile && (
                                <button
                                    onClick={() => setIsSidebarOpen(true)}
                                    className="p-2 rounded-lg hover:bg-white/10 text-slate-300 transition-colors"
                                >
                                    <Menu size={20} />
                                </button>
                            )}

                            {/* Page Title - Mobile only or when needed */}
                            <h1 className="text-xl font-bold text-gradient capitalize flex items-center gap-2">
                                {location.pathname.split('/')[1]?.replace('-', ' ') || 'Dashboard'}
                            </h1>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Notification Bell */}
                            <button className="relative p-2 rounded-xl hover:bg-white/10 text-slate-300 transition-colors hover-lift">
                                <Bell size={20} />
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-pink-500 rounded-full border border-[rgba(15,23,42,0.8)] animate-pulse-glow"></span>
                            </button>

                            {/* User Profile Dropdown */}
                            {authContext && user && (
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        className="flex items-center gap-3 p-1.5 pr-3 rounded-full hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-white/10"
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    >
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-medium text-sm shadow-lg shadow-purple-500/30">
                                            {(user.name && user.name?.charAt(0).toUpperCase()) || (user.email && user.email?.charAt(0).toUpperCase()) || 'U'}
                                        </div>
                                        <span className="hidden md:inline text-sm font-medium text-slate-200 truncate max-w-[100px]">
                                            {user.name || user.email || 'User'}
                                        </span>
                                    </button>
                                    
                                    {/* Dropdown Menu */}
                                    {isDropdownOpen && (
                                        <div 
                                            className="absolute right-0 mt-3 w-48 glass-card rounded-xl py-2 z-50 animate-fadeIn"
                                        >
                                            <div className="px-4 py-3 border-b border-white/10">
                                                <p className="text-sm font-semibold text-white truncate">{user.name || user.email || 'User'}</p>
                                                <p className="text-xs text-sky-400 font-medium capitalize mt-0.5">{(user && user.role) || 'User'}</p>
                                                {user.registerNumber && (
                                                    <p className="text-xs text-slate-400 mt-1">{user.registerNumber}</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={logout}
                                                className="w-full flex items-center gap-2 px-4 py-2 mt-1 text-sm text-rose-400 hover:bg-white/5 transition-colors group"
                                            >
                                                <LogOut size={16} className="group-hover:scale-110 transition-transform" />
                                                Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 px-4 sm:px-6 py-6 overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default ModernLayout;
