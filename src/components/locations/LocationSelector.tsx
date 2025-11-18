'use client';

import { useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { OpenMrsLocation, getLocations } from '@/lib/location/location';
import { setSessionLocation } from '@/lib/location/location';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button 
      type="submit" 
      disabled={pending}
      className="w-full px-6 py-3 text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:bg-gray-400 
                 flex justify-center items-center transition-all duration-200 shadow-md hover:shadow-lg
                 disabled:transform-none hover:scale-[1.02] active:scale-[0.98] font-semibold text-base"
    >
      {pending ? (
        <>
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
          Setting Location...
        </>
      ) : (
        'Set Location & Continue'
      )}
    </button>
  );
}

export default function LocationSelector() {
  const [locations, setLocations] = useState<OpenMrsLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInitialData() {
      try {
        setLoading(true);
        const data = await getLocations();
        setLocations(data);
        setError(null);
      } catch (error: unknown) {
        let errorMessage: string;
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else {
          errorMessage = "Failed to load locations.";
        }
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }
    fetchInitialData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-sm mx-auto p-8 bg-white rounded-2xl shadow-xl border border-gray-100 text-center">
          <div className="relative mb-4">
            <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 border-2 border-blue-200 rounded-full animate-ping"></div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Locations</h3>
          <p className="text-gray-600 text-sm">Fetching available facilities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-sm mx-auto p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connection Error</h3>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <p className="text-gray-500 text-xs">Please check your connection and try again.</p>
          </div>
        </div>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-sm mx-auto p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
          <div className="text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-11a1 1 0 112 0v4a1 1 0 11-2 0V7zm1 7a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Locations Found</h3>
            <p className="text-amber-600 text-sm">No login locations found. Contact your administrator.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="absolute top-10 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20 blur-xl"></div>
      <div className="absolute bottom-10 right-10 w-16 h-16 bg-indigo-200 rounded-full opacity-30 blur-lg"></div>
      
      <div className="relative w-full max-w-md mx-auto p-8 bg-white rounded-2xl shadow-xl border border-gray-100 backdrop-blur-sm">
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>

        <div className="text-center mb-8 pt-4">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Hospital Management System</h1>
          <p className="text-gray-600 mt-2 text-sm">Select Your Facility Location</p>
        </div>

        <form action={setSessionLocation}>
          <div className="mb-6">
            <label htmlFor="locationUuid" className="block text-sm font-semibold text-gray-900 mb-3">
              Choose Location:
            </label>
            <select
              id="locationUuid"
              name="locationUuid"
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all duration-200 bg-gray-50 hover:bg-white
                         placeholder:text-gray-400 text-gray-900 font-medium"
            >
              {locations.map((loc) => (
                <option key={loc.uuid} value={loc.uuid}>
                  {loc.display}
                </option>
              ))}
            </select>
          </div>
          
          <SubmitButton />
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Secure facility access • Authorized personnel only
          </p>
        </div>
      </div>
    </div>
  );
}