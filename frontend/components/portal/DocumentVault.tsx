// src/components/portal/DocumentVault.tsx
export const DocumentVault = ({ documents }: { documents: any[] }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
    <div className="p-4 border-b border-slate-100 bg-slate-50">
      <h3 className="font-semibold text-slate-800">Document Vault</h3>
    </div>
    <ul className="divide-y divide-slate-100">
      {documents.map((doc) => (
        <li key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded">📄</div>
            <div>
              <p className="text-sm font-medium text-slate-900">{doc.fileName}</p>
              <p className="text-xs text-slate-500">{new Date(doc.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <a href={doc.fileUrl} target="_blank" className="text-indigo-600 text-xs font-bold hover:underline">
            DOWNLOAD
          </a>
        </li>
      ))}
    </ul>
  </div>
);