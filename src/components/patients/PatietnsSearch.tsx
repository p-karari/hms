'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface PatientSearchInputProps {
    onSearch: (query: string) => void;
    isSearching: boolean;
}

/**
 * Client component providing the search input UI, decoupled from result rendering.
 */
export function PatientSearchInput({ onSearch, isSearching }: PatientSearchInputProps) {
    const [query, setQuery] = useState('');
    
    // Event handler for form submission
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedQuery = query.trim();
        
        if (!trimmedQuery) {
             // If search is empty, we send an initial query signal (like '*') to reset to the default list
            onSearch('*'); 
            return;
        }
        
        onSearch(trimmedQuery);
    };
    
    return (
        <div className="p-4 bg-white rounded-xl shadow-lg text-black">
            <form onSubmit={handleSearch} className="flex space-x-4">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name or ID (or press enter for active list)..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
                    disabled={isSearching}
                />
                <button
                    type="submit"
                    disabled={isSearching}
                    className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition"
                >
                    {isSearching ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                        <Search className="w-5 h-5 mr-2" />
                    )}
                    Search
                </button>
            </form>
        </div>
    );
}