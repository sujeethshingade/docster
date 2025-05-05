'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, updateAuthState, notifyAuthChange } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

function GitHubConnectedContent() {
    const [repositories, setRepositories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const searchParams = useSearchParams();
    const token = searchParams?.get('token');
    const username = searchParams?.get('username');
    const router = useRouter();
    const { checkAuthStatus } = useAuth();

    useEffect(() => {
        if (!token) {
            router.push('/github/connect');
            return;
        }

        try {
            // Save token to localStorage with error handling
            localStorage.removeItem('github_token'); 
            localStorage.setItem('github_token', token);
            console.log('GitHub token saved successfully');

            // Set authentication state
            localStorage.setItem('user_authenticated', 'true');

            // Save username if available
            if (username) {
                localStorage.removeItem('github_username'); // Clear first
                localStorage.setItem('github_username', username);
                console.log('GitHub username saved successfully');
            }

            // Update global auth state
            updateAuthState(true);

            // Force refresh auth context
            checkAuthStatus().then(isAuth => {
                console.log('Auth status checked:', isAuth);

                // Dispatch global event for all components to refresh auth
                window.dispatchEvent(new Event('auth-change'));

                // Also trigger storage event for components listening to storage changes
                window.dispatchEvent(new StorageEvent('storage', {
                    key: 'github_token',
                    newValue: token
                }));
            });

            const fetchRepositories = async () => {
                try {
                    const data = await api.getRepositories();

                    if (data.status === 'success') {
                        setRepositories(data.repositories);
                    } else {
                        setError(data.message || 'Failed to load repositories');
                    }
                } catch (error) {
                    console.error('Error fetching repositories:', error);
                    setError('Failed to load repositories. Please try again later.');
                } finally {
                    setIsLoading(false);
                }
            };

            fetchRepositories();

            // Redirect to documentation after a short delay
            const redirectTimeout = setTimeout(() => {
                router.push('/documentation');
            }, 3000);

            return () => {
                clearTimeout(redirectTimeout);
            };
        } catch (error) {
            console.error('Error setting authentication:', error);
            setError('Failed to authenticate. Please try again.');
            setIsLoading(false);
        }
    }, [token, username, router, checkAuthStatus]);

    return (
        <div className="bg-white py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl lg:text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                        {isLoading ? 'Connecting to GitHub...' : 'Connected to GitHub'}
                    </h2>

                    {error && (
                        <div className="mt-6 rounded-md bg-red-50 p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <div className="text-sm text-red-500">
                                        <p>{error}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!isLoading && !error && (
                        <>
                            <p className="mt-6 text-lg leading-8 text-gray-600">
                                Your GitHub account has been successfully connected. You can now generate documentation for your repositories.
                            </p>
                            <p className="mt-2 text-sm text-gray-500">
                                You will be redirected to the documentation page in a few seconds...
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function GitHubConnected() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        }>
            <GitHubConnectedContent />
        </Suspense>
    );
} 