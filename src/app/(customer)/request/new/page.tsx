'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createRequest } from '@/lib/firebase/firestore';
import { uploadPrescriptionImage } from '@/lib/firebase/storage';
import { RequestType } from '@/types';
import Button from '@/components/ui/Button';
import {
  ArrowLeft,
  Camera,
  FileText,
  X,
  Image as ImageIcon,
  Loader2,
  MapPin,
} from 'lucide-react';

type Step = 'type' | 'details' | 'submitting';

export default function NewRequestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('type');
  const [requestType, setRequestType] = useState<RequestType | null>(null);

  // Prescription upload
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

  // Text request
  const [medicineText, setMedicineText] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 3 images
    const newFiles = [...images, ...files].slice(0, 3);
    setImages(newFiles);

    // Create preview URLs
    const newPreviewUrls = newFiles.map((file) => URL.createObjectURL(file));
    setImagePreviewUrls(newPreviewUrls);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviewUrls = imagePreviewUrls.filter((_, i) => i !== index);
    setImages(newImages);
    setImagePreviewUrls(newPreviewUrls);
  };

  const handleSubmit = async () => {
    if (!user) {
      setError('Not authenticated');
      return;
    }

    const location = user.customerProfile?.location;
    if (!location) {
      setError('Location not found. Please update your profile.');
      return;
    }

    if (requestType === 'prescription' && images.length === 0) {
      setError('Please upload at least one prescription image');
      return;
    }

    if (requestType === 'text' && !medicineText.trim()) {
      setError('Please enter the medicine names');
      return;
    }

    setStep('submitting');
    setLoading(true);
    setError('');

    try {
      // Create a temporary ID for uploading images
      const tempId = `temp_${Date.now()}`;

      // Upload images if prescription type
      let prescriptionImageUrls: string[] = [];
      if (requestType === 'prescription') {
        prescriptionImageUrls = await Promise.all(
          images.map((file, index) =>
            uploadPrescriptionImage(tempId, file, index)
          )
        );
      }

      // Create request
      const requestData: Parameters<typeof createRequest>[0] = {
        customerId: user.uid,
        customerName: user.displayName,
        customerPhone: user.phone,
        requestType: requestType!,
        location,
        status: 'active',
      };

      // Add optional fields only if they have values
      if (requestType === 'prescription' && prescriptionImageUrls.length > 0) {
        requestData.prescriptionImageUrls = prescriptionImageUrls;
      }
      if (requestType === 'text' && medicineText.trim()) {
        requestData.medicineText = medicineText.trim();
      }

      const requestId = await createRequest(requestData);

      // Navigate to request detail page
      router.push(`/request/${requestId}`);
    } catch (err: unknown) {
      console.error('Error creating request:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create request';
      setError(errorMessage);
      setStep('details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (step === 'type') router.push('/dashboard');
              else if (step === 'details') setStep('type');
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={step === 'submitting'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Find Medicine</h1>
        </div>
      </header>

      <main className="px-6 py-6">
        {/* Location indicator */}
        {user?.customerProfile?.location && step !== 'submitting' && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 p-3 bg-gray-50 rounded-lg">
            <MapPin className="w-4 h-4" />
            <span className="truncate">{user.customerProfile.location.address}</span>
          </div>
        )}

        {/* Step 1: Choose Type */}
        {step === 'type' && (
          <div>
            <h2 className="text-2xl font-bold mb-2">How would you like to search?</h2>
            <p className="text-gray-500 mb-8">
              Choose the method that works best for you
            </p>

            <div className="space-y-4">
              <button
                onClick={() => {
                  setRequestType('prescription');
                  setStep('details');
                }}
                className="w-full p-6 border-2 border-gray-200 rounded-2xl text-left hover:border-primary hover:bg-primary-light/30 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
                    <Camera className="w-6 h-6 text-primary-dark" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Upload Prescription</h3>
                    <p className="text-gray-500 text-sm mt-1">
                      Take a photo or upload an image of your prescription
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setRequestType('text');
                  setStep('details');
                }}
                className="w-full p-6 border-2 border-gray-200 rounded-2xl text-left hover:border-primary hover:bg-primary-light/30 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-primary-dark" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Type Medicine Names</h3>
                    <p className="text-gray-500 text-sm mt-1">
                      Simply type what you need - Paracetamol, Crocin, etc.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Enter Details - Prescription */}
        {step === 'details' && requestType === 'prescription' && (
          <div>
            <h2 className="text-2xl font-bold mb-2">Upload Prescription</h2>
            <p className="text-gray-500 mb-6">
              Upload clear images of your prescription (max 3)
            </p>

            {/* Image Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />

            <div className="grid grid-cols-3 gap-3 mb-6">
              {imagePreviewUrls.map((url, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={url}
                    alt={`Prescription ${index + 1}`}
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {images.length < 3 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center hover:border-primary hover:bg-primary-light/20 transition-colors"
                >
                  <ImageIcon className="w-8 h-8 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500">Add Image</span>
                </button>
              )}
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={images.length === 0}
              isLoading={loading}
            >
              Find Pharmacies
            </Button>
          </div>
        )}

        {/* Step 2: Enter Details - Text */}
        {step === 'details' && requestType === 'text' && (
          <div>
            <h2 className="text-2xl font-bold mb-2">What do you need?</h2>
            <p className="text-gray-500 mb-6">
              Type the medicine names you&apos;re looking for
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Medicine Names *
              </label>
              <textarea
                value={medicineText}
                onChange={(e) => setMedicineText(e.target.value)}
                placeholder="e.g., Paracetamol 500mg, Crocin, Vitamin D..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={!medicineText.trim()}
              isLoading={loading}
            >
              Find Pharmacies
            </Button>
          </div>
        )}

        {/* Submitting State */}
        {step === 'submitting' && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 bg-primary-light rounded-full flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-primary-dark animate-spin" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Finding Pharmacies</h2>
            <p className="text-gray-500">
              We&apos;re notifying nearby pharmacies about your request...
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
