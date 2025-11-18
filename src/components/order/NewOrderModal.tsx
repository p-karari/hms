'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, X, Search, ChevronDown, ListFilter } from 'lucide-react';

import { getOrderConceptOptions, OrderableConceptOption } from '@/lib/order/getOrderConceptOptions';
import { submitNewClinicalOrder, NewOrderSubmissionData } from '@/lib/order/submitNewClinicalOrder';

interface NewOrderModalProps {
  patientUuid: string;
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: () => void;
}

export default function NewOrderModal({ patientUuid, isOpen, onClose, onOrderSuccess }: NewOrderModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingConcepts, setIsLoadingConcepts] = useState(true);
  const [labConcepts, setLabConcepts] = useState<OrderableConceptOption[]>([]);
  const [filteredConcepts, setFilteredConcepts] = useState<OrderableConceptOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<OrderableConceptOption | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSelect, setShowSelect] = useState(false);
  const [viewMode, setViewMode] = useState<'search' | 'list'>('list'); // 'search' or 'list'
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchConcepts = useCallback(async () => {
    setIsLoadingConcepts(true);
    try {
      const lists = await getOrderConceptOptions();
      const concepts = lists.labTests;
      setLabConcepts(concepts);
      setFilteredConcepts(concepts);
    } catch (error) {
      console.error('Failed to load lab order concepts:', error);
      alert('Error loading lab order options.');
    } finally {
      setIsLoadingConcepts(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchConcepts();
    }
  }, [isOpen, fetchConcepts]);

  // Improved search function that searches across all names
  const performSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setFilteredConcepts(labConcepts);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const lowerQuery = query.toLowerCase().trim();
    
    // Search across ALL names in searchTerms array
    const results = labConcepts.filter(concept => {
      // Check primary display
      if (concept.display.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // Check all search terms
      if (concept.searchTerms && concept.searchTerms.some(term => 
        term.toLowerCase().includes(lowerQuery)
      )) {
        return true;
      }
      
      return false;
    });
    
    // Sort by relevance (exact matches first, then partial matches)
    const sortedResults = results.sort((a, b) => {
      const aExact = a.display.toLowerCase() === lowerQuery;
      const bExact = b.display.toLowerCase() === lowerQuery;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      const aStartsWith = a.display.toLowerCase().startsWith(lowerQuery);
      const bStartsWith = b.display.toLowerCase().startsWith(lowerQuery);
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      return a.display.localeCompare(b.display);
    });
    
    setFilteredConcepts(sortedResults);
    setIsSearching(false);
    
    // Always show dropdown when searching
    if (viewMode === 'search') {
      setShowDropdown(query.trim().length > 0);
    }
  }, [labConcepts, viewMode]);

  // Handle search input changes with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setViewMode('search');
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
  };

  // Handle concept selection
  const handleSelectConcept = (concept: OrderableConceptOption) => {
    setSelectedConcept(concept);
    setSearchQuery(concept.display);
    setShowDropdown(false);
    setShowSelect(false);
    setFormData(prev => ({ ...prev, conceptUuid: concept.uuid }));
  };

  // Clear search and selection
  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedConcept(null);
    setFilteredConcepts(labConcepts);
    setShowDropdown(false);
    setShowSelect(false);
    setFormData(prev => ({ ...prev, conceptUuid: '' }));
    searchInputRef.current?.focus();
  };

  // Toggle select dropdown
  const toggleSelect = () => {
    if (showSelect) {
      setShowSelect(false);
    } else {
      setShowSelect(true);
      setShowDropdown(false);
      setViewMode('list');
      // Reset to all concepts when opening select
      setFilteredConcepts(labConcepts);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current && 
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setShowSelect(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [formData, setFormData] = useState({
    conceptUuid: '',
    instructions: '',
    urgency: 'ROUTINE' as 'ROUTINE' | 'STAT',
    specimenSourceUuid: '',
  });

  const handleClose = () => {
    setSearchQuery('');
    setSelectedConcept(null);
    setFilteredConcepts([]);
    setShowDropdown(false);
    setShowSelect(false);
    setFormData({
      conceptUuid: '',
      instructions: '',
      urgency: 'ROUTINE',
      specimenSourceUuid: '',
    });
    onClose();
  };

  const isFormValid = !!formData.conceptUuid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      alert('Please select a lab test to order.');
      return;
    }

    setIsSubmitting(true);

    const payload: NewOrderSubmissionData = {
      patientUuid,
      conceptUuid: formData.conceptUuid,
      orderType: 'testorder',
      instructions: formData.instructions,
      urgency: formData.urgency,
      specimenSourceUuid: formData.specimenSourceUuid || undefined,
    };

    try {
      await submitNewClinicalOrder(payload);
      alert('Lab order submitted successfully.');
      onOrderSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Order submission failed:', error);
      alert(`Failed to submit lab order: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 relative">
        <h2 className="text-xl font-bold border-b pb-3 mb-4">Create New Lab Order</h2>

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
          disabled={isSubmitting}
        >
          <X className="w-5 h-5" />
        </button>

        {isLoadingConcepts ? (
          <div className="text-center p-8 text-blue-600">
            <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />
            Loading lab test options...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Lab Test</label>
              
              {/* Dual-mode input: Search + Select */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => {
                      if (searchQuery.trim().length > 0) {
                        setShowDropdown(true);
                        setShowSelect(false);
                      }
                    }}
                    placeholder="Search for a lab test..."
                    className="w-full border border-gray-300 rounded-lg p-2 pl-10 pr-10 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isSubmitting}
                    required
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {/* Select toggle button */}
                <button
                  type="button"
                  onClick={toggleSelect}
                  className="px-4 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                  disabled={isSubmitting}
                >
                  <ListFilter className="w-4 h-4" />
                  <span className="hidden sm:inline">Browse</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showSelect ? 'rotate-180' : ''}`} />
                </button>
              </div>
              
              {/* Search results dropdown */}
              {showDropdown && (
                <div 
                  ref={dropdownRef}
                  className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                  {isSearching ? (
                    <div className="p-3 text-center text-gray-500">
                      <Loader2 className="w-4 h-4 mx-auto animate-spin" />
                      Searching...
                    </div>
                  ) : (
                    <>
                      <div className="p-2 text-xs text-gray-500 border-b bg-gray-50">
                        {searchQuery.trim().length > 0 ? (
                          <>
                            Found {filteredConcepts.length} result{filteredConcepts.length !== 1 ? 's' : ''} for "{searchQuery}"
                          </>
                        ) : (
                          `Showing all ${filteredConcepts.length} tests`
                        )}
                      </div>
                      {filteredConcepts.length > 0 ? (
                        filteredConcepts.map((concept) => (
                          <button
                            key={concept.uuid}
                            type="button"
                            onClick={() => handleSelectConcept(concept)}
                            className="w-full text-left p-3 hover:bg-blue-50 border-b last:border-b-0 transition-colors flex items-start gap-2"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-gray-800">{concept.display}</div>
                              {concept.searchTerms && concept.searchTerms.length > 1 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Also known as: {concept.searchTerms.slice(1, 3).join(', ')}
                                  {concept.searchTerms.length > 3 && '...'}
                                </div>
                              )}
                            </div>
                            {concept.isPanel && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded whitespace-nowrap">
                                Panel
                              </span>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          No lab tests found for "{searchQuery}"
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              
              {/* Select dropdown (full list) */}
              {showSelect && !showDropdown && (
                <div 
                  ref={dropdownRef}
                  className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                  <div className="p-2 text-xs text-gray-500 border-b bg-gray-50">
                    Browse {filteredConcepts.length} tests
                  </div>
                  {filteredConcepts.map((concept) => (
                    <button
                      key={concept.uuid}
                      type="button"
                      onClick={() => handleSelectConcept(concept)}
                      className="w-full text-left p-3 hover:bg-blue-50 border-b last:border-b-0 transition-colors flex items-start gap-2"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{concept.display}</div>
                        {concept.searchTerms && concept.searchTerms.length > 1 && (
                          <div className="text-xs text-gray-500 mt-1">
                            Also known as: {concept.searchTerms.slice(1, 3).join(', ')}
                            {concept.searchTerms.length > 3 && '...'}
                          </div>
                        )}
                      </div>
                      {concept.isPanel && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded whitespace-nowrap">
                          Panel
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              
              {/* Selected concept indicator */}
              {selectedConcept && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded text-sm">
                  <div className="font-medium text-green-800 mb-1">Selected Test:</div>
                  <div className="font-semibold">{selectedConcept.display}</div>
                  {selectedConcept.searchTerms && selectedConcept.searchTerms.length > 1 && (
                    <div className="text-xs text-gray-600 mt-1">
                      Also known as: {selectedConcept.searchTerms.slice(1).join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
              <select
                value={formData.urgency}
                onChange={(e) => setFormData({ ...formData, urgency: e.target.value as any })}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isSubmitting}
              >
                <option value="ROUTINE">Routine</option>
                <option value="STAT">STAT (Immediate)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specimen Source (Optional)</label>
              <input
                type="text"
                value={formData.specimenSourceUuid}
                onChange={(e) => setFormData({ ...formData, specimenSourceUuid: e.target.value })}
                placeholder="e.g. Blood, Urine, Swab..."
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructions / Notes</label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex justify-end pt-4 border-t mt-4">
              <button
                type="button"
                onClick={handleClose}
                className="mr-2 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center"
                disabled={isSubmitting || !isFormValid}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Lab Order'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}