import React from 'react';
import { useApprovals } from '../../hooks/useApprovals';

export const ApprovalsTable = () => {
  const { pendingRequests, loading, processAction } = useApprovals();

  if (loading) return <div className="p-4 text-gray-500">Loading pending requests...</div>;

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matter / File</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount (KES)</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {pendingRequests.map((req) => (
            <tr key={req.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {req.matter.fileNumber} - {req.matter.title}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs">
                  {req.category}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                {new Intl.NumberFormat('en-KE').format(req.amount)}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 italic">"{req.description}"</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button 
                  onClick={() => processAction(req.id, 'APPROVE')}
                  className="text-green-600 hover:text-green-900 mr-4 font-bold"
                >
                  Approve
                </button>
                <button 
                  onClick={() => processAction(req.id, 'REJECT')}
                  className="text-red-600 hover:text-red-900"
                >
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pendingRequests.length === 0 && (
        <div className="p-10 text-center text-gray-400">All disbursement requests have been cleared.</div>
      )}
    </div>
  );
};