'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { usersApi, authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { Moon, Sun, Film } from 'lucide-react';

export function Navbar() {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.me().then((r) => r.data),
    retry: false,
  });

  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    await authApi.logout();
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container flex h-14 items-center gap-6" aria-label="Main navigation">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Film className="h-5 w-5" aria-hidden="true" />
          CineRate
        </Link>

        <div className="flex-1" />

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-md p-2 hover:bg-muted transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {user ? (
          <div className="flex items-center gap-3">
            <Link href="/profile" className="text-sm hover:underline">
              {user.displayName}
            </Link>
            {user.role === 'admin' && (
              <>
                <Link href="/admin/moderation" className="text-sm text-muted-foreground hover:underline">
                  Moderation
                </Link>
                <Link href="/admin/users" className="text-sm text-muted-foreground hover:underline">
                  Users
                </Link>
                <Link href="/admin/movies" className="text-sm text-muted-foreground hover:underline">
                  Movies
                </Link>
              </>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        ) : (
          <Button asChild size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
        )}
      </nav>
    </header>
  );
}
