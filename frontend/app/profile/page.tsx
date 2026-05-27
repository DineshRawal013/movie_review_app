import { Metadata } from 'next';
import { UserProfile } from '@/components/users/user-profile';

export const metadata: Metadata = { title: 'My Profile' };

export default function ProfilePage() {
  return (
    <div className="container py-8">
      <UserProfile />
    </div>
  );
}
