import React, { useState } from "react";
import api from "../../utils/api";

const ExcelUpload = ({ eventId }) => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [preview, setPreview] = useState([]);
  const [errors, setErrors] = useState([]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!eventId) return setStatus({ type: "error", message: "Create an event first, then upload Excel for that event." });
    if (!file) return setStatus({ type: "error", message: "Please select a file first." });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('eventId', eventId);

    try {
      setStatus({ type: "", message: "Uploading..." });

      const result = await api.post("/features/excel/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setStatus({ type: "success", message: `${result.data.message} (${result.data.recordCount} rows)` });
      setPreview(result.data.dataPreview || []);
      setErrors(result.data.errors || []);
    } catch (err) {
      setStatus({
        type: "error",
        message: err.response?.data?.error || err.response?.data?.message || err.message || "Upload failed",
      });
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto rounded-xl bg-gray-900 border border-gray-700 shadow-xl">
      <h2 className="text-2xl font-bold text-white mb-4">Bulk Upload Budget Data</h2>
      <p className="text-gray-400 mb-6 text-sm">Upload an Excel (.xlsx) file to automatically import budget records.</p>
      
      {status.message && (
        <div className={`p-4 mb-4 rounded ${status.type === 'success' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
          {status.message}
        </div>
      )}

      <form onSubmit={handleUpload} className="space-y-4 shadow-sm">
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-lg cursor-pointer bg-gray-800 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
            <p className="text-sm text-gray-400"><span className="font-semibold text-white">Click to select</span> or drag and drop</p>
            <p className="text-xs text-gray-500 mt-1">{file ? file.name : '.XLSX files only'}</p>
          </div>
          <input type="file" className="hidden" accept=".xlsx" onChange={(e) => setFile(e.target.files[0])} />
        </label>
        
        <button type="submit" disabled={!file} className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-600 disabled:opacity-50 text-white font-medium rounded-lg hover:from-teal-400 hover:to-emerald-500 transition-all shadow-md">
          Upload and Process
        </button>
      </form>

      {errors.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg text-white mb-3">Validation Errors</h3>
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="min-w-full text-sm text-left text-gray-300">
              <thead className="bg-gray-800 text-gray-400">
                <tr>
                  <th className="px-4 py-3">Row</th>
                  <th className="px-4 py-3">Error</th>
                  <th className="px-4 py-3">regNo</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-700 hover:bg-gray-800/50">
                    <td className="px-4 py-3">{row.rowIndex}</td>
                    <td className="px-4 py-3">{row.error}</td>
                    <td className="px-4 py-3 font-mono">{String(row.regNo || "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {preview.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg text-white mb-3">Data Preview</h3>
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="min-w-full text-sm text-left text-gray-300">
              <thead className="bg-gray-800 text-gray-400">
                <tr>
                  {Object.keys(preview[0]).map(key => <th key={key} className="px-4 py-3">{key}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b border-gray-700 hover:bg-gray-800/50">
                    {Object.values(row).map((val, idx) => <td key={idx} className="px-4 py-3">{String(val)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelUpload;
