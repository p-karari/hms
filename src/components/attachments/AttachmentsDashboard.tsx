'use client';

import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { Plus, FolderOpen, Loader2, AlertTriangle, Upload, FileText, X } from 'lucide-react';

import AttachmentList from '@/components/attachments/AttachmentList';
import { getAttachmentUploadContext } from '@/lib/attachments/getAttachmentUploadContext';
import { uploadPatientAttachment } from '@/lib/attachments/uploadPatientAttachment';
import { getPatientLocations } from '@/lib/location/getPatientLocations';


interface AttachmentsDashboardProps {
    patientUuid: string;
    patientName: string;
}


export default function AttachmentsDashboard({ patientUuid }: AttachmentsDashboardProps) {
    
    const [refreshKey, setRefreshKey] = useState(0); 
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingContext, setIsLoadingContext] = useState(false);
    
    const [documentConceptUuid, setDocumentConceptUuid] = useState<string | null>(null);
    const [providerUuid, setProviderUuid] = useState<string | null>(null);
    const [locationOptions, setLocationOptions] = useState<Array<{ uuid: string; display: string }>>([]);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        comment: '',
        locationUuid: '',
    });

    const MAX_FILE_SIZE_MB = 5; 
const providerId = process.env.NEXT_PUBLIC_PROVIDER_UUID!;
    const fetchInitialData = useCallback(async () => {
        setIsLoadingContext(true);
        try {
            const [context, locations] = await Promise.all([
                getAttachmentUploadContext(),
                getPatientLocations(patientUuid), 
            ]);
            
            setDocumentConceptUuid(context.clinicalDocumentConceptUuid);
            setProviderUuid(providerId);
            setLocationOptions(locations.map(loc => ({ uuid: loc.uuid, display: loc.display })));
            
            if (locations.length > 0) {
                setFormData(prev => ({ ...prev, locationUuid: locations[0].uuid }));
            }
            
        } catch (error) {
            console.error("Failed to load initial data for attachments form:", error);
        } finally {
            setIsLoadingContext(false);
        }
    }, [patientUuid, providerId]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files ? e.target.files[0] : null;
        if (file) {
            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                alert(`File size exceeds the limit of ${MAX_FILE_SIZE_MB}MB.`);
                setSelectedFile(null);
                e.target.value = ''; 
                return;
            }
        }
        setSelectedFile(file);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedFile || !documentConceptUuid || !formData.locationUuid || !providerUuid) {
            alert('Missing file, location, or system context. Cannot upload.');
            return;
        }

        setIsSubmitting(true);

        try {
            const fileReader = new FileReader();
            fileReader.readAsDataURL(selectedFile);

            const fileBase64 = await new Promise<string>((resolve, reject) => {
                fileReader.onload = () => {
                    const base64String = (fileReader.result as string).split(',')[1];
                    resolve(base64String);
                };
                fileReader.onerror = (error) => reject(error);
            });
            
            const payload = {
                patientUuid: patientUuid,
                documentConceptUuid: documentConceptUuid,
                fileBase64: fileBase64,
                fileName: selectedFile.name,
                fileMimeType: selectedFile.type,
                comment: formData.comment,
                locationUuid: formData.locationUuid,
                providerUuid: providerUuid,
            };

            await uploadPatientAttachment(payload);
            
            alert(`File "${selectedFile.name}" uploaded successfully.`);
            setRefreshKey(prevKey => prevKey + 1); 
            
            setIsFormVisible(false);
            setSelectedFile(null);
            setFormData(prev => ({ ...prev, comment: '' }));

        } catch (error: any) {
            console.error('File upload failed:', error);
            alert(`File upload failed: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const NewAttachmentForm = () => (
        <div className="bg-white border border-blue-200 rounded-lg p-6 shadow-md mb-8">
            <h3 className="text-xl font-semibold text-blue-700 mb-4 flex items-center">
                <Upload className="w-5 h-5 mr-2" /> Upload New Clinical Document
            </h3>
            
            {isLoadingContext ? (
                <div className="text-center p-4 text-gray-600">
                    <Loader2 className="w-5 h-5 mx-auto animate-spin" />
                    Preparing upload context...
                </div>
            ) : !documentConceptUuid || !providerUuid ? (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    **Critical Error**: System configuration (Clinical Document concept or Provider ID) is missing. Upload is disabled.
                </div>
            ) : (
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select File (Max {MAX_FILE_SIZE_MB}MB)</label>
                            <input
                                type="file"
                                onChange={handleFileChange}
                                className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                required
                                disabled={isSubmitting}
                                accept=".pdf, .jpg, .jpeg, .png, .doc, .docx" 
                            />
                            {selectedFile && (
                                <p className="mt-1 text-xs text-gray-600 flex items-center">
                                    <FileText className="w-3 h-3 mr-1" />
                                    Selected: **{selectedFile.name}** ({Math.round(selectedFile.size / 1024)} KB)
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Clinic/Location of Documentation</label>
                            <select
                                value={formData.locationUuid}
                                onChange={(e) => setFormData({ ...formData, locationUuid: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                                disabled={isSubmitting}
                            >
                                <option value="">Select Location</option>
                                {locationOptions.map(loc => (
                                    <option key={loc.uuid} value={loc.uuid}>{loc.display}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Comment / Description</label>
                        <textarea
                            value={formData.comment}
                            onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={2}
                            placeholder="e.g., Scanned consent form for surgery, External consultant report from Q3 2024."
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsFormVisible(false)}
                            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                            disabled={isSubmitting}
                        >
                            <X className='w-4 h-4 inline mr-1'/> Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center"
                            disabled={isSubmitting || !selectedFile || !formData.locationUuid}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" /> Upload Document
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );


    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-extrabold text-gray-900 border-b pb-2">
                Clinical Documents & Attachments
            </h1>
            
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                    <FolderOpen className="w-6 h-6 mr-2" /> Document List
                </h2>
                <button
                    onClick={() => setIsFormVisible(prev => !prev)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow-md hover:bg-blue-700 transition duration-150"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    {isFormVisible ? 'Hide Upload Form' : 'Upload New Document'}
                </button>
            </div>

            {isFormVisible && <NewAttachmentForm />}

            <AttachmentList 
                patientUuid={patientUuid} 
                refreshKey={refreshKey}
            />
        </div>
    );
}