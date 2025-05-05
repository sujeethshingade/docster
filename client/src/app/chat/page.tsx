'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/services/api';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

function ChatContent() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [repositories, setRepositories] = useState<any[]>([]);
    const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();
    const repoParam = searchParams?.get('repo');
    const [chatHistory, setChatHistory] = useState<any[]>([]);

    // Fetch repositories on mount
    useEffect(() => {
        const fetchRepositories = async () => {
            try {
                setLoading(true);
                const data = await api.getRepositories();

                if (data.status === 'success') {
                    setRepositories(data.repositories);

                    if (repoParam) {
                        setSelectedRepo(repoParam);

                        setMessages([
                            {
                                id: Date.now().toString(),
                                role: 'assistant',
                                content: `Hello! I'm your documentation assistant for ${repoParam}. Ask me anything about this repository's code and documentation.`,
                                timestamp: new Date().toISOString(),
                            },
                        ]);
                    }
                } else {
                    setError(data.message || 'Failed to load repositories');
                }
            } catch (error) {
                console.error('Error fetching repositories:', error);
                setError('Failed to load repositories. Please make sure you are connected to GitHub.');
            } finally {
                setLoading(false);
            }
        };

        fetchRepositories();
    }, [repoParam]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        // Load chat history for this repository
        const loadChatHistory = async () => {
            if (selectedRepo) {
                try {
                    const data = await api.getChatsByRepository(selectedRepo);
                    if (data.status === 'success' && data.chats) {
                        console.log('Loaded chat history:', data.chats);
                        setChatHistory(data.chats);

                        // Initialize messages from history if available
                        if (data.chats.length > 0) {
                            const historyMessages = data.chats.flatMap((chat: any, index: number) => [
                                {
                                    id: `history-user-${index}`,
                                    role: 'user' as const,
                                    content: chat.question,
                                    timestamp: new Date(chat.created_at).toISOString()
                                },
                                {
                                    id: `history-assistant-${index}`,
                                    role: 'assistant' as const,
                                    content: chat.answer,
                                    timestamp: new Date(chat.created_at).toISOString()
                                }
                            ]);
                            setMessages(historyMessages);
                        }
                    }
                } catch (error) {
                    console.error('Error loading chat history:', error);
                    // Don't show error to user, just load empty history
                }
            }
        };

        loadChatHistory();
    }, [selectedRepo]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!input.trim() || !selectedRepo || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await api.queryChat(selectedRepo, input);

            if (response.status === 'success') {
                const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: response.response.answer,
                    timestamp: new Date().toISOString(),
                };

                setMessages(prev => [...prev, assistantMessage]);
            } else {
                const errorMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: `Error: ${response.message || 'Failed to get a response'}`,
                    timestamp: new Date().toISOString(),
                };

                setMessages(prev => [...prev, errorMessage]);
            }
        } catch (error) {
            console.error('Chat error:', error);

            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, I encountered an error while processing your request. Please try again later.',
                timestamp: new Date().toISOString(),
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectRepo = (repoName: string) => {
        setSelectedRepo(repoName);
        setMessages([
            {
                id: Date.now().toString(),
                role: 'assistant',
                content: `Hello! I'm your documentation assistant for ${repoName}. Ask me anything about this repository's code and documentation.`,
                timestamp: new Date().toISOString(),
            },
        ]);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row">
                    {/* Sidebar */}
                    <div className="lg:w-1/4 pr-8">
                        <div className="sticky top-8">
                            <h2 className="text-xl font-bold text-gray-900">Documentation Chat</h2>
                            <p className="mt-2 text-sm text-gray-500">
                                Ask questions about your repositories and get AI-powered answers based on the documentation.
                            </p>

                            {error && (
                                <div className="mt-4 rounded-md bg-red-50 p-4">
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

                            <div className="mt-6">
                                <h3 className="text-sm font-medium text-gray-900">Your Repositories</h3>
                                {repositories.length > 0 ? (
                                    <ul className="mt-2 border border-gray-200 rounded-md divide-y divide-gray-200 max-h-96 overflow-y-auto">
                                        {repositories.map(repo => (
                                            <li key={repo.full_name}>
                                                <button
                                                    onClick={() => handleSelectRepo(repo.full_name)}
                                                    className={`w-full text-left px-4 py-2 text-sm ${selectedRepo === repo.full_name
                                                        ? 'bg-indigo-50 text-indigo-600'
                                                        : 'text-gray-700 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {repo.name}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="mt-2 text-sm text-gray-500">No repositories found.</div>
                                )}
                            </div>

                            {selectedRepo && (
                                <div className="mt-6 flex space-x-4">
                                    <Link
                                        href={`/documentation/view?repo=${selectedRepo}`}
                                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                                    >
                                        View Documentation
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chat area */}
                    <div className="lg:w-3/4 mt-8 lg:mt-0">
                        <div className="flex flex-col h-[70vh]">
                            <div className="flex-1 overflow-y-auto bg-gray-50 p-4 rounded-t-lg">
                                {messages.length > 0 ? (
                                    <div className="space-y-4">
                                        {messages.map(message => (
                                            <div
                                                key={message.id}
                                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'
                                                    }`}
                                            >
                                                <div
                                                    className={`max-w-3/4 rounded-lg px-4 py-2 ${message.role === 'user'
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'bg-gray-200 text-gray-800'
                                                        }`}
                                                >
                                                    {message.role === 'user' ? (
                                                        <div className="whitespace-pre-line">{message.content}</div>
                                                    ) : (
                                                        <div className="prose prose-sm max-w-none dark:prose-invert">
                                                            <ReactMarkdown>
                                                                {message.content}
                                                            </ReactMarkdown>
                                                        </div>
                                                    )}
                                                    <div
                                                        className={`text-xs mt-1 ${message.role === 'user' ? 'text-indigo-200' : 'text-gray-500'
                                                            }`}
                                                    >
                                                        {new Date(message.timestamp).toLocaleTimeString()}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </div>
                                ) : selectedRepo ? (
                                    <div className="flex items-center justify-center h-full">
                                        <p className="text-gray-500">
                                            Send a message to start chatting about {selectedRepo}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <p className="text-gray-500">
                                            Select a repository to start chatting
                                        </p>
                                    </div>
                                )}
                            </div>

                            <form
                                onSubmit={handleSubmit}
                                className="bg-white border-t border-gray-200 p-2 rounded-b-lg"
                            >
                                <div className="flex space-x-4">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        placeholder={selectedRepo ? "Ask a question about your repository..." : "Select a repository first"}
                                        disabled={!selectedRepo || isLoading}
                                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!selectedRepo || isLoading}
                                        className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Processing...
                                            </>
                                        ) : (
                                            "Send"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        }>
            <ChatContent />
        </Suspense>
    );
} 