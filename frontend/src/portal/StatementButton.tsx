// src/components/portal/StatementButton.tsx
import React, { useState } from 'react';
import axios from 'axios';

interface Props {
  matterId: string;
  fileNumber: string;
}

export const StatementButton: React.FC<Props> = ({ matterId, fileNumber }) => {
  const [loading, setLoading] = useState(false);

  const downloadStatement = async () => {
    setLoading(true);
    try {
      const response = await axios({
        url: `/api/v1/portal/statement/${matterId}`,
        method: 'GET',
        responseType: 'blob', // Important for handling PDF stream
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      // Create a local URL for the PDF blob and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Statement_${fileNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Statement Download Failed:", error);
      alert("Could not generate statement. Please contact your advocate.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={downloadStatement}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
        ${loading 
          ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:scale-95'
        }`}
    >
      {loading ? (
        <span className="animate-spin text-lg">⏳</span>
      ) : (
        <span className="text-lg">📄</span>
      )}
      {loading ? 'Generating...' : 'Download Statement'}
    </button>
  );
};