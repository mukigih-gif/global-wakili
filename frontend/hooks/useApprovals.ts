import { useState, useEffect } from 'react';
import axios from 'axios';

export const useApprovals = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/finance/approvals/pending');
      setPendingRequests(data);
    } catch (err) {
      console.error("Failed to fetch pending DRs", err);
    } finally {
      setLoading(false);
    }
  };

  const processAction = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await axios.post(`/api/finance/approvals/${requestId}`, { action });
      // Optimistic Update: Remove from list immediately
      setPendingRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (err) {
      alert("Action failed. Please check account balances.");
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  return { pendingRequests, loading, processAction, refresh: fetchRequests };
};