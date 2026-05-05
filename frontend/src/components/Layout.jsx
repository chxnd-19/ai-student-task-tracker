import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Search,
  Bell,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <BookOpen size={20} />, label: 'Classes', path: '/classes' },
    { icon: <Settings size={20} />, label: 'Settings', path: '/settings' },
  ];

  return (
    <motion.aside 
      initial={false}
      animate={{ 
        width: isCollapsed ? 80 : 260,
        x: 20, // Floating offset
        y: 20, // Floating offset
        height: 'calc(100vh - 40px)' // Floating height
      }}
      className="fixed left-0 top-0 bg-white/[0.01] backdrop-blur-3xl border border-white/5 flex flex-col z-50 overflow-hidden rounded-[24px] shadow-2xl weightless"
    >
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <motion.div 
          whileHover={{ scale: 1.1, rotate: 5 }}
          className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20"
        >
          <Sparkles size={24} />
        </motion.div>
        {!isCollapsed && (
          <motion.span 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xl font-black tracking-tight"
          >
            Edu<span className="text-purple-500">Tracker</span>
          </motion.span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-4 space-y-3 mt-8">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`nav-pill w-full group transition-all duration-500 hover:-translate-y-0.5 hover:brightness-125 ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
          >
            <motion.div whileHover={{ scale: 1.1 }}>{item.icon}</motion.div>
            {!isCollapsed && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-semibold text-sm"
              >
                {item.label}
              </motion.span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5">
        <button 
          onClick={logout}
          className="nav-pill w-full text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
        >
          <LogOut size={20} />
          {!isCollapsed && <span className="font-semibold text-sm">Logout</span>}
        </button>
      </div>
      
      {/* Collapse Toggle */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-10 bg-white/5 border-l border-white/10 rounded-l-xl flex items-center justify-center text-white/40 hover:text-white transition-all hover:bg-white/10"
      >
        <ChevronRight size={14} className={isCollapsed ? '' : 'rotate-180'} />
      </button>
    </motion.aside>
  );
};

const TopBar = ({ user, logout }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile]             = useState(false);
  const [notifications, setNotifications]         = useState([]);
  const [notifsLoading, setNotifsLoading]         = useState(false);
  const navigate = useNavigate();
  const notificationRef = useRef(null);
  const profileRef      = useRef(null);

  // Load notifications when bell is opened
  const loadNotifications = useCallback(async () => {
    if (notifsLoading) return;
    setNotifsLoading(true);
    try {
      const { fetchNotifications } = await import('../services/notificationService');
      const res = await fetchNotifications();
      setNotifications(res.data?.data?.notifications || []);
    } catch (_) {
      // non-critical — silently fail
    } finally {
      setNotifsLoading(false);
    }
  }, [notifsLoading]);

  const handleBellClick = () => {
    const next = !showNotifications;
    setShowNotifications(next);
    if (next) loadNotifications();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="px-8 pt-6 sticky top-0 z-40">
      <header className="h-16 flex items-center justify-between px-6 bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[20px] shadow-xl weightless">
        <div className="flex-1 max-w-xl">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-purple-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Quick search..." 
              className="w-full bg-transparent border-none py-2 pl-12 pr-4 text-xs focus:outline-none text-white placeholder-white/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Notifications Dropdown */}
          <div className="relative" ref={notificationRef}>
            <motion.button 
              whileHover={{ scale: 1.1 }}
              onClick={handleBellClick}
              className="relative p-2 text-white/20 hover:text-white transition-colors"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-pink-500 rounded-full ring-2 ring-[#0b0f1a]" />
              )}
            </motion.button>
            
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 bg-[#111827] backdrop-blur-lg border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="text-xs text-purple-400 font-semibold">{unreadCount} unread</span>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifsLoading ? (
                      <div className="p-4 space-y-2">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="animate-pulse bg-white/5 rounded-lg h-12" />
                        ))}
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-sm">
                        No notifications
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {notifications.slice(0, 10).map((notif, i) => (
                          <div key={notif._id || i} className={`p-3 rounded-lg text-sm transition-colors ${notif.isRead ? 'text-white/40' : 'bg-white/5 text-white/80'}`}>
                            <p>{notif.message}</p>
                            {notif.createdAt && (
                              <p className="text-[10px] text-white/20 mt-1">
                                {new Date(notif.createdAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Profile Dropdown */}
          <div className="relative flex items-center gap-3 pl-6 border-l border-white/5" ref={profileRef}>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-white/80">{user?.name || 'User'}</p>
              <p className="text-[9px] text-white/30 uppercase font-black tracking-widest">{user?.role || 'Member'}</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => setShowProfile(!showProfile)}
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white font-black border border-white/10 shadow-lg cursor-pointer"
            >
              {user?.name?.[0] || 'U'}
            </motion.button>
            
            <AnimatePresence>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-12 w-48 bg-white/10 backdrop-blur-lg border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                >
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      navigate('/settings');
                    }}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 transition-colors flex items-center gap-3"
                  >
                    <Settings size={16} />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      logout();
                    }}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-rose-500/10 text-rose-400 transition-colors flex items-center gap-3"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>
    </div>
  );
};

const Layout = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-transparent relative overflow-hidden">
      {/* GLOBAL DEPTH SYSTEM: Layer 1 Background Glows */}
      <motion.div 
        animate={{ 
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="glow-blob top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-500/10" 
      />
      <motion.div 
        animate={{ 
          x: [0, -40, 0],
          y: [0, 60, 0],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="glow-blob bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-pink-500/10" 
      />
      <motion.div 
        animate={{ 
          opacity: [0.03, 0.08, 0.03],
          scale: [1, 1.3, 1]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="glow-blob top-[40%] left-[20%] w-[400px] h-[400px] bg-blue-500/5" 
      />

      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      
      <main className={`flex-1 transition-all duration-700 ease-[0.16, 1, 0.3, 1] relative z-10 ${isCollapsed ? 'pl-24' : 'pl-[280px]'}`}>
        <TopBar user={user} logout={logout} />
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="p-8 pb-20"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};

export default Layout;
