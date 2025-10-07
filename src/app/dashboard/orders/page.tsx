'use client';

import React from 'react';

const UnderDevelopment = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      {/* Background decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-200 rounded-full opacity-20 blur-3xl"></div>
      <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-indigo-200 rounded-full opacity-30 blur-2xl"></div>
      <div className="absolute top-1/3 right-1/3 w-16 h-16 bg-purple-200 rounded-full opacity-25 blur-xl"></div>
      
      <div className="relative max-w-2xl mx-auto text-center bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-12">
        {/* Animated construction icon */}
        <div className="relative mb-8">
          <div className="w-32 h-32 mx-auto bg-yellow-100 rounded-2xl flex items-center justify-center shadow-lg border border-yellow-200">
            <span className="text-5xl" role="img" aria-label="Construction">
              🚧
            </span>
          </div>
          {/* Pulsing animation around the icon */}
          <div className="absolute inset-0 w-32 h-32 mx-auto border-4 border-yellow-300 rounded-2xl animate-ping opacity-60"></div>
        </div>

        {/* Content */}
        <h1 className="text-4xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Page Under Development
        </h1>
        
        <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-md mx-auto">
          We&apos;re working hard to bring you an enhanced experience. This section is currently being built and will be available soon.
        </p>

        {/* Feature preview cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-lg mx-auto">
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="w-8 h-8 mx-auto mb-2 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600">⚡</span>
            </div>
            <p className="text-sm font-medium text-blue-800">Fast Performance</p>
          </div>
          <div className="p-4 bg-green-50 rounded-xl border border-green-100">
            <div className="w-8 h-8 mx-auto mb-2 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600">🎯</span>
            </div>
            <p className="text-sm font-medium text-green-800">Precision Tools</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
            <div className="w-8 h-8 mx-auto mb-2 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600">🔒</span>
            </div>
            <p className="text-sm font-medium text-purple-800">Secure Access</p>
          </div>
        </div>

        {/* Coming soon badge */}
        <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <span className="animate-pulse">✨</span>
          COMING SOON
          <span className="animate-pulse">✨</span>
        </div>

        {/* Progress indicator */}
        <div className="mt-8 max-w-md mx-auto">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full w-3/4 animate-pulse"></div>
          </div>
          <p className="text-sm text-gray-500 mt-2">Development in progress • 75% complete</p>
        </div>

        {/* Contact info */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Need immediate assistance?{' '}
            <a href="/contact" className="text-blue-600 hover:text-blue-700 font-medium underline">
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default UnderDevelopment;