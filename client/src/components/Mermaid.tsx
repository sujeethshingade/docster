'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
    chart: string;
    className?: string;
}

export default function Mermaid({ chart, className = '' }: MermaidProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!chart || !containerRef.current) return;

        try {
            // Initialize mermaid with configuration
            mermaid.initialize({
                startOnLoad: true,
                theme: 'neutral',
                securityLevel: 'loose',
                logLevel: 'error',
                flowchart: {
                    htmlLabels: true,
                    curve: 'basis',
                    nodeSpacing: 50,
                    rankSpacing: 50,
                    padding: 10
                },
                themeVariables: {
                    fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
                    fontSize: '14px'
                }
            });

            // Clean the chart string
            const cleanChart = chart.replace(/```mermaid\n?|\n?```/g, '').trim();
            
            console.log('Rendering chart:', cleanChart); // Debug log

            // Generate unique ID for the diagram
            const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

            // Render the diagram
            mermaid.render(id, cleanChart)
                .then(({ svg }) => {
                    if (containerRef.current) {
                        containerRef.current.innerHTML = svg;
                        setError(null);
                    }
                })
                .catch(err => {
                    console.error('Mermaid rendering error:', err);
                    setError(err.message);
                    // Show error state in the container
                    if (containerRef.current) {
                        containerRef.current.innerHTML = `
                            <div class="text-red-500 p-4">
                                <p>Failed to render diagram</p>
                                <pre class="text-sm mt-2 bg-red-50 p-2 rounded">${cleanChart}</pre>
                            </div>
                        `;
                    }
                });
        } catch (err) {
            console.error('Mermaid initialization error:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        }
    }, [chart]);

    if (error) {
        return (
            <div className="border border-red-200 rounded-md p-4 bg-red-50">
                <p className="text-red-500 text-sm">Error rendering diagram: {error}</p>
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            className={`mermaid-container overflow-x-auto p-4 bg-gray-50 rounded-lg shadow-sm ${className}`}
        />
    );
}