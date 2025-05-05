'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

function ChatHistoryContent() {
    const [chats, setChats] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        const fetchChatHistory = async () => {
            try {
                setIsLoading(true);

                // Verify authentication before fetching
                if (!isAuthenticated) {
                    router.push('/github/connect');
                    return;
                }

                const data = await api.getUserChats();

                // Handle success response with potentially empty chats
                if (data.status === 'success') {
                    console.log('Chat history received:', data.chats?.length || 0, 'items');
                    setChats(data.chats || []);
                    setError('');
                }
                else {
                    console.error('Failed to load chat history:', data.message);
                    setError(data.message || 'Failed to load chat history');
                    // If authentication is the issue, redirect to GitHub connect
                    if (data.message?.includes('authentication') || data.message?.includes('authenticated')) {
                        router.push('/github/connect');
                    }
                }
            } catch (error) {
                console.error('Error fetching chat history:', error);
                setError('Failed to load chat history. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchChatHistory();
    }, [router, isAuthenticated]);

    // Group chats by repository
    const chatsByRepo = chats.reduce((acc: Record<string, any[]>, chat: any) => {
        if (!acc[chat.repo_name]) {
            acc[chat.repo_name] = [];
        }
        acc[chat.repo_name].push(chat);
        return acc;
    }, {});

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
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Chat History</h2>

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
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Chat History</h2>
                    <p className="mt-6 text-lg leading-8 text-gray-600">
                        View your chat history across all repositories
                    </p>

                    {Object.keys(chatsByRepo).length === 0 ? (
                        <div className="mt-10 text-center p-8 bg-gray-50 rounded-lg">
                            <p className="text-gray-500 text-lg">No chat history found</p>
                            <div className="mt-4">
                                <Link
                                    href="/chat"
                                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                                >
                                    Start a new chat
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-10 space-y-12">
                            {Object.entries(chatsByRepo).map(([repoName, repoChats]) => (
                                <div key={repoName} className="border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-3 flex justify-between items-center">
                                        <h3 className="text-lg font-medium text-gray-900">{repoName}</h3>
                                        <Link
                                            href={`/chat?repo=${repoName}`}
                                            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                                        >
                                            New chat
                                        </Link>
                                    </div>
                                    <div className="divide-y divide-gray-200">
                                        {repoChats.map((chat) => (
                                            <div key={chat.id} className="p-4 hover:bg-gray-50">
                                                <h4 className="text-md font-semibold text-gray-900 mb-2">{chat.question}</h4>
                                                <p className="text-sm text-gray-600 line-clamp-3 mb-2">{chat.answer}</p>
                                                <div className="flex justify-between items-center">
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(chat.created_at).toLocaleString()}
                                                    </p>
                                                    <Link
                                                        href={`/chat?repo=${repoName}`}
                                                        className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                                                    >
                                                        Continue chat →
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ChatHistory() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        }>
            <ChatHistoryContent />
        </Suspense>
    );
} 