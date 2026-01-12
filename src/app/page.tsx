'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import Button from '@/components/ui/Button';
import { MapPin, Upload, MessageCircle, Pill } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      // Redirect to appropriate dashboard
      if (user.role === 'pharmacy') {
        router.push('/pharmacy/dashboard');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-2xl font-black tracking-tight">
            L<span className="text-primary">O</span>CAL
          </span>
          <span className="text-2xl font-black tracking-tight">
            <span className="text-primary">P</span>ILL
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/login')}>
          Login
        </Button>
      </header>

      {/* Hero Section */}
      <main className="px-6 pt-12 pb-20">
        <div className="max-w-lg mx-auto text-center">
          {/* Hero Icon */}
          <div className="w-24 h-24 mx-auto mb-8 bg-primary-light rounded-full flex items-center justify-center">
            <Pill className="w-12 h-12 text-primary-dark" />
          </div>

          <h1 className="text-4xl font-black mb-4 leading-tight">
            Your Local Pharmacy,
            <br />
            <span className="text-primary-dark">Delivered</span>
          </h1>

          <p className="text-gray-500 text-lg mb-8">
            Upload your prescription or just tell us what you need. We connect
            you with nearby pharmacies instantly.
          </p>

          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full" onClick={() => router.push('/register')}>
              Get Started
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => router.push('/register/pharmacy')}
            >
              Register as Pharmacy
            </Button>
          </div>
        </div>

        {/* How it Works */}
        <section className="mt-20 max-w-lg mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">How it Works</h2>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
                <Upload className="w-6 h-6 text-primary-dark" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Upload or Type</h3>
                <p className="text-gray-500">
                  Upload your prescription photo or simply type the medicines you
                  need.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-primary-dark" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">We Find Pharmacies</h3>
                <p className="text-gray-500">
                  Your request is sent to all nearby pharmacies within 2km
                  instantly.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-primary-dark" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Chat & Get Delivered</h3>
                <p className="text-gray-500">
                  A pharmacy accepts your order. Chat with them and get your
                  medicines delivered.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-gray-100 text-center text-gray-400 text-sm">
        <p>LocalPill - Connecting you to local pharmacies</p>
      </footer>
    </div>
  );
}
