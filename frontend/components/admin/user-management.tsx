'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export function UserManagement() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminApi.listUsers().then((r) => r.data),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      adminApi.setRole(userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading users...</p>;

  return (
    <div className="space-y-3">
      {data?.data.map((user: any) => (
        <div key={user.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
          <div>
            <p className="text-sm font-medium">{user.displayName}</p>
            <p className="text-xs text-muted-foreground">{user.email} · joined {formatDate(user.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs rounded-full bg-secondary px-2 py-0.5">{user.role}</span>
            {user.role === 'user' ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => roleMutation.mutate({ userId: user.id, role: 'admin' })}
              >
                Make Admin
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => roleMutation.mutate({ userId: user.id, role: 'user' })}
              >
                Revoke Admin
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
