import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchMySubmissions } from '../services/submissionService';
import GlassCard from '../components/GlassCard';
import Spinner from '../components/Spinner';
import { FileText, CheckCircle2, Clock, UploadCloud } from 'lucide-react';
import EmptyState from '../components/EmptyState';

const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

function StudentSubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await fetchMySubmissions();
        setSubmissions(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <motion.div initial="hidden" animate="visible" variants={pageVariants} className="dashboard-container max-w-[1400px] mx-auto px-8">
      <h2 className="text-4xl font-extrabold tracking-tight mb-8">My Submissions</h2>
      
      {loading ? (
        <div className="flex justify-center p-20"><Spinner /></div>
      ) : submissions.length === 0 ? (
        <EmptyState 
          icon={UploadCloud}
          title="No Submissions Found"
          description="You haven't uploaded any assignment files yet. When you submit a task, it will appear here with its grading status."
        />
      ) : (
        <div className="space-y-4">
          {submissions.map(sub => (
            <GlassCard key={sub._id} className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="font-bold">{sub.taskId?.title || 'Assignment'}</h3>
                  <p className="text-xs text-muted">Submitted on {new Date(sub.submittedAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${sub.status === 'late' ? 'bg-amber-500/10 text-amber-500' : 'bg-success/10 text-success'}`}>
                  {sub.status}
                </span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default StudentSubmissionsPage;
