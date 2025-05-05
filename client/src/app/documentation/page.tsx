'use client';

import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import Link from 'next/link';

export default function Documentation() {
    const [repositories, setRepositories] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchRepositories = async () => {
            try {
                setIsLoading(true);
                const data = await api.getRepositories();

                if (data.status === 'success') {
                    setRepositories(data.repositories);
                } else {
                    setError(data.message || 'Failed to load repositories');
                }
            } catch (error) {
                console.error('Error fetching repositories:', error);
                setError('Failed to load repositories. Please make sure you are connected to GitHub.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchRepositories();
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="bg-white py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl lg:text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Documentation</h2>
                    <p className="mt-6 text-lg leading-8 text-gray-600">
                        View and manage AI-generated documentation for your GitHub repositories.
                    </p>

                    {error && (
                        <div className="mt-6 rounded-md bg-red-50 p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
                </div>

                {repositories.length > 0 ? (
                    <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                        <h3 className="text-lg font-medium leading-8 text-gray-900 mb-6">Your Repositories</h3>
                        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
                            {repositories.map(repo => (
                                <div key={repo.full_name} className="group relative">
                                    <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-lg bg-gray-100 hover:bg-gray-200">
                                        <div className="h-full w-full flex items-center justify-center p-8">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-400">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                                            </svg>
                                        </div>
                                    </div>
                                    <h3 className="mt-4 text-lg font-medium text-gray-900">{repo.name}</h3>
                                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">{repo.description || 'No description'}</p>
                                    <div className="mt-4 flex space-x-3">
                                        <Link
                                            href={`/documentation/view?repo=${repo.full_name}`}
                                            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                                        >
                                            View Documentation
                                        </Link>
                                        <Link
                                            href={`/documentation/generate?repo=${repo.full_name}`}
                                            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                                        >
                                            Generate
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : !error ? (
                    <div className="mx-auto mt-16 max-w-2xl text-center">
                        <p className="text-lg text-gray-600">
                            No repositories found. Please connect your GitHub account using the button in the navigation bar.
                        </p>
                    </div>
                ) : null}
            </div>
        </div>
    );
} 