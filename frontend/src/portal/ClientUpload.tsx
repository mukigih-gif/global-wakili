import React, { useState } from 'react';
import { UploadCloud, FileText, Check } from 'lucide-react';

const ClientUpload = ({ matterId }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    setIsUploading(true);
    // Mimicking upload logic
    const formData = new FormData();
    formData.append('file', file);
    formData.append('matterId', matterId);

    const response = await fetch('/api/portal/upload', { method: 'POST', body: formData });
    if (response.ok) {
      setIsUploading(false);
      alert("Document received by your Advocate.");
    }
  };

  return (
    <div className="p-6 bg-blue-50 rounded-3xl border-2 border-dashed border-blue-200 text-center">
      <UploadCloud className="mx-auto text-blue-400 mb-2" size={32}/>
      <h4 className="font-bold text-blue-900 text-sm">Upload Requested Files</h4>
      <p className="text-[10px] text-blue-500 mb-4 uppercase tracking-wider">PDF, PNG, or JPG only</p>
      
      <input 
        type="file" 
        className="hidden" 
        id="fileInput" 
        onChange={(e) => setFile(e.target.files[0])}
      />
      
      {!file ? (
        <label htmlFor="fileInput" className="cursor-pointer bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-bold hover:bg-blue-500">
          Browse Files
        </label>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs font-medium text-blue-700 flex items-center gap-1">
            <FileText size={14}/> {file.name}
          </span>
          <button onClick={handleUpload} className="bg-emerald-500 text-white px-6 py-2 rounded-xl text-xs font-bold">
            {isUploading ? 'Uploading...' : 'Confirm Upload'}
          </button>
        </div>
      )}
    </div>
  );
};