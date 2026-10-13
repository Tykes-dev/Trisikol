import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function useLogout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  return async () => {
    try { await signOut(); navigate('/login', { replace: true }); }
    catch (error) { window.alert(`Sign out failed: ${error.message}`); }
  };
}
