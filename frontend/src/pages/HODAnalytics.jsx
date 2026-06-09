// src/pages/HODAnalytics.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const FEATURE_LABELS = {
  G1        : 'Period 1 Grade',
  G2        : 'Period 2 Grade',
  failures  : 'Past Failures',
  studytime : 'Weekly Study Time',
  absences  : 'Absences',
  goout     : 'Goes Out with Friends',
  Dalc      : 'Workday Alcohol Use',
  Walc      : 'Weekend Alcohol Use',
  Medu      : "Mother's Education",
  Fedu      : "Father's Education",
  Mjob      : "Mother's Job",
  Fjob      : "Father's Job",
  age       : 'Age',
  sex       : 'Sex',
  school    : 'School',
  address   : 'Home Address',
  higher    : 'Wants Higher Education',
  internet  : 'Internet at Home',
  romantic  : 'In a Relationship',
  schoolsup : 'School Support',
  famsup    : 'Family Support',
  activities: 'Extracurricular Activities',
  nursery   : 'Attended Nursery',
  guardian  : 'Guardian',
  famsize   : 'Family Size',
  Pstatus   : 'Parent Status',
  reason    : 'Reason for School',
  paid      : 'Extra Paid Classes'
};

const COLORS = [
  '#e74c3c','#e67e22','#f39c12','#2ecc71','#1abc9c',
  '#3498db','#9b59b6','#34495e','#e74c3c','#e67e22'
];

export default function HODAnalytics({ onBack }) {
  const { authAxios, isHOD } = useAuth();
  const [cohort,   setCohort]   = useState(null);
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const api = authAxios();
        const [cRes, sRes] = await Promise.all([
          api.get('/explain/cohort'),
          api.get('/students/')
        ]);
        setCohort(cRes.data);
        setStudents(sRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authAxios]);

  if (!isHOD) return (
    <div className="p-6 text-red-500 text-center">
      Access restricted to HOD only.
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      Loading analytics...
    </div>
  );

  // Top 10 features for chart
  const chartData = cohort?.feature_importance
    ?.slice(0, 10)
    .map(f => ({
      feature   : f.feature,
      label     : FEATURE_LABELS[f.feature] || f.feature,
      importance: f.importance
    })) || [];

  // Risk distribution from students
  const riskCounts = { High: 0, Medium: 0, Low: 0, Unknown: 0 };

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Header */}
      <button
        onClick={onBack}
        className="mb-4 text-sm text-blue-600 hover:underline
                   flex items-center gap-1"
      >
        ← Back to Dashboard
      </button>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">
        HOD Analytics
      </h2>
      <p className="text-gray-400 text-sm mb-6">
        Cohort-level risk analysis — {cohort?.total_students} students
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Students', value: students.length,
            color: 'border-blue-400 bg-blue-50 text-blue-700' },
          { label: 'Features Analyzed', value: cohort?.feature_importance?.length || 0,
            color: 'border-purple-400 bg-purple-50 text-purple-700' },
          { label: 'Top Risk Factor',
            value: FEATURE_LABELS[cohort?.feature_importance?.[0]?.feature] || '—',
            color: 'border-red-400 bg-red-50 text-red-700' }
        ].map(({ label, value, color }) => (
          <div key={label} className={`border-l-4 rounded-lg p-4 ${color}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Feature importance chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="font-bold text-gray-800 mb-1">
          Top 10 Risk Factors — Cohort Level
        </h3>
        <p className="text-xs text-gray-400 mb-5">
          Mean absolute SHAP value across all students —
          higher = stronger influence on risk prediction
        </p>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 10, right: 40, top: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={v => v.toFixed(2)}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 11 }}
              width={160}
            />
            <Tooltip
              formatter={(val) => [val.toFixed(4), 'SHAP Importance']}
              labelFormatter={label => label}
            />
            <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Full feature importance table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 mb-4">
          All Features — Importance Ranking
        </h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
          {cohort?.feature_importance?.map((f, i) => (
            <div key={f.feature}
                 className="flex items-center justify-between
                            text-sm py-1.5 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                <span className="text-gray-700 font-medium">
                  {FEATURE_LABELS[f.feature] || f.feature}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Inline bar */}
                <div className="w-20 bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full"
                    style={{
                      width: `${(f.importance /
                        cohort.feature_importance[0].importance) * 100}%`
                    }}
                  />
                </div>
                <span className="text-gray-400 text-xs w-12 text-right">
                  {f.importance.toFixed(4)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}