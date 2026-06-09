import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StudentProfile from './pages/StudentProfile';
import AddStudent from './pages/AddStudent';
import HODAnalytics from './pages/HODAnalytics';
import BulkUpload from './pages/BulkUpload';

function AppRoutes() {
  const { isAuthenticated, user, logout, isHOD, authAxios  } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editStudentData, setEditStudentData] = useState(null);
  const [dashPredictions, setDashPredictions] = useState({});

  if (!isAuthenticated) {
    return <Login />;
  }

  const goTo = (p, data = null) => {
    setPage(p);
    if (data !== null) setSelectedStudent(data);
  };

  const goToEdit = async (studentId, shapFeats = []) => {
  try {
    const api = authAxios();
    const res = await api.get(`/students/${studentId}`);
    setEditStudentData(res.data);
    setSelectedStudent(studentId);
    setPage('edit-student');
  } catch (e) {
    console.error('edit error:', e);
  }
};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <div className="bg-blue-700 text-white px-6 py-4 flex justify-between items-center">
        <h1 className="font-bold text-lg">
          FAIL<span className="text-red-300">SAFE</span>
        </h1>
        <div className="flex items-center gap-4">
          {/* Add Student button in navbar */}
          <button
            onClick={() => goTo('add-student')}
            className="text-xs bg-green-500 hover:bg-green-600
                       px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            + Add Student
          </button> 
                    <button
            onClick={() => goTo('bulk-upload')}
            className="text-xs bg-yellow-500 hover:bg-yellow-600
                      px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            Bulk Upload
          </button>
          {isHOD && (
            <button
              onClick={() => goTo('hod-analytics')}
              className="text-xs bg-purple-500 hover:bg-purple-600
                         px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              HOD Analytics
            </button>
          )}
          <span className="text-sm">
            {user.full_name} — {user.role}
          </span>
          <button
            onClick={() => {
              setPage('dashboard');
              setSelectedStudent(null);
              setEditStudentData(null);
              setDashPredictions({});
              logout();
            }}
            className="text-xs bg-blue-800 hover:bg-blue-900
                      px-3 py-1.5 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Page routing */}
      {page === 'dashboard' && (
        <Dashboard
         onSelectStudent={id => goTo('profile', id)}
         predictions={dashPredictions}
         onPredictionsUpdate={setDashPredictions}
         />
      )}
      {page === 'profile' && (
        <StudentProfile
          studentId={selectedStudent}
          onBack={() => goTo('dashboard')}
          onEdit={() => goToEdit(selectedStudent)}
        />
      )}
      {page === 'edit-student' && (
        <AddStudent
          onBack={() => goTo('profile', selectedStudent)}
          onSuccess={() => goTo('profile', selectedStudent)}
          editStudent={editStudentData}
        />
      )}
      {page === 'add-student' && (
        <AddStudent
          onBack={() => goTo('dashboard')}
          onSuccess={() => goTo('dashboard')}
        />
      )}
      {page === 'bulk-upload' && (
        <BulkUpload
          onBack={() => goTo('dashboard')}
          onSuccess={() => goTo('dashboard')}
        />
      )}
      {page === 'hod-analytics' && (
        <HODAnalytics onBack={() => goTo('dashboard')} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}