import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, User, LogOut, UserCircle, Edit3, CheckCheck, X, Layers, ChevronDown } from 'lucide-react';
import { removeToken } from '../services/authService';
import { useWorkspace } from '../context/WorkspaceContext';
import { fetchNotifications, markRead, markAllRead } from '../services/notificationService';
import ThemeToggle from './ThemeToggle';

// ── Relative time helper ──────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_ICON = {
  assignment: '📋',
  reminder:   '⏰',
  submission: '✅',
};

const dropdownVariants = {
  hidden:  { opacity: 0, y: -8, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1,   transition: { type: 'spring', stiffness: 400, damping: 28 } },
  exit:    { opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.15 } },
};

function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const {
    workspaces = [],
    activeWorkspace = null,
    setActiveWorkspace = () => {},
    loading = false,
    sessionLoading = false
  } = useWorkspace() || {};
  
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const workspaceRef = useRef(null);

  // ── Notification state ────────────────────────────────────────────────────
  const [showNotif,    setShowNotif]    = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,  setUnreadCount]  = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef(null);

  // ── Profile dropdown state ────────────────────────────────────────────────
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);

  // ── Close dropdowns on outside click ─────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current  && !notifRef.current.contains(e.target))  setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
      if (workspaceRef.current && !workspaceRef.current.contains(e.target)) setShowWorkspaceMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Load notifications when dropdown opens ────────────────────────────────
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setNotifLoading(true);
    try {
      const { data } = await fetchNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // fail silently
    } finally {
      setNotifLoading(false);
    }
  }, [user]);

  // Poll unread count every 60 s while logged in
  useEffect(() => {
    if (!user) return;
    loadNotifications();
    const id = setInterval(loadNotifications, 60_000);
    return () => clearInterval(id);
  }, [user, loadNotifications]);

  const handleBellClick = () => {
    setShowProfile(false);
    setShowNotif((v) => !v);
    if (!showNotif) loadNotifications();
  };

  const handleMarkRead = async (id) => {
    try {
      await markRead(id);
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const handleLogout = () => {
    removeToken();
    onLogout();
    navigate(user?.role === 'teacher' ? '/login/teacher' : '/login/student');
  };

  // ── Unauthenticated navbar ────────────────────────────────────────────────
  if (!user) {
    return (
      <nav className="navbar glass px-8 py-4 mb-0 rounded-none border-b border-white/10">
        <Link to="/" className="logo"><span className="logo-text">EduTracker</span></Link>
        <div className="navbar-actions">
          <Link to="/login/teacher" className="nav-link">Teacher Portal</Link>
          <Link to="/login/student" className="nav-link">Student Portal</Link>
          <Link to="/signup" className="btn btn-primary btn-sm">Join Now</Link>
          <ThemeToggle />
        </div>
      </nav>
    );
  }

  const initials = user.name ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '?';

  return (
    <nav className="navbar px-8 py-4 mb-6 sticky top-0 z-[50] backdrop-blur-md flex items-center justify-between gap-8">
      
      <div className="flex items-center gap-6 flex-1">
        {/* Workspace Switcher */}
        {user && workspaces.length > 0 && (
          <div className="relative" ref={workspaceRef}>
            <button 
              onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
              className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-primary/50 transition-all group"
            >
              <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                <Layers size={16} />
              </div>
              <div className="text-left hidden md:block">
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest leading-none mb-1">Active Workspace</p>
                <p className="text-sm font-bold text-white leading-none truncate max-w-[150px]">
                  {activeWorkspace?.name || 'Select Workspace'}
                </p>
              </div>
              <ChevronDown size={14} className={`text-muted group-hover:text-white transition-transform duration-300 ${showWorkspaceMenu ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showWorkspaceMenu && (
                <motion.div
                  variants={dropdownVariants}
                  initial="hidden" animate="visible" exit="exit"
                  className="absolute top-full left-0 mt-2 w-[240px] bg-[#0f172a] border border-white/10 rounded-[20px] shadow-2xl p-2 z-[60]"
                >
                  <p className="px-3 py-2 text-[10px] font-black text-muted uppercase tracking-[0.2em]">Switch Context</p>
                  <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {(Array.isArray(workspaces) ? workspaces : []).map(ws => (
                      <button
                        key={ws._id}
                        onClick={() => {
                          console.log("STEP 1 CLICK:", ws);
                          setActiveWorkspace(ws);
                          setShowWorkspaceMenu(false);
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                          activeWorkspace?._id === ws._id 
                            ? 'bg-primary/20 border border-primary/20' 
                            : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          activeWorkspace?._id === ws._id ? 'bg-primary text-white' : 'bg-white/10 text-white/40'
                        }`}>
                          {ws.name[0]}
                        </div>
                        <div className="text-left overflow-hidden">
                          <p className="text-sm font-bold text-white truncate">{ws.name}</p>
                          <p className="text-[10px] text-muted truncate">{ws.subject}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Search */}
        <div className="search-bar flex-1 max-w-md">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Search everything..."
            className="bg-surface border border-border rounded-xl px-10 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
          />
        </div>
      </div>

      <div className="navbar-actions">

        {/* ── Bell / Notifications ── */}
        <div className="relative" ref={notifRef}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="icon-btn hover:bg-surface-hover transition-colors relative"
            onClick={handleBellClick}
            aria-label="Notifications"
          >
            <motion.div
              whileHover={{ rotate: [0, -10, 10, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
            >
              <Bell size={20} />
            </motion.div>
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </motion.button>

          <AnimatePresence>
            {showNotif && (
              <motion.div
                variants={dropdownVariants}
                initial="hidden" animate="visible" exit="exit"
                className="notif-dropdown profile-dropdown"
              >
                {/* Header */}
                <div className="notif-header">
                  <span className="font-bold text-sm">Notifications</span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                        title="Mark all as read"
                      >
                        <CheckCheck size={14} /> All read
                      </button>
                    )}
                    <button onClick={() => setShowNotif(false)} className="text-muted hover:text-main">
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* List */}
                <div className="notif-list">
                  {notifLoading ? (
                    <p className="notif-empty">Loading…</p>
                  ) : notifications.length === 0 ? (
                    <p className="notif-empty">You're all caught up! 🎉</p>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n._id}
                        className={`notif-item ${n.isRead ? 'read' : 'unread'}`}
                        onClick={() => !n.isRead && handleMarkRead(n._id)}
                      >
                        <span className="notif-icon">{TYPE_ICON[n.type] || '🔔'}</span>
                        <div className="notif-body">
                          <p className="notif-msg">{n.message}</p>
                          <p className="notif-time">{timeAgo(n.createdAt)}</p>
                        </div>
                        {!n.isRead && <span className="notif-dot" />}
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ThemeToggle />

        {/* ── Profile avatar + dropdown ── */}
        <div className="relative" ref={profileRef}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="user-profile bg-surface border border-border p-1 rounded-full flex items-center gap-3 hover:border-primary/50 transition-colors cursor-pointer group"
            onClick={() => { setShowNotif(false); setShowProfile((v) => !v); }}
            aria-label="Profile menu"
          >
            <div className="avatar w-8 h-8 rounded-full bg-primary-gradient flex items-center justify-center text-white font-bold text-sm select-none shadow-lg group-hover:shadow-primary/20">
              {initials}
            </div>
            <div className="user-info pr-3">
              <span className="user-name text-sm font-semibold block">{user.name || 'User'}</span>
              <span className="user-role text-[10px] text-muted uppercase tracking-wider">
                {user.role === 'teacher' ? 'Instructor' : 'Student'}
              </span>
            </div>
          </motion.button>

          <AnimatePresence>
            {showProfile && (
              <motion.div
                variants={dropdownVariants}
                initial="hidden" animate="visible" exit="exit"
                className="profile-dropdown"
              >
                {/* User info header */}
                <div className="profile-dropdown-header">
                  <div className="w-10 h-10 rounded-full bg-primary-gradient flex items-center justify-center text-white font-bold text-sm">
                    {initials}
                  </div>
                  <div>
                    <p className="font-semibold text-sm leading-tight">{user.name}</p>
                    <p className="text-xs text-muted">{user.email || user.role}</p>
                  </div>
                </div>

                <div className="profile-dropdown-divider" />

                <Link
                  to="/profile"
                  className="profile-dropdown-item"
                  onClick={() => setShowProfile(false)}
                >
                  <UserCircle size={16} /> View Profile
                </Link>
                <Link
                  to="/profile?edit=1"
                  className="profile-dropdown-item"
                  onClick={() => setShowProfile(false)}
                >
                  <Edit3 size={16} /> Edit Profile
                </Link>

                <div className="profile-dropdown-divider" />

                <button className="profile-dropdown-item danger" onClick={handleLogout}>
                  <LogOut size={16} /> Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
