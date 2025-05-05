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
            // Get token directly from localStorage
            const token = localStorage.getItem('github_token');
            if (!token) {
                setIsAuthenticated(false);
                setUsername(null);
                setLoading(false);
                return false;
            }

            setIsAuthenticated(true);

            // Check if we have a username in localStorage
            const storedUsername = localStorage.getItem('github_username');
            if (storedUsername) {
                setUsername(storedUsername);
                setLoading(false);
                return true;
            }

            // If no username but we have a token, try to fetch it
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
                        setLoading(false);
                        return true;
                    }
                }

                // Even if API call fails, still remain authenticated if we have a token
                setLoading(false);
                return true;
            } catch (err) {
                console.error('Failed to fetch user info:', err);
                // Keep authenticated status regardless of API errors
                setLoading(false);
                return true;
            }
        } catch (err) {
            console.error('Auth check error:', err);
            // Keep user authenticated if we have a token, even if there's an error
            const hasToken = !!localStorage.getItem('github_token');
            setIsAuthenticated(hasToken);
            setLoading(false);
            return hasToken;
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