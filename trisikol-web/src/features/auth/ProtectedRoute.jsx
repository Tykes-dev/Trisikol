import { Navigate } from 'react-router-dom';
import { roleHome, useAuth } from './AuthContext';

export default function ProtectedRoute({ role, children }) {
  const { user, loading, error, retry } = useAuth();
  if (loading) return <p role="status">Checking your session…</p>;
  if (error) return <div role="alert"><p>{error}</p><button onClick={retry}>Retry connection</button></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={roleHome(user.role)} replace />;
  return children;
}
