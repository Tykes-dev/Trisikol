import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);
export const roleHome = (role) => ({ PASSENGER: '/passenger', DRIVER: '/driver', ADMIN: '/admin' }[role] || '/login');
export function useAuth() { return useContext(AuthContext); }
