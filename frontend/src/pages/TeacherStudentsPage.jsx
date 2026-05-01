import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchMyClasses } from '../services/classService';
import GlassCard from '../components/GlassCard';
import Spinner from '../components/Spinner';
import { Users, Mail, ChevronRight } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export default function TeacherStudentsPage() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    fetchMyClasses()
      .then(({ data }) => setClasses(data))
      .catch(() => setError('Failed to load students.'))
      .finally(() => setLoading(false));
  }, []);

  // Deduplicate students across all classes
  const allStudents = useMemo(() => {
    const map = {};
    classes.forEach((cls) => {
      (cls.students || []).forEach((s) => {
        if (!map[s._id]) map[s._id] = { ...s, classes: [] };
        map[s._id].classes.push(cls.name);
      });
    });
    return Object.values(map);
  }, [classes]);

  return (
    <motion.div
      initial="hidden" animate="visible" variants={containerVariants}
      className="max-w-[1400px] mx-auto px-8"
    >
      <div className="mb-10">
        <h2 className="text-4xl font-extrabold tracking-tight mb-2">My Students</h2>
        <p className="text-muted">Click a student to view their full profile and performance.</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-20"><Spinner text="Loading students…" /></div>
      ) : error ? (
        <GlassCard className="p-10 text-center text-danger">{error}</GlassCard>
      ) : allStudents.length === 0 ? (
        <GlassCard className="p-16 text-center border-dashed">
          <Users size={40} className="text-muted mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No students yet</h3>
          <p className="text-muted">Students will appear here once they join your classes.</p>
        </GlassCard>
      ) : (
        <>
          <p className="text-sm text-muted mb-6 font-medium">{allStudents.length} student{allStudents.length !== 1 ? 's' : ''} enrolled</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {allStudents.map((student) => (
              <motion.div key={student._id} variants={itemVariants}>
                <GlassCard
                  className="p-6 flex items-center gap-4 cursor-pointer group hover:border-primary/50 transition-all"
                  onClick={() => navigate(`/student/${student._id}`)}
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-2xl bg-primary-gradient flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {student.name?.[0]?.toUpperCase() ?? '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm leading-tight truncate group-hover:text-primary transition-colors">
                      {student.name}
                    </h3>
                    <p className="text-xs text-muted flex items-center gap-1 mt-1 truncate">
                      <Mail size={11} /> {student.email}
                    </p>
                    <p className="text-[10px] text-muted mt-1 truncate">
                      {student.classes.join(', ')}
                    </p>
                  </div>

                  <ChevronRight size={18} className="text-muted group-hover:text-primary transition-colors flex-shrink-0" />
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
