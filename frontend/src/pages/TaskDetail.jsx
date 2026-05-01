// Task editing is handled via the EditModal on the dashboard.
// This page acts as a fallback redirect.
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function TaskDetail() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/'); }, [navigate]);
  return null;
}

export default TaskDetail;
