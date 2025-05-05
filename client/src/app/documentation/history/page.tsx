'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

function DocumentationHistoryContent() {
    const [documents, setDocuments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        const fetchDocumentationHistory = async () => {
            try {
                setIsLoading(true);

                if (!isAuthenticated) {
                    router.push('/github/connect');
                    return;
                }

                const data = await api.getUserDocumentations();

                // Handle success response with potentially empty documents
                if (data.status === 'success') {
                    console.log('Documentation history received:', data.documents?.length || 0, 'items');
                    setDocuments(data.documents || []);
                    setError('');
                }
                else {
                    console.error('Failed to load documentation history:', data.message);
                    setError(data.message || 'Failed to load documentation history');
                    // If authentication is the issue, redirect to GitHub connect
                    if (data.message?.includes('authentication') || data.message?.includes('authenticated')) {
                        router.push('/github/connect');
                    }
                }
            } catch (error) {
                console.error('Error fetching documentation history:', error);
                setError('Failed to load documentation history. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDocumentationHistory();
    }, [router, isAuthenticated]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl">
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Documentation History</h2>

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
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-4xl">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Documentation History</h2>
                    <p className="mt-6 text-lg leading-8 text-gray-600">
                        View your documentation generation history across all repositories
                    </p>

                    {documents.length === 0 ? (
                        <div className="mt-10 text-center p-8 bg-gray-50 rounded-lg">
                            <p className="text-gray-500 text-lg">No documentation history found</p>
                            <div className="mt-4">
                                <Link
                                    href="/documentation"
                                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                                >
                                    Generate documentation
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-10">
                            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                                <table className="min-w-full divide-y divide-gray-300">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Repository</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Generated At</th>
                                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                                <span className="sr-only">View</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {documents.map((doc) => (
                                            <tr key={doc.id}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{doc.repo_name}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{new Date(doc.created_at).toLocaleString()}</td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    <Link
                                                        href={`/documentation/view?repo=${doc.repo_name}`}
                                                        className="text-indigo-600 hover:text-indigo-900"
                                                    >
                                                        View<span className="sr-only">, {doc.repo_name}</span>
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function DocumentationHistory() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        }>
            <DocumentationHistoryContent />
        </Suspense>
    );
} 