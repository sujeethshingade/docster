'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ConnectGitHub() {
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const router = useRouter();

    const handleConnect = async () => {
        setIsLoading(true);
        setErrorMessage('');
        setStatusMessage('Connecting to GitHub...');

        try {
            // In a production app, would call your API to initiate OAuth flow
            const response = await fetch('http://localhost:5000/api/github/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to connect to GitHub');
            }

            const data = await response.json();

            if (data.status === 'redirect') {
                setStatusMessage('Redirecting to GitHub authorization page...');
                window.location.href = data.url;
            } else if (data.status === 'error') {
                setErrorMessage(data.message || 'An error occurred during GitHub connection');
            } else if (data.status === 'success') {
                setStatusMessage('Successfully connected to GitHub!');
                router.push('/github/connected');
            }
        } catch (error) {
            console.error('GitHub connection error:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Failed to connect to GitHub. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Connect to GitHub</h2>
                    <p className="mt-6 text-lg leading-8 text-gray-600">
                        To generate documentation for your repositories, Docster needs access to your GitHub account.
                        We only request read access to your repositories.
                    </p>

                    {statusMessage && (
                        <div className="mt-6 rounded-md bg-blue-50 p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-blue-800">{statusMessage}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {errorMessage && (
                        <div className="mt-6 rounded-md bg-red-50 p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                                    <div className="mt-2 text-sm text-red-700">
                                        <p>{errorMessage}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-10 flex items-center justify-center gap-x-6">
                        <button
                            onClick={handleConnect}
                            disabled={isLoading}
                            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                        >
                            {isLoading ? 'Connecting...' : 'Connect to GitHub'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
} 