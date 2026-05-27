'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { usersApi, authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export function UserProfile() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.me().then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: () => usersApi.updateMe({ displayName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => usersApi.deleteMe(),
    onSuccess: () => {
      authApi.logout();
      window.location.href = '/';
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading profile...</p>;
  if (!user) return <p className="text-destructive">Not authenticated.</p>;

  return (
    <div className="max-w-md space-y-6">
      <div className="flex items-center gap-4">
        {user.avatarUrl && (
          <Image
            src={user.avatarUrl}
            alt={user.displayName}
            width={64}
            height={64}
            className="rounded-full"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold">{user.displayName}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="text-xs text-muted-foreground">Member since {formatDate(user.createdAt)}</p>
        </div>
      </div>

      {editing ? (
        <form
          onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }}
          className="space-y-3"
        >
          <div>
            <label htmlFor="display-name" className="text-sm font-medium">Display Name</label>
            <input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={updateMutation.isPending}>Save</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setDisplayName(user.displayName); setEditing(true); }}
        >
          Edit Profile
        </Button>
      )}

      <div className="border-t pt-4">
        <h2 className="text-sm font-semibold text-destructive mb-2">Danger Zone</h2>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            if (window.confirm('Delete your account? This cannot be undone.')) {
              deleteMutation.mutate();
            }
          }}
          disabled={deleteMutation.isPending}
        >
          Delete Account
        </Button>
      </div>
    </div>
  );
}
