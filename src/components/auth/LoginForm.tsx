// src/components/auth/LoginForm.tsx
'use client';

import { useFormStatus } from 'react-dom';
import { login } from '@/lib/auth/auth';
import { Button } from '@/components/ui/Button';
import { useActionState } from 'react';

type FormState = {
  error: string | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Logging in...' : 'Log In'}
    </Button>
  );
}

export default function LoginForm() {
  const [state, formAction] = useActionState<FormState, FormData>(login, { error: null });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Medical-themed decorative elements */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20 blur-xl"></div>
      <div className="absolute bottom-10 right-10 w-16 h-16 bg-indigo-200 rounded-full opacity-30 blur-lg"></div>
      
      <form 
        action={formAction} 
        className="relative w-full max-w-md mx-auto p-8 bg-white rounded-2xl shadow-xl border border-gray-100 backdrop-blur-sm"
      >
        {/* Medical cross icon */}
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        </div>

        <div className="text-center mb-8 pt-4">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Alphil Hospital</h1>
          <p className="text-gray-600 mt-2 text-sm">Secure Staff Access Portal</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label 
              htmlFor="username" 
              className="block text-sm font-semibold text-gray-900"
            >
              Username
            </label>
            <input 
              className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all duration-200 bg-gray-50 hover:bg-white
                         placeholder:text-gray-400 text-gray-900"
              id="username" 
              name="username" 
              type="text" 
              placeholder="Enter your staff username"
              required 
            />
          </div>
          
          <div className="space-y-3">
            <label 
              htmlFor="password" 
              className="block text-sm font-semibold text-gray-900"
            >
              Password
            </label>
            <input 
              className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all duration-200 bg-gray-50 hover:bg-white
                         placeholder:text-gray-400 text-gray-900"
              id="password" 
              name="password" 
              type="password" 
              placeholder="Enter your secure password"
              required 
            />
          </div>

          {state && state.error && typeof state.error === 'string' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl animate-pulse">
              <p className="text-red-800 text-sm font-medium flex items-center justify-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                {state.error}
              </p>
            </div>
          )}

          <div className="pt-2">
            <SubmitButton />
          </div>
        </div>

        {/* Security notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            🔒 Secure access for authorized medical staff only
          </p>
        </div>
      </form>
    </div>
  );
}