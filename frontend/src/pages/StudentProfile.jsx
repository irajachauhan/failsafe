// src/pages/StudentProfile.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
  LineChart, Line
} from 'recharts';

const RISK_COLORS = {
  High  : 'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low   : 'bg-green-100 text-green-700 border-green-200'
};

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

// ── SHAP Waterfall Chart ──────────────────────────────────────────
function ShapWaterfall({ topRisk, topProtectors }) {
  const data = [
    ...topRisk.map(f => ({
      feature: f.feature,
      value  : f.shap_value,
      orig   : f.feature_value,
      type   : 'risk'
    })),
    ...topProtectors.map(f => ({
      feature: f.feature,
      value  : f.shap_value,
      orig   : f.feature_value,
      type   : 'protective'
    }))
  ].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg
                      shadow-lg p-3 text-xs">
        <p className="font-bold text-gray-800">{d.feature}</p>
        <p className="text-gray-500">Value: {d.orig}</p>
        <p className={d.type === 'risk' ? 'text-red-600' : 'text-green-600'}>
          SHAP: {d.value > 0 ? '+' : ''}{d.value.toFixed(3)}
        </p>
        <p className="text-gray-400 mt-1">
          {d.type === 'risk' ? '⚠ Increases risk' : '✓ Reduces risk'}
        </p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 10, right: 40, top: 10, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={v => v.toFixed(2)}
               tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="feature"
               tick={{ fontSize: 11 }} width={75} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.type === 'risk' ? '#e74c3c' : '#2ecc71'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function FeatureLegend({ features }) {
  const labels = {
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

  // Only show legend for features actually in the chart
  const relevant = features.filter(f => labels[f]);

  if (relevant.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
        Variable Guide
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {relevant.map(f => (
          <div key={f} className="flex items-center gap-1.5 text-xs">
            <span className="font-mono font-bold text-gray-500 w-16 shrink-0">
              {f}
            </span>
            <span className="text-gray-400">→ {labels[f]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Risk Trend Chart ──────────────────────────────────────────────
function RiskTrendChart({ history }) {
  if (!history || history.length < 2) return (
    <div className="flex items-center justify-center h-32
                    text-gray-300 text-sm">
      Need at least 2 assessments to show trend
    </div>
  );

  const data = history.map((h, i) => ({
    assessment: `#${i + 1}`,
    risk      : h.risk_percent,
    date      : new Date(h.created_at).toLocaleDateString(),
    level     : h.risk_level
  }));

  // Determine trend direction
  const first = data[0].risk;
  const last  = data[data.length - 1].risk;
  const trend = last < first ? 'improving' : last > first ? 'worsening' : 'stable';
  const trendColors = {
    improving: 'text-green-600',
    worsening: 'text-red-600',
    stable   : 'text-yellow-600'
  };
  const trendIcons = {
    improving: '↓ Improving',
    worsening: '↑ Worsening',
    stable   : '→ Stable'
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg
                      shadow-lg p-3 text-xs">
        <p className="font-bold text-gray-700">Assessment {d.assessment}</p>
        <p className="text-gray-500">{d.date}</p>
        <p className="font-semibold mt-1">Risk: {d.risk}%</p>
        <p className={
          d.level === 'High'   ? 'text-red-500'    :
          d.level === 'Medium' ? 'text-yellow-500' : 'text-green-500'
        }>{d.level} Risk</p>
      </div>
    );
  };

  return (
    <div>
      {/* Trend indicator */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-400">
          {data.length} assessments recorded
        </p>
        <span className={`text-xs font-bold ${trendColors[trend]}`}>
          {trendIcons[trend]}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <LineChart
          data={data}
          margin={{ left: 0, right: 20, top: 5, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="assessment" tick={{ fontSize: 11 }} />
          <YAxis
            domain={[0, 100]}
            tickFormatter={v => `${v}%`}
            tick={{ fontSize: 11 }}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          {/* Risk threshold line */}
          <Line
            type="monotone"
            dataKey="risk"
            stroke="#3498db"
            strokeWidth={2.5}
            dot={{ fill: '#3498db', r: 5 }}
            activeDot={{ r: 7 }}
          />
          {/* 65% high risk threshold */}
          <line
            x1="0%" y1="35%" x2="100%" y2="35%"
            stroke="#e74c3c" strokeDasharray="4 4"
            strokeWidth={1}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-blue-500"/>
          <span>Risk %</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-red-400" style={{borderTop: '1px dashed'}}/>
          <span>High risk threshold (65%)</span>
        </div>
      </div>
    </div>
  );
}

// ── Intervention Generator ────────────────────────────────────────
function Interventions({ riskLevel, topRisk, studentId, authAxios }) {
  const topFeature = topRisk?.[0]?.feature || '';
  const [checked,  setChecked]  = useState({});
  const [saved,    setSaved]    = useState(false);
  const [appliedBy, setAppliedBy] = useState(null);
  const [appliedAt, setAppliedAt] = useState(null);
  const [saving,   setSaving]   = useState(false);

  const base = {
    High  : [
      'Immediate counselling referral',
      'Assign extra academic support classes',
      'Notify parents / guardian',
      'Weekly faculty check-in meetings'
    ],
    Medium: [
      'Schedule one-on-one session with faculty',
      'Provide personalised study plan',
      'Monitor attendance closely',
      'Re-assess risk after next period'
    ],
    Low: [
      'Continue regular monitoring',
      'Encourage participation in study groups',
      'Re-assess at end of semester'
    ]
  };

  const shapDriven = {
    G2       : 'Focused academic support on course content',
    G1       : 'Early grade recovery plan needed',
    failures : 'Past failure pattern — early intervention critical',
    goout    : 'Behavioural counselling recommended',
    Walc     : 'Student welfare check recommended',
    Dalc     : 'Student welfare check recommended',
    absences : 'Strict attendance improvement plan needed',
    studytime: 'Study habits coaching — less than 2hrs/week detected',
    internet : 'Provide access to digital learning resources',
    higher   : 'Motivational counselling — student lacks higher ed aspiration'
  };

  const specific = shapDriven[topFeature];
  const actions  = base[riskLevel] || base.Low;
  const allActions = specific ? [specific, ...actions] : actions;

  const colors = {
    High  : 'bg-red-50 border-red-200',
    Medium: 'bg-yellow-50 border-yellow-200',
    Low   : 'bg-green-50 border-green-200'
  };

  // Load previously saved interventions
  useEffect(() => {
    const load = async () => {
      try {
        const api = authAxios();
        const res = await api.get(`/students/${studentId}/interventions`);
        if (res.data.interventions_applied?.length > 0) {
          const map = {};
          res.data.interventions_applied.forEach(a => { map[a] = true; });
          setChecked(map);
          setAppliedBy(res.data.applied_by);
          setAppliedAt(res.data.applied_at);
          setSaved(true);
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [studentId, authAxios]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const api          = authAxios();
      const applied      = Object.keys(checked).filter(k => checked[k]);
      await api.post(`/students/${studentId}/interventions`, {
        interventions: applied
      });
      setSaved(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const appliedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className={`rounded-xl border p-5 ${colors[riskLevel]}`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <span>💡</span> Recommended Interventions
        </h3>
        {saved && appliedBy && (
          <span className="text-xs text-green-600 font-medium">
            ✓ Saved by {appliedBy}
          </span>
        )}
      </div>

      {specific && (
        <div className="bg-white rounded-lg p-3 mb-3 border border-gray-200">
          <p className="text-xs font-semibold text-blue-600 mb-0.5">
            SHAP-driven insight — primary risk factor:{' '}
            {FEATURE_LABELS[topFeature] || topFeature}
          </p>
          <p className="text-sm text-gray-700">{specific}</p>
        </div>
      )}

      <ul className="space-y-2 mb-4">
        {allActions.map((action, i) => (
          <li key={i}
              className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={!!checked[action]}
              onChange={e => {
                setChecked(prev => ({
                  ...prev,
                  [action]: e.target.checked
                }));
                setSaved(false);
              }}
              className="mt-0.5 cursor-pointer accent-blue-600"
            />
            <span className={checked[action] ? 'line-through text-gray-400' : ''}>
              {action}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between">
  <span className="text-xs text-gray-400">
    {appliedCount} of {allActions.length} applied
  </span>
  <div className="flex gap-2">
    {appliedCount > 0 && (
      <button
              onClick={async () => {
                setChecked({});
                setSaved(false);
                try {
                  const api = authAxios();
                  await api.post(`/students/${studentId}/interventions`, {
                    interventions: []
                  });
                  setSaved(true);
                  setAppliedBy(null);
                  setAppliedAt(null);
                } catch (e) {
                  console.error(e);
                }
              }}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600
                        font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              Clear All
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || appliedCount === 0}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white
                      font-semibold px-3 py-1.5 rounded-lg transition-colors
                      disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Interventions'}
          </button>
        </div>
      </div>

      {saved && appliedAt && (
        <p className="text-xs text-gray-400 mt-2">
          Last updated: {new Date(appliedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

// ── Main Profile Page ─────────────────────────────────────────────
export default function StudentProfile({ studentId, onBack, onEdit }) {
  const { authAxios }  = useAuth();
  const [student,  setStudent]  = useState(null);
  const [explain,  setExplain]  = useState(null);
  const [history,  setHistory]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const api = authAxios();
        const [sRes, eRes, hRes] = await Promise.all([
          api.get(`/students/${studentId}`),
          api.get(`/explain/student/${studentId}`),
          api.get(`/predict/history/${studentId}`)
        ]);
        setStudent(sRes.data);
        setExplain(eRes.data);
        setHistory(hRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [studentId, authAxios]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      Loading student profile...
    </div>
  );

  if (!student || !explain) return (
    <div className="p-6 text-red-500">Failed to load student data.</div>
  );

  const riskLevel = explain.risk_level;

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Back button */}
      <button
        onClick={onBack}
        className="mb-4 text-sm text-blue-600 hover:underline
                   flex items-center gap-1"
      >
        ← Back to Dashboard
      </button>

      {/* Student header */}
      <div className="bg-white rounded-xl shadow-sm border
                      border-gray-200 p-6 mb-5">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {student.name}
            </h2>
             <button
                onClick={onEdit}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600
                        px-3 py-1.5 rounded-lg transition-colors font-medium"
              >
                ✏️ Edit
              </button>
            <p className="text-gray-400 text-sm mt-0.5">
              Roll No: {student.roll_number} · Age: {student.age} ·
              School: {student.school}
            </p>
          </div>

          {/* Risk badge */}
          <div className={`rounded-xl px-5 py-3 text-center border
                           ${RISK_COLORS[riskLevel]}`}>
            <p className="text-3xl font-extrabold">
              {explain.risk_percent}%
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide mt-0.5">
              {riskLevel} Risk
            </p>
          </div>
        </div>

        {/* Grade summary */}
        <div className="grid grid-cols-4 gap-4 mt-5">
          {[
            { label: 'G1 (Period 1)', value: student.G1 },
            { label: 'G2 (Period 2)', value: student.G2 },
            { label: 'Failures',      value: student.failures },
            { label: 'Absences',      value: student.absences }
          ].map(({ label, value }) => (
            <div key={label}
                 className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-gray-800">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SHAP + Interventions */}
      <div className="grid grid-cols-2 gap-5 mb-5">
      {/* SHAP waterfall */}
        <div className="bg-white rounded-xl shadow-sm border
                border-gray-200 p-5">
                <h3 className="font-bold text-gray-800 mb-1">
                    Why is this student at risk?
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                    Red bars increase risk · Green bars reduce risk
                </p>
                <ShapWaterfall
                    topRisk={explain.top_risk_factors}
                    topProtectors={explain.top_protectors}
                />
                <FeatureLegend
                    features={[
                    ...explain.top_risk_factors.map(f => f.feature),
                    ...explain.top_protectors.map(f => f.feature)
                    ]}
                />
        </div>

        {/* Interventions */}
        <div className="flex flex-col gap-4">
          <Interventions
            riskLevel={riskLevel}
            topRisk={explain.top_risk_factors}
            studentId={studentId}
            authAxios={authAxios}
          />

          {/* Key risk factors list */}
          <div className="bg-white rounded-xl shadow-sm border
                          border-gray-200 p-5">
            <h3 className="font-bold text-gray-800 mb-3">
              Top Risk Factors
            </h3>
            <div className="space-y-2">
              {explain.top_risk_factors.map((f, i) => (
                <div key={i}
                     className="flex justify-between items-center
                                text-sm py-1.5 border-b border-gray-50">
                  <span className="text-gray-700 font-medium">
                    {f.feature}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-xs">
                      value: {f.feature_value}
                    </span>
                    <span className="text-red-600 font-semibold">
                      +{f.shap_value.toFixed(3)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Prediction history */}
      {/* Risk Trend + History */}
      {history.length > 0 && (
        <div className="grid grid-cols-2 gap-5">

          {/* Trend chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-bold text-gray-800 mb-4">
              Risk Trend Over Time
            </h3>
            <RiskTrendChart history={history} />
          </div>

          {/* History list */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-bold text-gray-800 mb-3">Assessment History</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history.map((h, i) => {
                const prev     = history[i - 1];
                const changed  = prev
                  ? h.risk_percent < prev.risk_percent
                    ? '↓'
                    : h.risk_percent > prev.risk_percent
                    ? '↑'
                    : '→'
                  : null;
                const changeColor =
                  changed === '↓' ? 'text-green-500' :
                  changed === '↑' ? 'text-red-500'   : 'text-gray-400';

                return (
                  <div key={i}
                       className="flex justify-between items-center
                                  text-sm py-2 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300 text-xs w-5">
                        #{i + 1}
                      </span>
                      <span className="text-gray-400 text-xs">
                        {new Date(h.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {changed && (
                        <span className={`font-bold ${changeColor}`}>
                          {changed}
                        </span>
                      )}
                      <span className={`font-semibold text-xs
                        ${h.risk_level === 'High'   ? 'text-red-500'    :
                          h.risk_level === 'Medium' ? 'text-yellow-500' :
                                                      'text-green-500'}`}>
                        {h.risk_percent}% — {h.risk_level}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}