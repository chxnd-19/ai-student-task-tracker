import React, { useState, useEffect } from 'react';
import { WorkspaceContext } from './WorkspaceContext';
import { fetchMyClasses, fetchJoinedClasses } from '../services/classService';

export function WorkspaceProvider({ children }) {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [activeWorkspace,   setActiveWorkspace]   = useState(null);

  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1. Restore from localStorage on mount
  useEffect(() => {
    const savedId = localStorage.getItem('activeWorkspaceId');
    const savedObj = localStorage.getItem('activeWorkspace');
    if (savedId) setActiveWorkspaceId(savedId);
    if (savedObj) {
      try {
        setActiveWorkspace(JSON.parse(savedObj));
      } catch (e) {
        console.warn("Failed to parse saved workspace object");
      }
    }
  }, []);

  // 2. Persist active workspace object
  useEffect(() => {
    if (activeWorkspace?._id) {
      localStorage.setItem('activeWorkspace', JSON.stringify(activeWorkspace));
      localStorage.setItem('activeWorkspaceId', activeWorkspace._id);
    }
  }, [activeWorkspace]);

  // 3. Safety timeout: Force loading false after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading === true) {
        console.warn("[WorkspaceProvider] Safety timeout reached.");
        setLoading(false);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [loading]);

  // 4. Main fetch effect
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return;

        const user = JSON.parse(userStr);
        const fetchFn = user.role === 'teacher' ? fetchMyClasses : fetchJoinedClasses;

        try {
          console.log(`[WorkspaceProvider] Fetching via: ${fetchFn.name}`);
          const { data } = await fetchFn();
          if (isMounted) setWorkspaces(data || []);
        } catch (err) {
          console.error("[WorkspaceProvider] Fetch failed:", err);
          if (isMounted) setError('Failed to load workspaces.');
        } finally {
          if (isMounted) setLoading(false);
        }
      } catch (err) {
        console.error("[WorkspaceProvider] Initialization failed:", err);
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, []); 

  // 5. Auto-select workspace after fetch
  useEffect(() => {
    const safeWorkspaces = Array.isArray(workspaces) ? workspaces : [];
    if (loading === false && safeWorkspaces.length > 0 && !activeWorkspaceId) {
      const first = safeWorkspaces[0];
      setActiveWorkspaceId(first._id);
      setActiveWorkspace(first);
    }
  }, [workspaces, activeWorkspaceId, loading]);

  const switchWorkspace = (idOrObj) => {
    if (!idOrObj) return;
    const safeWorkspaces = Array.isArray(workspaces) ? workspaces : [];
    
    if (typeof idOrObj === 'string') {
      const found = safeWorkspaces.find(w => w._id === idOrObj);
      if (found) {
        setActiveWorkspaceId(idOrObj);
        setActiveWorkspace(found);
      }
    } else if (idOrObj._id) {
      setActiveWorkspaceId(idOrObj._id);
      setActiveWorkspace(idOrObj);
    }
  };

  const createWorkspace = async (payload, createFn) => {
    try {
      const { data } = await createFn(payload);
      setWorkspaces((prev) => [data, ...prev]);
      switchWorkspace(data);
      return data;
    } catch (err) {
      console.error("[WorkspaceProvider] Creation failed:", err);
      throw err;
    }
  };

  const value = {
    workspaces,
    setWorkspaces,
    activeWorkspace,
    setActiveWorkspace: switchWorkspace,
    loading,
    setLoading,
    sessionLoading,
    setSessionLoading,
    activeWorkspaceId,
    createWorkspace,
    error
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}