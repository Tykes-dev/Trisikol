import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import PassengerHome from './pages/PassengerHome';
import DriverTerminal from './pages/DriverTerminal';
import AdminDashboard from './pages/AdminDashboard'; // 1. Imported the new Admin page
import './styles/global.css';
import AuthProvider from './features/auth/AuthProvider';
import ProtectedRoute from './features/auth/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <Routes>
        {/* Default route goes to Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* The actual screens */}
        <Route path="/login" element={<Login />} />
        <Route path="/passenger" element={<ProtectedRoute role="PASSENGER"><PassengerHome /></ProtectedRoute>} />
        <Route path="/driver" element={<ProtectedRoute role="DRIVER"><DriverTerminal /></ProtectedRoute>} />

        {/* 2. Added the Admin route */}
        <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
