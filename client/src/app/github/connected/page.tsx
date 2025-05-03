'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function GitHubConnected() {
    const [repositories, setRepositories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const router = useRouter();

    useEffect(() => {
        if (!token) {
            router.push('/github/connect');
            return;
        }

        // Store token in localStorage for future API calls
        localStorage.setItem('github_token', token);

        const fetchRepositories = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/github/repositories', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                const data = await response.json();

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
    }, [token, router]);

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
                                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                                    <div className="mt-2 text-sm text-red-700">
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

                            <div className="mt-10">
                                <h3 className="text-xl font-semibold text-gray-900">Your Repositories</h3>
                                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                    {repositories.map((repo: any) => (
                                        <div key={repo.full_name} className="rounded-lg bg-white shadow">
                                            <div className="p-6">
                                                <h4 className="text-lg font-semibold text-gray-900">{repo.name}</h4>
                                                <p className="mt-2 text-sm text-gray-600 line-clamp-2">{repo.description || 'No description'}</p>
                                                <div className="mt-4 flex">
                                                    <Link
                                                        href={`/documentation/generate?repo=${repo.full_name}`}
                                                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                                                    >
                                                        Generate Documentation <span aria-hidden="true">→</span>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
} 