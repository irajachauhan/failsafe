// src/pages/AddStudent.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const FIELD_CONFIG = [
  { key: 'name',       label: 'Full Name',         type: 'text',   required: true },
  { key: 'roll_number',label: 'Roll Number',        type: 'text',   required: true },
  { key: 'school',     label: 'School',             type: 'select', options: ['GP','MS'] },
  { key: 'sex',        label: 'Sex',                type: 'select', options: ['F','M'] },
  { key: 'age',        label: 'Age',                type: 'number', min: 15, max: 22 },
  { key: 'address',    label: 'Address',            type: 'select', options: ['U','R'] },
  { key: 'famsize',    label: 'Family Size',        type: 'select', options: ['LE3','GT3'] },
  { key: 'Pstatus',    label: 'Parent Status',      type: 'select', options: ['T','A'] },
  { key: 'Medu',       label: "Mother's Education", type: 'number', min: 0, max: 4 },
  { key: 'Fedu',       label: "Father's Education", type: 'number', min: 0, max: 4 },
  { key: 'Mjob',       label: "Mother's Job",       type: 'select', options: ['teacher','health','services','at_home','other'] },
  { key: 'Fjob',       label: "Father's Job",       type: 'select', options: ['teacher','health','services','at_home','other'] },
  { key: 'reason',     label: 'Reason for School',  type: 'select', options: ['home','reputation','course','other'] },
  { key: 'guardian',   label: 'Guardian',           type: 'select', options: ['mother','father','other'] },
  { key: 'studytime',  label: 'Study Time (1-4)',   type: 'number', min: 1, max: 4 },
  { key: 'failures',   label: 'Past Failures',      type: 'number', min: 0, max: 3 },
  { key: 'schoolsup',  label: 'School Support',     type: 'select', options: ['yes','no'] },
  { key: 'famsup',     label: 'Family Support',     type: 'select', options: ['yes','no'] },
  { key: 'paid',       label: 'Extra Paid Classes', type: 'select', options: ['yes','no'] },
  { key: 'activities', label: 'Activities',         type: 'select', options: ['yes','no'] },
  { key: 'nursery',    label: 'Attended Nursery',   type: 'select', options: ['yes','no'] },
  { key: 'higher',     label: 'Wants Higher Edu',   type: 'select', options: ['yes','no'] },
  { key: 'internet',   label: 'Internet at Home',   type: 'select', options: ['yes','no'] },
  { key: 'romantic',   label: 'In Relationship',    type: 'select', options: ['yes','no'] },
  { key: 'goout',      label: 'Goes Out (1-5)',      type: 'number', min: 1, max: 5 },
  { key: 'Dalc',       label: 'Workday Alcohol (1-5)', type: 'number', min: 1, max: 5 },
  { key: 'Walc',       label: 'Weekend Alcohol (1-5)', type: 'number', min: 1, max: 5 },
  { key: 'absences',   label: 'Absences',           type: 'number', min: 0, max: 93 },
  { key: 'G1',         label: 'G1 — Period 1 Grade (0-20)', type: 'number', min: 0, max: 20 },
  { key: 'G2',         label: 'G2 — Period 2 Grade (0-20)', type: 'number', min: 0, max: 20 },
];

const DEFAULTS = {
  school: 'GP', sex: 'F', address: 'U', famsize: 'GT3',
  Pstatus: 'T', Mjob: 'other', Fjob: 'other', reason: 'course',
  guardian: 'mother', schoolsup: 'no', famsup: 'yes', paid: 'no',
  activities: 'no', nursery: 'yes', higher: 'yes', internet: 'yes',
  romantic: 'no', age: 17, Medu: 2, Fedu: 2, studytime: 2,
  failures: 0, goout: 3, Dalc: 1, Walc: 1, absences: 0,
  G1: 10, G2: 10
};

export default function AddStudent({ onBack, onSuccess, editStudent = null }) {
  const { authAxios } = useAuth();
  const isEdit = !!editStudent;

  const [form,    setForm]    = useState(
    isEdit ? { ...editStudent } : { name: '', roll_number: '', ...DEFAULTS }
  );
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const api     = authAxios();
      const payload = { ...form, faculty_id: form.faculty_id || null };

      // Convert number fields from string to number
      ['age','Medu','Fedu','studytime','failures','goout',
       'Dalc','Walc','absences','G1','G2'].forEach(k => {
        payload[k] = Number(payload[k]);
      });

      if (isEdit) {
        // PUT request to update existing student
        await api.put(`/students/${editStudent.id}`, payload);
      } else {
        await api.post('/students/', payload);
      }

      setSuccess(true);
      setTimeout(() => onSuccess(), 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save student');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="text-5xl">✅</div>
      <p className="text-green-600 font-semibold text-lg">
        Student {isEdit ? 'updated' : 'added'} successfully!
      </p>
      <p className="text-gray-400 text-sm">Returning...</p>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Header */}
      <button
        onClick={onBack}
        className="mb-4 text-sm text-blue-600 hover:underline
                   flex items-center gap-1"
      >
        ← Back
      </button>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">
        {isEdit ? `Edit Student — ${editStudent.name}` : 'Add New Student'}
      </h2>
      <p className="text-gray-400 text-sm mb-6">
        {isEdit
          ? 'Update student details. Changes will affect next risk assessment.'
          : 'Fill in student details. G1 and G2 are required for risk prediction.'
        }
      </p>

      {isEdit && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg
                        px-4 py-3 mb-5 text-sm text-blue-700">
          💡 Fields marked <strong>(key field)</strong> are the ones most
          likely to change during a semester. Update these to reflect
          current student status, then run Risk Assessment to see updated trend.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600
                        rounded-lg px-4 py-3 mb-5 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          {FIELD_CONFIG.map(({ key, label, type, options, min, max, required }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                {label}
                {/* Highlight key fields in edit mode */}
                {isEdit && ['G1','G2','absences','studytime','failures',
                            'goout','Dalc','Walc','internet','romantic',
                            'activities','schoolsup','famsup','paid']
                  .includes(key) && (
                  <span className="ml-1 text-blue-500 text-xs">(key field)</span>
                )}
              </label>
              {type === 'select' ? (
                <select
                  value={form[key] ?? ''}
                  onChange={e => handleChange(key, e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-sm
                              focus:outline-none focus:ring-2 focus:ring-blue-500
                              ${isEdit && ['G1','G2','absences','studytime','failures',
                                          'goout','Dalc','Walc','internet','romantic',
                                          'activities','schoolsup','famsup','paid']
                                .includes(key)
                                ? 'border-blue-300 bg-blue-50'
                                : 'border-gray-300'
                              }`}
                >
                  {options.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={type}
                  value={form[key] ?? ''}
                  onChange={e => handleChange(key, e.target.value)}
                  min={min}
                  max={max}
                  required={required}
                  className={`w-full border rounded-lg px-3 py-2 text-sm
                              focus:outline-none focus:ring-2 focus:ring-blue-500
                              ${isEdit && ['G1','G2','absences','studytime','failures',
                                          'goout','Dalc','Walc','internet','romantic',
                                          'activities','schoolsup','famsup','paid']
                                .includes(key)
                                ? 'border-blue-300 bg-blue-50'
                                : 'border-gray-300'
                              }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold
                       px-6 py-2.5 rounded-lg transition-colors text-sm
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? 'Saving...'
              : isEdit ? 'Update Student' : 'Add Student'
            }
          </button>
          <button
            type="button"
            onClick={onBack}
            className="bg-white border border-gray-300 text-gray-600
                       hover:bg-gray-50 font-semibold px-6 py-2.5
                       rounded-lg transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}