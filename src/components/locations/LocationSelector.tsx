// LocationSelector.tsx

'use client'; // This directive is essential for a client component

import { useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom'; // Next.js hook for form state
import Spinner from '../ui/spinner';
import { OpenMrsLocation, getLocations } from '@/lib/location/location';
import { setSessionLocation } from '@/lib/location/location';

// 1. Define the Button Component (for form pending state)
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button 
      type="submit" 
      disabled={pending}
      className="w-full px-6 py-3 text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:bg-gray-400 
                 flex justify-center items-center transition-all duration-200 shadow-md hover:shadow-lg
                 disabled:transform-none hover:scale-[1.02] active:scale-[0.98] font-semibold"
    >
      {pending ? (
        <Spinner size="w-5 h-5" color="border-white" />
      ) : (
        'Set Location & Continue'
      )}
    </button>
  );
}

// 2. Define the Main Location Selector Component
export default function LocationSelector() {
  const [locations, setLocations] = useState<OpenMrsLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 3. Fetch Data using useEffect
  useEffect(() => {
    async function fetchInitialData() {
      try {
        setLoading(true);
        const data = await getLocations();
        setLocations(data);
        setError(null);
      } catch (error: unknown) {
        // The error message thrown from the Server Action
        let errorMessage: string;
    
      if (error instanceof Error) {
          errorMessage = error.message;
      } else if (typeof error === 'string') {
          errorMessage = error;
      } else {
          errorMessage = "An unrecoverable error of unknown type occurred.";
      }
        setError(errorMessage || "Failed to load locations."); 
      } finally {
        setLoading(false);
      }
    }
    fetchInitialData();
  }, []);

  // 4. Render Loading/Error States
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-lg">
        <div className="relative">
          <Spinner size="w-12 h-12" color="border-blue-500" />
          <div className="absolute inset-0 border-2 border-blue-200 rounded-full animate-ping"></div>
        </div>
        <p className="mt-6 text-gray-700 font-medium text-lg">Loading available locations</p>
        <p className="mt-2 text-gray-500 text-sm">Please wait while we fetch your facility data</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-red-800 bg-red-50 border border-red-200 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold">Connection Error</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <p className="text-sm text-red-600 bg-red-100 px-4 py-2 rounded-lg">
          Please ensure you are logged in or check the server status.
        </p>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="p-8 text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-11a1 1 0 112 0v4a1 1 0 11-2 0V7zm1 7a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold">No Locations Found</h3>
        </div>
        <p className="text-amber-700">No login locations found. Contact your administrator.</p>
      </div>
    );
  }

  // 5. Render the Form - 
  return (
    <div className="max-w-md mx-auto p-8 bg-white shadow-xl rounded-2xl border border-gray-100">
      {/* Header with medical icon */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Select Session Location</h2>
        <p className="text-gray-600 mt-2">Choose your facility to continue</p>
      </div>
      
      {/* 6. Use the Server Action directly as the form action */}
      <form action={setSessionLocation}>
        <div className="mb-8">
          <label htmlFor="locationUuid" className="block text-sm font-semibold text-gray-800 mb-3">
            Facility Location:
          </label>
          <select
            id="locationUuid"
            name="locationUuid" // This MUST match the key used in setSessionLocation(formData.get('locationUuid'))
            required
            className="w-full p-4 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 
                       focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white
                       text-gray-900 font-medium"
          >
            {locations.map((loc) => (
              <option key={loc.uuid} value={loc.uuid}>
                {loc.display}
              </option>
            ))}
          </select>
        </div>
        
        {/* The submit button component handles the loading state */}
        <SubmitButton />
      </form>

      {/* Security note */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Secure facility access • Authorized personnel only
        </p>
      </div>
    </div>
  );
}