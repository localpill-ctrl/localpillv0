'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/admin';
import { subscribeToGlobalStats } from '@/lib/firebase/firestore';
import { GlobalStats } from '@/types';
import {
  Users,
  Store,
  FileSearch,
  Clock,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { signOut } from '@/lib/firebase/auth';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, firebaseUser, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<GlobalStats>({
    totalRequests: 0,
    totalCustomers: 0,
    totalPharmacies: 0,
    activeRequests: 0,
  });
  const [loading, setLoading] = useState(true);

  // Check if user is admin
  useEffect(() => {
    if (!authLoading) {
      if (!firebaseUser || !isAdmin(firebaseUser.email)) {
        router.push('/');
      }
    }
  }, [firebaseUser, authLoading, router]);

  // Subscribe to stats
  useEffect(() => {
    const unsubscribe = subscribeToGlobalStats((data) => {
      setStats(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  if (authLoading || !firebaseUser || !isAdmin(firebaseUser.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm">{firebaseUser.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <LogOut className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </header>

      <main className="px-6 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <StatCard
            icon={FileSearch}
            label="Total Requests"
            value={stats.totalRequests}
            color="blue"
          />
          <StatCard
            icon={Clock}
            label="Active Requests"
            value={stats.activeRequests}
            color="green"
          />
          <StatCard
            icon={Users}
            label="Customers"
            value={stats.totalCustomers}
            color="purple"
          />
          <StatCard
            icon={Store}
            label="Pharmacies"
            value={stats.totalPharmacies}
            color="orange"
          />
        </div>

        {/* Quick Links */}
        <h2 className="text-lg font-semibold mb-4">Manage</h2>
        <div className="space-y-3">
          <NavLink
            href="/admin/requests"
            icon={FileSearch}
            label="All Requests"
            description="View and manage medicine requests"
          />
          <NavLink
            href="/admin/pharmacies"
            icon={Store}
            label="Pharmacies"
            description="View registered pharmacies"
          />
          <NavLink
            href="/admin/customers"
            icon={Users}
            label="Customers"
            description="View registered customers"
          />
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
    >
      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-gray-600" />
      </div>
      <div className="flex-1">
        <h3 className="font-medium">{label}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </Link>
  );
}
