import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import TeacherLogin from './pages/TeacherLogin';
import StudentLogin from './pages/StudentLogin';
import Signup from './pages/Signup';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import ProfilePage from './pages/ProfilePage';
import TeacherTasksPage from './pages/TeacherTasksPage';
import TeacherStudentsPage from './pages/TeacherStudentsPage';
import StudentAssignmentsPage from './pages/StudentAssignmentsPage';
import StudentSubmissionsPage from './pages/StudentSubmissionsPage';
import StudentProfileView from './pages/StudentProfileView';
import { getToken } from './services/authService';

import GlassCard from './components/GlassCard';
import { motion } from 'framer-motion';

const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

function CalendarPage() { 
  return (
    <motion.div initial="hidden" animate="visible" variants={pageVariants} className="dashboard-container max-w-[1400px] mx-auto px-8">
      <h2 className="text-4xl font-extrabold tracking-tight mb-8">Calendar</h2>
      <GlassCard className="p-12 text-center border-dashed bg-surface/30">
        <p className="text-muted text-lg">Your academic schedule will appear here. No events scheduled for this week.</p>
      </GlassCard>
    </motion.div>
  ); 
}

function PrivateRoute({ user, children }) {
  return user ? children : <Navigate to="/login/student" replace />;
}

function RoleRoute({ user, roles, children }) {
  if (!user) return <Navigate to="/login/student" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function App() {
  const [user, setUser] = useState(() => {
    if (!getToken()) return null;
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <Router>
      <div className={user ? 'app-container min-h-screen bg-background' : 'auth-container min-h-screen bg-background'}>
        {user && <Sidebar user={user} onLogout={handleLogout} />}

        <main className={user ? 'main-content' : 'full-content'}>
          {user && <Navbar user={user} onLogout={handleLogout} />}
          <div className={user ? 'py-8' : 'w-full flex items-center justify-center'}>
            <Routes>
              <Route path="/login/teacher" element={<TeacherLogin onLogin={handleLogin} />} />
              <Route path="/login/student" element={<StudentLogin onLogin={handleLogin} />} />
              <Route path="/login"         element={<Navigate to="/login/student" replace />} />
              <Route path="/signup"        element={<Signup onLogin={handleLogin} />} />

              <Route path="/" element={
                <PrivateRoute user={user}>
                  {user?.role === 'teacher'
                    ? <TeacherDashboard user={user} />
                    : <StudentDashboard user={user} />}
                </PrivateRoute>
              } />

              <Route path="/tasks" element={
                <RoleRoute user={user} roles={['teacher']}><TeacherTasksPage /></RoleRoute>
              } />
              <Route path="/students" element={
                <RoleRoute user={user} roles={['teacher']}><TeacherStudentsPage /></RoleRoute>
              } />

              {/* Teacher: view individual student profile */}
              <Route path="/student/:id" element={
                <RoleRoute user={user} roles={['teacher']}><StudentProfileView /></RoleRoute>
              } />

              <Route path="/assignments" element={
                <RoleRoute user={user} roles={['student']}><StudentAssignmentsPage /></RoleRoute>
              } />
              <Route path="/submissions" element={
                <RoleRoute user={user} roles={['student']}><StudentSubmissionsPage /></RoleRoute>
              } />

              <Route path="/calendar" element={
                <PrivateRoute user={user}><CalendarPage /></PrivateRoute>
              } />

              <Route path="/profile" element={
                <PrivateRoute user={user}><ProfilePage user={user} /></PrivateRoute>
              } />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
