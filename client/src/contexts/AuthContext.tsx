'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '@/services/config';

interface AuthContextType {
    isAuthenticated: boolean;
    username: string | null;
    loading: boolean;
    checkAuthStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    username: null,
    loading: true,
    checkAuthStatus: async () => false
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [username, setUsername] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const checkAuthStatus = async (): Promise<boolean> => {
        try {
            const token = localStorage.getItem('github_token');
            if (!token) {
                setIsAuthenticated(false);
                setUsername(null);
                setLoading(false);
                return false;
            }

            // Check if we have a username in localStorage
            const storedUsername = localStorage.getItem('github_username');
            if (storedUsername) {
                setUsername(storedUsername);
                setIsAuthenticated(true);
                setLoading(false);
                return true;
            }

            // If no username, try to fetch it from API
            try {
                const response = await fetch(`${API_URL}/github/user`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'success' && data.user) {
                        const username = data.user.login;
                        setUsername(username);
                        localStorage.setItem('github_username', username);
                        setIsAuthenticated(true);
                        setLoading(false);
                        return true;
                    }
                }
            } catch (err) {
                console.error('Failed to fetch user info:', err);
            }

            // Default fallback if we couldn't get username but have token
            setIsAuthenticated(!!token);
            setLoading(false);
            return !!token;
        } catch (err) {
            console.error('Auth check error:', err);
            setIsAuthenticated(false);
            setLoading(false);
            return false;
        }
    };

    useEffect(() => {
        checkAuthStatus();

        // Setup listener for auth changes from other components
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'github_token' || e.key === 'github_username' || e.key === 'user_authenticated') {
                checkAuthStatus();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('auth-change', checkAuthStatus as EventListener);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('auth-change', checkAuthStatus as EventListener);
        };
    }, []);

    return (
        <AuthContext.Provider value={{ isAuthenticated, username, loading, checkAuthStatus }}>
            {children}
        </AuthContext.Provider>
    );
}; 