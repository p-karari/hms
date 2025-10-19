'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface PatientSearchInputProps {
    onSearch: (query: string) => void;
    isSearching: boolean;
}

export function PatientSearchInput({ onSearch, isSearching }: PatientSearchInputProps) {
    const [query, setQuery] = useState('');
    
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedQuery = query.trim();
        onSearch(trimmedQuery || '*');
    };
    
    return (
        <form onSubmit={handleSearch} className="flex gap-2 text-black">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search patients..."
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                disabled={isSearching}
            />
            <button
                type="submit"
                disabled={isSearching}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-blue-400"
            >
                {isSearching ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                    <Search className="w-3 h-3" />
                )}
                Search
            </button>
        </form>
    );
}