'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/services/api';

export default function GenerateDocumentation() {
    const [repo, setRepo] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    const searchParams = useSearchParams();
    const repoName = searchParams.get('repo');
    const router = useRouter();

    useEffect(() => {
        // Redirect if no repo specified
        if (!repoName) {
            router.push('/github/connected');
            return;
        }

        // Get repository details
        const fetchRepository = async () => {
            try {
                const data = await api.getRepository(repoName);
                if (data.status === 'success') {
                    setRepo(data.repository);
                } else {
                    setError(data.message || 'Failed to load repository');
                }
            } catch (error) {
                console.error('Error fetching repository:', error);
                setError('Failed to load repository. Please try again later.');
            }
        };

        fetchRepository();
    }, [repoName, router]);

    const handleGenerate = async () => {
        if (!repoName) return;

        setIsGenerating(true);
        setProgress(10);
        setError('');

        try {
            // Simulate progress
            const interval = setInterval(() => {
                setProgress(prev => {
                    const newProgress = prev + (5 * Math.random());
                    return newProgress >= 90 ? 90 : newProgress;
                });
            }, 500);

            // Generate documentation
            const data = await api.generateDocumentation(repoName);

            clearInterval(interval);

            if (data.status === 'success') {
                setProgress(100);
                setIsComplete(true);
                setTimeout(() => {
                    router.push(`/documentation/view?repo=${repoName}`);
                }, 2000);
            } else {
                setError(data.message || 'Failed to generate documentation');
                setIsGenerating(false);
            }
        } catch (error) {
            console.error('Error generating documentation:', error);
            setError('Failed to generate documentation. Please try again later.');
            setIsGenerating(false);
        }
    };

    if (!repo && !error) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="bg-white py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                        Generate Documentation
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

                    {repo && (
                        <div className="mt-6">
                            <div className="rounded-lg bg-gray-50 p-6 shadow-sm">
                                <h3 className="text-lg font-semibold text-gray-900">{repo.full_name}</h3>
                                <p className="mt-2 text-sm text-gray-600">{repo.description || 'No description'}</p>
                                <div className="mt-4 flex items-center">
                                    <span className="text-sm text-gray-500 flex items-center mr-4">
                                        <span className="inline-block w-3 h-3 bg-gray-500 rounded-full mr-1"></span>
                                        {repo.language || 'Unknown'}
                                    </span>
                                    <span className="text-sm text-gray-500 mr-4">
                                        ★ {repo.stars || 0}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        🍴 {repo.forks || 0}
                                    </span>
                                </div>
                            </div>

                            {!isGenerating && !isComplete && (
                                <div className="mt-6">
                                    <p className="mt-2 text-sm text-gray-600">
                                        Click the button below to generate comprehensive documentation for this repository. This process may take a few minutes depending on the size of the repository.
                                    </p>
                                    <button
                                        onClick={handleGenerate}
                                        className="mt-6 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                                    >
                                        Generate Documentation
                                    </button>
                                </div>
                            )}

                            {isGenerating && (
                                <div className="mt-6">
                                    <h4 className="text-sm font-medium text-gray-900">Generating Documentation...</h4>
                                    <div className="mt-2">
                                        <div className="relative">
                                            <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                                                <div
                                                    style={{ width: `${progress}%` }}
                                                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 transition-all duration-500"
                                                ></div>
                                            </div>
                                        </div>
                                        <p className="mt-2 text-xs text-gray-500">
                                            {isComplete ? 'Documentation generated successfully!' : 'Please wait while we analyze your repository...'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 