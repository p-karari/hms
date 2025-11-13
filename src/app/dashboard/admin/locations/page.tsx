// app/locations/page.tsx
'use client';

import { useState, useEffect, useTransition } from 'react';
import { Location, getAllLocations, createLocation, updateLocation, retireLocation } from '@/lib/location/manageLocations';
import LocationForm, { LocationFormData } from '@/components/locations/LocationForm';
import LocationTable from '@/components/locations/LocationsTable';


// Assuming a default user ID for mandatory creator/changed_by fields
const DEFAULT_CREATOR_ID = 1;
const DEFAULT_CHANGED_BY_ID = 1;

export default function LocationPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for form management
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  // --- Data Fetching ---
  const fetchLocations = () => {
    setLoading(true);
    setError(null);
    startTransition(async () => {
      try {
        const data = await getAllLocations();
        setLocations(data);
      } catch (err) {
        setError('Failed to fetch locations.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  // --- CRUD Handlers ---
  
  // FIXED: Accepts LocationFormData which is the data directly from the form
  const handleSave = async (data: LocationFormData) => {
    try {
      if (editingLocation) {
        // UPDATE operation
        // Must supply mandatory fields: location_id, name, creator, retired (unchanged)
        // and tracking fields: changed_by, date_changed
        const success = await updateLocation({
          ...data,
          location_id: editingLocation.location_id!,
          // Mandatory fields needed for the type definition (though they aren't changing)
          creator: editingLocation.creator, 
          // Tracking field needed for the action
          changed_by: DEFAULT_CHANGED_BY_ID, 
        });
        if (!success) throw new Error('Update failed.');
      } else {
        // CREATE operation
        // Must supply mandatory fields: name, creator, retired, uuid, date_created
        const newLocationData: Omit<Location, 'location_id'> = {
          ...data,
          creator: DEFAULT_CREATOR_ID, // Inject the mandatory creator ID
        };
        await createLocation(newLocationData);
      }
      
      // Close form and refresh data
      setIsFormOpen(false);
      setEditingLocation(null);
      fetchLocations(); 
    } catch (err) {
      setError(`Failed to save location: ${err instanceof Error ? err.message : String(err)}`);
      console.error(err);
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setIsFormOpen(true);
  };

  const handleRetire = async (location_id: number) => {
    if (window.confirm('Are you sure you want to retire this location?')) {
      try {
        const success = await retireLocation(location_id, DEFAULT_CHANGED_BY_ID, "User retired location from UI");
        if (success) {
          fetchLocations(); // Refresh the list
        } else {
          throw new Error('Retirement failed.');
        }
      } catch (err) {
        setError('Failed to retire location.');
        console.error(err);
      }
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">🏥 Location Management</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end mb-4">
        <button 
          onClick={() => { setEditingLocation(null); setIsFormOpen(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition-colors"
        >
          + Add New Location
        </button>
      </div>

      {/* Location List */}
      <div className="bg-white p-6 rounded-lg shadow-xl">
        <h2 className="text-2xl font-semibold mb-4">Active Locations</h2>
        {(loading || isPending) ? (
          <p>Loading locations...</p>
        ) : locations.length === 0 ? (
          <p>No active locations found.</p>
        ) : (
          <LocationTable 
            locations={locations} 
            onEdit={handleEdit}
            onRetire={handleRetire}
          />
        )}
      </div>

      {/* Form Modal/Section */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
          <LocationForm
            initialData={editingLocation}
            onSave={handleSave} // Now expects LocationFormData
            onCancel={() => { setIsFormOpen(false); setEditingLocation(null); }}
            isSaving={isPending}
          />
        </div>
      )}
    </div>
  );
}