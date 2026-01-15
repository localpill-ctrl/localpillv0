'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import Button from '@/components/ui/Button';
import { MapPin, Upload, MessageCircle, Pill, Search, Phone, Navigation } from 'lucide-react';

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
            <Search className="w-12 h-12 text-primary-dark" />
          </div>

          <h1 className="text-4xl font-black mb-4 leading-tight">
            Find Medicine
            <br />
            <span className="text-primary-dark">Near You</span>
          </h1>

          <p className="text-gray-500 text-lg mb-8">
            Stop wasting time visiting multiple pharmacies. Find out which nearby
            pharmacy has your medicine in stock.
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
                  Upload your prescription photo or simply type the medicine name
                  you&apos;re looking for.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-primary-dark" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">See Who Has It</h3>
                <p className="text-gray-500">
                  Nearby pharmacies respond with availability. See which ones have
                  your medicine in stock.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
                <Navigation className="w-6 h-6 text-primary-dark" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Go Get It</h3>
                <p className="text-gray-500">
                  Call the pharmacy, chat with them, or get directions to visit
                  directly. No more wasted trips!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* For Pharmacies */}
        <section className="mt-16 max-w-lg mx-auto bg-gray-50 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">For Pharmacies</h2>
          <p className="text-gray-600 mb-4">
            Get notified when nearby customers are looking for medicine you stock.
            Simply respond with availability and connect with customers directly.
          </p>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-primary-dark" />
              <span>Receive medicine requests from nearby customers</span>
            </li>
            <li className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary-dark" />
              <span>Mark available and chat with customers</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary-dark" />
              <span>No delivery obligation - customers visit you</span>
            </li>
          </ul>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-gray-100 text-center text-gray-400 text-sm">
        <p>LocalPill - Find medicine near you</p>
      </footer>
    </div>
  );
}
