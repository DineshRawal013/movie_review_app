import { Metadata } from 'next';
import { UserManagement } from '@/components/admin/user-management';

export const metadata: Metadata = { title: 'User Management' };

export default function AdminUsersPage() {
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <UserManagement />
    </div>
  );
}
