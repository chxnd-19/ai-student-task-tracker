import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  BookOpen,
  Calendar,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';

/**
 * Role-specific nav items.
 * Students never see teacher-only items; teachers never see student-only items.
 */
const TEACHER_MENU = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/',          end: true  },
  { icon: <CheckSquare    size={20} />, label: 'Tasks',     path: '/tasks',      end: false },
  { icon: <Users          size={20} />, label: 'Students',  path: '/students',   end: false },
  { icon: <Calendar       size={20} />, label: 'Calendar',  path: '/calendar',   end: false },
];

const STUDENT_MENU = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard',   path: '/',            end: true  },
  { icon: <BookOpen        size={20} />, label: 'Assignments',  path: '/assignments', end: false },
  { icon: <FileText        size={20} />, label: 'Submissions',  path: '/submissions', end: false },
  { icon: <Calendar        size={20} />, label: 'Calendar',     path: '/calendar',    end: false },
];

const Sidebar = ({ user, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = user?.role === 'teacher' ? TEACHER_MENU : STUDENT_MENU;

  return (
    <motion.aside 
      animate={{ width: isCollapsed ? 80 : 260 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
    >
      <div className="sidebar-header">
        {!isCollapsed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="logo"
          >
            <GraduationCap className="text-primary" size={28} />
            <span className="logo-text">EduTracker</span>
          </motion.div>
        )}
        <button
          className="collapse-btn"
          onClick={() => setIsCollapsed((v) => !v)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            end={item.end}
            className={({ isActive }) => `nav-item sidebar-item${isActive ? ' active' : ''}`}
            title={isCollapsed ? item.label : undefined}
          >
            <motion.span 
              whileHover={{ scale: 1.1 }}
              className="icon"
            >
              {item.icon}
            </motion.span>
            {!isCollapsed && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="label"
              >
                {item.label}
              </motion.span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className="logout-btn nav-item sidebar-item"
          onClick={onLogout}
          title={isCollapsed ? 'Logout' : undefined}
        >
          <span className="icon"><LogOut size={20} /></span>
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="label"
            >
              Logout
            </motion.span>
          )}
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
