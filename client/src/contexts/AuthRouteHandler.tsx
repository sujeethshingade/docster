'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthRouteHandler() {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        // This effect runs on route changes due to pathname dependency
        console.log('Route changed to:', pathname);

        // Check GitHub token on every route change
        const token = localStorage.getItem('github_token');

        // If no token and trying to access protected routes, redirect to connect
        if (!token) {
            if (pathname.includes('/documentation') || pathname.includes('/chat')) {
                console.warn('No GitHub token found, redirecting to connect');
                router.push('/github/connect');
                return;
            }
        } else {
            // If we have a token, refresh username in localStorage if missing
            const username = localStorage.getItem('github_username');
            if (!username && token) {
                // Dispatch auth-change event to trigger a refresh
                window.dispatchEvent(new Event('auth-change'));
            }
        }
    }, [pathname, router]);

    return null;
} 