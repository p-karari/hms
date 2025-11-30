// app/locations/_components/LocationForm.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Location } from '@/lib/location/manageLocations';

// Type for the data submitted by the form (only user-editable fields)
export type LocationFormData = {
  name: string;
  description: string | null;
  parent_location: number | null;
};

interface LocationFormProps {
  initialData: Location | null;
  // FIXED: The onSave prop now correctly expects LocationFormData
  onSave: (data: LocationFormData) => void; 
  onCancel: () => void;
  isSaving: boolean;
}

export default function LocationForm({ initialData, onSave, onCancel, isSaving }: LocationFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [parentLocation, setParentLocation] = useState(initialData?.parent_location?.toString() || '');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setParentLocation(initialData.parent_location?.toString() || '');
    }
  }, [initialData]);

  const isEditing = useMemo(() => !!initialData, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Location Name is mandatory.');
      return;
    }

    const data: LocationFormData = {
      name: name.trim(),
      // Ensure empty strings are passed as null for optional fields
      description: description.trim() || null, 
      parent_location: parentLocation ? parseInt(parentLocation) : null,
    };

    onSave(data);
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        {isEditing ? '✏️ Edit Location' : '✨ Create New Location'}
      </h2>
      <form onSubmit={handleSubmit}>
        
        {/* Name (Mandatory Field) */}
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Location Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
            disabled={isSaving}
          />
        </div>

        {/* Description (Optional Field) */}
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            rows={3}
            disabled={isSaving}
          />
        </div>

        {/* Parent Location (Optional Field - Integer ID) */}
        <div className="mb-6">
          <label htmlFor="parentLocation" className="block text-sm font-medium text-gray-700">
            Parent Location ID (Optional)
          </label>
          <input
            type="number"
            id="parentLocation"
            value={parentLocation}
            onChange={(e) => setParentLocation(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            min="1"
            disabled={isSaving}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md shadow hover:bg-green-700 transition-colors disabled:opacity-50"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : (isEditing ? 'Update Location' : 'Create Location')}
          </button>
        </div>
      </form>
    </div>
  );
}