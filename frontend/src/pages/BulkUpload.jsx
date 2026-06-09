// src/pages/BulkUpload.jsx

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function BulkUpload({ onBack, onSuccess }) {
  const { authAxios }  = useAuth();
  const [file,     setFile]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const api      = authAxios();
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/students/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  // Generate sample CSV for download
  const downloadTemplate = () => {
    const headers = [
        'name','roll_number','school','sex','age','address','famsize',
        'Pstatus','Medu','Fedu','Mjob','Fjob','reason','guardian',
        'studytime','failures','schoolsup','famsup','paid','activities',
        'nursery','higher','internet','romantic','goout','Dalc','Walc',
        'absences','G1','G2'
    ].join(',');

    const sample = [
        'John Doe,S010,GP,M,17,U,GT3,T,2,2,other,other,course,mother,2,0,no,yes,no,no,yes,yes,yes,no,3,1,1,2,11,12',
        'Jane Smith,S011,GP,F,16,U,LE3,T,3,3,teacher,other,reputation,mother,3,0,no,yes,no,yes,yes,yes,yes,no,2,1,1,0,13,14'
    ].join('\n');

    const guide = [
        '',
        '--- COLUMN GUIDE (do not include this section in your upload) ---',
        'name: Full name of student',
        'roll_number: Unique roll number (e.g. S001)',
        'school: GP or MS',
        'sex: F or M',
        'age: 15 to 22',
        'address: U (Urban) or R (Rural)',
        'famsize: LE3 (<=3 members) or GT3 (>3 members)',
        'Pstatus: T (Living Together) or A (Apart)',
        'Medu: Mother education — 0 (none) / 1 (primary) / 2 (5th-9th grade) / 3 (secondary) / 4 (higher)',
        'Fedu: Father education — 0 (none) / 1 (primary) / 2 (5th-9th grade) / 3 (secondary) / 4 (higher)',
        'Mjob: Mother job — teacher / health / services / at_home / other',
        'Fjob: Father job — teacher / health / services / at_home / other',
        'reason: Reason for school — home / reputation / course / other',
        'guardian: mother / father / other',
        'studytime: Weekly study time — 1 (<2hrs) / 2 (2-5hrs) / 3 (5-10hrs) / 4 (>10hrs)',
        'failures: Number of past failures — 0 / 1 / 2 / 3',
        'schoolsup: Extra school support — yes or no',
        'famsup: Family support — yes or no',
        'paid: Extra paid classes — yes or no',
        'activities: Extracurricular activities — yes or no',
        'nursery: Attended nursery — yes or no',
        'higher: Wants higher education — yes or no',
        'internet: Internet at home — yes or no',
        'romantic: In a relationship — yes or no',
        'goout: Going out with friends — 1 (very low) to 5 (very high)',
        'Dalc: Workday alcohol consumption — 1 (very low) to 5 (very high)',
        'Walc: Weekend alcohol consumption — 1 (very low) to 5 (very high)',
        'absences: Number of absences — 0 to 93',
        'G1: First period grade — 0 to 20',
        'G2: Second period grade — 0 to 20',
    ].join('\n');

    const csv  = `${headers}\n${sample}\n${guide}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = 'failsafe_student_template.csv';
    link.click();
    URL.revokeObjectURL(url);
    };

  return (
    <div className="p-6 max-w-2xl mx-auto">

      {/* Header */}
      <button
        onClick={onBack}
        className="mb-4 text-sm text-blue-600 hover:underline
                   flex items-center gap-1"
      >
        ← Back
      </button>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">
        Bulk Upload Students
      </h2>
      <p className="text-gray-400 text-sm mb-6">
        Upload a CSV file to add multiple students at once.
      </p>

      {/* Template download */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg
                      p-4 mb-6 flex justify-between items-center">
        <div>
          <p className="text-sm font-semibold text-blue-700">
            Need a template?
          </p>
          <p className="text-xs text-blue-500 mt-0.5">
            Download the CSV template with correct column headers
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="text-xs bg-blue-600 hover:bg-blue-700 text-white
                     font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Download Template
        </button>
      </div>

      {/* Upload area */}
      <div className="bg-white rounded-xl border-2 border-dashed
                      border-gray-300 p-8 text-center mb-5">
        <div className="text-4xl mb-3">📂</div>
        <p className="text-gray-600 font-medium mb-3">
          Select your CSV file
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={e => {
            setFile(e.target.files[0]);
            setResult(null);
            setError(null);
          }}
          className="block mx-auto text-sm text-gray-500
                     file:mr-4 file:py-2 file:px-4 file:rounded-lg
                     file:border-0 file:text-sm file:font-semibold
                     file:bg-blue-50 file:text-blue-700
                     hover:file:bg-blue-100 cursor-pointer"
        />
        {file && (
          <p className="text-xs text-green-600 mt-2 font-medium">
            ✓ {file.name} selected ({(file.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600
                        rounded-lg px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-green-50 border border-green-200
                        rounded-xl p-5 mb-5">
          <h3 className="font-bold text-green-700 mb-3">
            Upload Complete
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {[
              { label: 'Added',   value: result.added,   color: 'text-green-600' },
              { label: 'Skipped', value: result.skipped, color: 'text-yellow-600' },
              { label: 'Errors',  value: result.errors,  color: 'text-red-600'   }
            ].map(({ label, value, color }) => (
              <div key={label}
                   className="bg-white rounded-lg p-3 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          {result.details.skipped_rolls.length > 0 && (
            <p className="text-xs text-yellow-600">
              Skipped (already exist): {result.details.skipped_rolls.join(', ')}
            </p>
          )}
          {result.details.error_details.length > 0 && (
            <p className="text-xs text-red-600 mt-1">
              Errors: {result.details.error_details.map(e =>
                `${e.roll_number}: ${e.error}`).join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold
                     px-6 py-2.5 rounded-lg transition-colors text-sm
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Uploading...' : 'Upload Students'}
        </button>
        {result && result.added > 0 && (
          <button
            onClick={onSuccess}
            className="bg-green-600 hover:bg-green-700 text-white
                       font-semibold px-6 py-2.5 rounded-lg
                       transition-colors text-sm"
          >
            Go to Dashboard
          </button>
        )}
        <button
          onClick={onBack}
          className="bg-white border border-gray-300 text-gray-600
                     hover:bg-gray-50 font-semibold px-6 py-2.5
                     rounded-lg transition-colors text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}