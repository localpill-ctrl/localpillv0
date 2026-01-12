'use client';

import { useRef, useEffect, useState } from 'react';
import { OrderWithDistance } from '@/types';
import Button from '@/components/ui/Button';
import { MapPin, FileText, Camera, X } from 'lucide-react';

interface OrderAlertModalProps {
  order: OrderWithDistance;
  onAccept: () => void;
  onSkip: () => void;
  isAccepting: boolean;
}

export default function OrderAlertModal({
  order,
  onAccept,
  onSkip,
  isAccepting,
}: OrderAlertModalProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [audioInitialized, setAudioInitialized] = useState(false);

  // Initialize audio
  useEffect(() => {
    // Create audio element with a loud alert sound
    // Using a data URL for a simple beep sound as fallback
    const audio = new Audio();
    audio.src = '/sounds/order-alert.mp3';
    audio.volume = 1.0;
    audio.loop = false;

    // Fallback to Web Audio API beep if file doesn't exist
    audio.onerror = () => {
      console.log('Alert sound file not found, using Web Audio API');
    };

    audioRef.current = audio;
    setAudioInitialized(true);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Play alert sound repeatedly
  useEffect(() => {
    if (!audioInitialized) return;

    const playAlert = () => {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {
          // If audio fails, try Web Audio API beep
          playBeep();
        });
      } else {
        playBeep();
      }
    };

    // Play immediately
    playAlert();

    // Repeat every 3 seconds
    const interval = setInterval(playAlert, 3000);

    return () => {
      clearInterval(interval);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [audioInitialized]);

  // Web Audio API beep fallback
  const playBeep = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Web Audio API not available');
    }
  };

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onSkip();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onSkip]);

  // Vibrate on mobile
  useEffect(() => {
    if ('vibrate' in navigator) {
      const pattern = [200, 100, 200, 100, 200];
      navigator.vibrate(pattern);

      const interval = setInterval(() => {
        navigator.vibrate(pattern);
      }, 2000);

      return () => {
        clearInterval(interval);
        navigator.vibrate(0);
      };
    }
  }, []);

  // Flash browser tab title
  useEffect(() => {
    const originalTitle = document.title;
    let isFlashing = true;

    const interval = setInterval(() => {
      document.title = isFlashing ? 'NEW ORDER!' : originalTitle;
      isFlashing = !isFlashing;
    }, 500);

    return () => {
      clearInterval(interval);
      document.title = originalTitle;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full animate-pulse-border">
        {/* Countdown Ring */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="44"
              stroke="#E5E7EB"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="48"
              cy="48"
              r="44"
              stroke="#FCD34D"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={276.46}
              strokeDashoffset={276.46 * (1 - timeLeft / 30)}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold">{timeLeft}s</span>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center mb-4">New Order!</h2>

        {/* Order Details */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3 mb-3">
            {order.requestType === 'prescription' ? (
              <Camera className="w-5 h-5 text-primary-dark mt-0.5" />
            ) : (
              <FileText className="w-5 h-5 text-primary-dark mt-0.5" />
            )}
            <div>
              <p className="font-medium">
                {order.requestType === 'prescription'
                  ? 'Prescription Upload'
                  : order.medicineRequest?.slice(0, 100) || 'Medicine Request'}
              </p>
              {order.requestType === 'text' && order.medicineRequest && order.medicineRequest.length > 100 && (
                <span className="text-gray-400">...</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="w-4 h-4" />
            <span>
              {order.deliveryAddress.area || order.deliveryAddress.city || 'Nearby'}
            </span>
            <span className="text-primary-dark font-medium">
              ({order.distance?.toFixed(1) || '< 2'} km away)
            </span>
          </div>
        </div>

        {/* Prescription Preview */}
        {order.requestType === 'prescription' && order.prescriptionImageUrls && order.prescriptionImageUrls.length > 0 && (
          <div className="mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {order.prescriptionImageUrls.slice(0, 2).map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Prescription ${index + 1}`}
                  className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                />
              ))}
              {order.prescriptionImageUrls.length > 2 && (
                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-500 font-medium">
                    +{order.prescriptionImageUrls.length - 2}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            disabled={isAccepting}
            className="flex-1 py-4 bg-gray-200 rounded-xl font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            Skip
          </button>
          <button
            onClick={onAccept}
            disabled={isAccepting}
            className="flex-1 py-4 bg-primary text-black rounded-xl font-bold text-lg hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {isAccepting ? (
              <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full" />
            ) : (
              'ACCEPT'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
