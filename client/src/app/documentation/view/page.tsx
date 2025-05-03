'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/services/api';
import Link from 'next/link';

function DocumentationContent() {
    const [documentation, setDocumentation] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeFile, setActiveFile] = useState<string | null>(null);

    const searchParams = useSearchParams();
    const repoName = searchParams?.get('repo');
    const router = useRouter();

    useEffect(() => {
        if (!repoName) {
            router.push('/documentation');
            return;
        }

        const fetchDocumentation = async () => {
            try {
                const data = await api.getDocumentation(repoName);

                if (data.status === 'success') {
                    setDocumentation(data.documentation);
                    if (data.documentation.files && data.documentation.files.length > 0) {
                        setActiveFile(data.documentation.files[0].file_path);
                    }
                } else {
                    setError(data.message || 'Failed to load documentation');
                }
            } catch (error) {
                console.error('Error fetching documentation:', error);
                setError('Failed to load documentation. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDocumentation();
    }, [repoName, router]);

    const handleExport = async (format: 'pdf' | 'docx') => {
        if (!repoName) return;

        try {
            await api.exportDocumentation(repoName, format);
        } catch (error) {
            console.error(`Error exporting to ${format}:`, error);
            setError(`Failed to export to ${format}. Please try again later.`);
        }
    };

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
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Documentation</h2>

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

                        <div className="mt-6">
                            <Link
                                href={`/documentation/generate?repo=${repoName}`}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                            >
                                Generate Documentation
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!documentation) {
        return (
            <div className="bg-white py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl">
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Documentation</h2>

                        <p className="mt-6 text-lg text-gray-600">No documentation found for this repository.</p>

                        <div className="mt-6">
                            <Link
                                href={`/documentation/generate?repo=${repoName}`}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                            >
                                Generate Documentation
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const activeFileDoc = documentation.files.find((file: any) => file.file_path === activeFile);

    return (
        <div className="bg-white">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row">
                    {/* Sidebar */}
                    <div className="lg:w-1/4 pr-8">
                        <div className="sticky top-8">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-900">{documentation.repository.name}</h2>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleExport('pdf')}
                                        className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        PDF
                                    </button>
                                    <button
                                        onClick={() => handleExport('docx')}
                                        className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        Word
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 text-sm text-gray-500">
                                {documentation.repository.description}
                            </div>

                            <div className="mt-6">
                                <h3 className="text-sm font-medium text-gray-900">Repository Summary</h3>
                                <div className="mt-2 text-sm text-gray-600 whitespace-pre-line">
                                    {documentation.repository.summary}
                                </div>
                            </div>

                            <div className="mt-6">
                                <h3 className="text-sm font-medium text-gray-900">Files</h3>
                                <ul className="mt-2 border border-gray-200 rounded-md divide-y divide-gray-200 max-h-96 overflow-y-auto">
                                    {documentation.files.map((file: any) => (
                                        <li key={file.file_path}>
                                            <button
                                                onClick={() => setActiveFile(file.file_path)}
                                                className={`w-full text-left px-4 py-2 text-sm ${activeFile === file.file_path
                                                    ? 'bg-indigo-50 text-indigo-600'
                                                    : 'text-gray-700 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {file.file_path}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="mt-6">
                                <Link
                                    href={`/chat?repo=${repoName}`}
                                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                                >
                                    Ask Questions About This Repo
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="lg:w-3/4 mt-8 lg:mt-0">
                        {activeFileDoc ? (
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{activeFileDoc.file_path}</h2>
                                <div className="mt-4 prose prose-indigo prose-lg text-gray-500 mx-auto whitespace-pre-line">
                                    {activeFileDoc.documentation}
                                </div>
                                <p className="mt-6 text-sm text-gray-500">
                                    Generated: {new Date(activeFileDoc.generated_at).toLocaleString()}
                                </p>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-lg text-gray-500">Select a file to view its documentation</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ViewDocumentation() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        }>
            <DocumentationContent />
        </Suspense>
    );
} 