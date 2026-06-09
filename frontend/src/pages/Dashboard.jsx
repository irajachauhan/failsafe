// src/pages/Dashboard.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const RISK_COLORS = {
  High  : 'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low   : 'bg-green-100 text-green-700 border-green-200'
};

const RISK_DOT = {
  High  : 'bg-red-500',
  Medium: 'bg-yellow-500',
  Low   : 'bg-green-500'
};

function RiskBadge({ level }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1
                      rounded-full text-xs font-semibold border
                      ${RISK_COLORS[level] || RISK_COLORS.Low}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${RISK_DOT[level]}`} />
      {level}
    </span>
  );
}

export default function Dashboard({ onSelectStudent, predictions, onPredictionsUpdate }) {
  const { authAxios } = useAuth();
  const [students,    setStudents]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [running,     setRunning]     = useState(false);
  const [search,      setSearch]      = useState('');
  const [filter,      setFilter]      = useState('All');

  // Load all students
  useEffect(() => {
    const fetch = async () => {
      try {
        const api = authAxios();
        const res = await api.get('/students/');
        setStudents(res.data);

        // Auto-load latest prediction for each student
        if (Object.keys(predictions).length === 0 && res.data.length > 0) {
          const map = {};
          await Promise.all(res.data.map(async s => {
            try {
              const h = await api.get(`/predict/history/${s.id}`);
              if (h.data.length > 0) {
                const latest = h.data[h.data.length - 1];
                const prev   = h.data.length >= 2 ? h.data[h.data.length - 2] : null;
                const trend  = prev
                  ? latest.risk_percent < prev.risk_percent ? 'improving'
                  : latest.risk_percent > prev.risk_percent ? 'worsening'
                  : 'stable'
                  : null;
                map[s.id] = { ...latest, trend, student_id: s.id };
              }
            } catch (e) {}
          }));
          if (Object.keys(map).length > 0) {
            onPredictionsUpdate(map);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [authAxios]);

  // Run batch prediction for all students
  const runBatchPredict = async () => {
  if (students.length === 0) return;
  setRunning(true);
  try {
    const api = authAxios();
    const ids = students.map(s => s.id);
    const res = await api.post('/predict/batch', { student_ids: ids });

    // Fetch history for each student to get trend
    const historyMap = {};
    await Promise.all(ids.map(async id => {
      const h = await api.get(`/predict/history/${id}`);
      historyMap[id] = h.data;
    }));

    // Map results by student_id and add trend
    const map = {};
    res.data.forEach(r => {
      const history = historyMap[r.student_id] || [];
      const prev    = history.length >= 2
        ? history[history.length - 2]
        : null;
      const trend   = prev
        ? r.risk_percent < prev.risk_percent
          ? 'improving'
          : r.risk_percent > prev.risk_percent
          ? 'worsening'
          : 'stable'
        : null;
      map[r.student_id] = { ...r, trend, prevRisk: prev?.risk_percent };
    });
    onPredictionsUpdate(map);
  } catch (e) {
    console.error(e);
  } finally {
    setRunning(false);
  }
};

  // Filter + search
  const filtered = students.filter(s => {
    const pred       = predictions[s.id];
    const riskLevel  = pred?.risk_level || 'Unknown';
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                        s.roll_number.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || riskLevel === filter;
    return matchSearch && matchFilter;
  });

  // Summary counts
  const counts = { High: 0, Medium: 0, Low: 0 };
  Object.values(predictions).forEach(p => {
    if (counts[p.risk_level] !== undefined) counts[p.risk_level]++;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      Loading students...
    </div>
  );

  const exportCSV = () => {
    // Filter only at-risk students
    const atRisk = students.filter(s => {
      const pred = predictions[s.id];
      return pred && pred.predicted_label === 1;
    });

    if (atRisk.length === 0) {
      alert('No at-risk students to export.');
      return;
    }

    // Build CSV rows
    const headers = [
      'Roll No', 'Name', 'Age', 'G1', 'G2',
      'Failures', 'Study Time', 'Risk Level',
      'Risk Probability (%)', 'Trend'
    ];

    const rows = atRisk.map(s => {
      const pred = predictions[s.id];
      return [
        s.roll_number,
        s.name,
        s.age,
        s.G1,
        s.G2,
        s.failures,
        s.studytime,
        pred.risk_level,
        pred.risk_percent,
        pred.trend || 'N/A'
      ];
    });

    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `failsafe_at_risk_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Student Risk Dashboard
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {students.length} students total
          </p>
        </div>
        {/* Export button — only show if predictions exist */}
        {Object.keys(predictions).length > 0 && (
          <button
            onClick={exportCSV}
            className="bg-green-600 hover:bg-green-700 text-white
                      font-semibold px-5 py-2.5 rounded-lg
                      transition-colors text-sm"
          >
            Export At-Risk CSV
          </button>
        )}
        <button
          onClick={runBatchPredict}
          disabled={running || students.length === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold
                     px-5 py-2.5 rounded-lg transition-colors text-sm
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {running ? 'Running predictions...' : 'Run Risk Assessment'}
        </button>
      </div>

      {/* Summary cards */}
      {Object.keys(predictions).length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'High Risk',   count: counts.High,   color: 'border-red-400    bg-red-50    text-red-700'    },
            { label: 'Medium Risk', count: counts.Medium, color: 'border-yellow-400 bg-yellow-50 text-yellow-700' },
            { label: 'Low Risk',    count: counts.Low,    color: 'border-green-400  bg-green-50  text-green-700'  }
          ].map(({ label, count, color }) => (
            <div key={label}
                 className={`border-l-4 rounded-lg p-4 ${color}`}>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-sm font-medium">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search + filter */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name or roll number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2
                     text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {['All', 'High', 'Medium', 'Low'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                        ${filter === f
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Students table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Roll No.', 'Name', 'Age', 'G1', 'G2',
                'Failures', 'Study Time', 'Risk', 'Probability', 'Trend'].map(h => (
                <th key={h}
                    className="px-4 py-3 text-left text-xs font-semibold
                               text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9}
                    className="px-4 py-8 text-center text-gray-400">
                  {students.length === 0
                    ? 'No students found. Add students first.'
                    : 'No students match your search.'}
                </td>
              </tr>
            ) : (
              filtered.map(s => {
                const pred = predictions[s.id];
                return (
                  <tr key={s.id}
                      onClick={() => onSelectStudent(s.id)}
                      className="hover:bg-blue-50 transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-mono text-gray-600">
                      {s.roll_number}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {s.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.age}</td>
                    <td className="px-4 py-3 text-gray-600">{s.G1}</td>
                    <td className="px-4 py-3 text-gray-600">{s.G2}</td>
                    <td className="px-4 py-3 text-gray-600">{s.failures}</td>
                    <td className="px-4 py-3 text-gray-600">{s.studytime}</td>
                    <td className="px-4 py-3">
                      {pred
                        ? <RiskBadge level={pred.risk_level} />
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {pred
                        ? `${pred.risk_percent}%`
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {pred?.trend === 'improving' && (
                        <span className="text-green-600 font-bold text-sm">↓ Improving</span>
                      )}
                      {pred?.trend === 'worsening' && (
                        <span className="text-red-600 font-bold text-sm">↑ Worsening</span>
                      )}
                      {pred?.trend === 'stable' && (
                        <span className="text-yellow-600 font-bold text-sm">→ Stable</span>
                      )}
                      {!pred?.trend && (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}