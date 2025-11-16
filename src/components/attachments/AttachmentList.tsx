'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, FileText, Download } from 'lucide-react';

import { getPatientAttachments, Attachment } from '@/lib/attachments/getPatientAttachments';
import { getAuthHeaders } from '@/lib/auth/auth';
import { formatDate } from '@/lib/utils/utils'; 

interface AttachmentListProps {
    patientUuid: string;
    refreshKey: number; 
}


export default function AttachmentList({ patientUuid, refreshKey }: AttachmentListProps) {
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAttachments = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getPatientAttachments(patientUuid);
            setAttachments(data);
        } catch (e) {
            console.error("Error fetching attachments:", e);
            setError("Failed to load patient attachment history.");
            setAttachments([]);
        } finally {
            setIsLoading(false);
        }
    }, [patientUuid]);

    useEffect(() => {
        fetchAttachments();
    }, [fetchAttachments, refreshKey]);

    const handleDownload = async (attachment: Attachment) => {
        try {
            const headers = await getAuthHeaders();
            
            const downloadUrl = `${process.env.NEXT_PUBLIC_OPENMRS_API_URL}${attachment.complexDataUrl}`;

            const response = await fetch(downloadUrl, { headers });

            if (!response.ok) {
                alert(`Failed to download file: HTTP ${response.status}`);
                throw new Error("Download failed.");
            }
            
            const blob = await response.blob();
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = attachment.fileName; 
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

        } catch (e) {
            console.error("Error during download process:", e);
            alert("An error occurred while attempting to download the file.");
        }
    };

    const getFileExtension = (fileName: string) => {
        return fileName.split('.').pop()?.toUpperCase() || 'FILE';
    };

    if (error) {
        return (
            <div className="text-center p-8 border border-red-300 bg-red-50 text-red-700 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 mr-3" />
                {error}
            </div>
        );
    }

    if (isLoading && attachments.length === 0) {
        return (
            <div className="text-center p-12 text-gray-600">
                <Loader2 className="w-8 h-8 mx-auto animate-spin mb-3" />
                Loading clinical documents...
            </div>
        );
    }

    return (
        <div className="bg-white shadow-xl rounded-xl">

            {attachments.length === 0 ? (
                <div className="text-center p-8 text-gray-500 border border-dashed rounded-lg">
                    <FileText className="w-8 h-8 mx-auto mb-2" />
                    No clinical documents or attachments found for this patient.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name / Description</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document Concept</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Recorded</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {attachments.map((att) => (
                                <tr key={att.uuid} className="hover:bg-gray-50 transition duration-100">

                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 flex items-center max-w-sm truncate">
                                        <FileText className="w-5 h-5 mr-2 text-blue-500" />
                                        {att.fileName}
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        <span className="inline-flex px-3 py-1 text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {getFileExtension(att.fileName)}
                                        </span>
                                    </td>
                                    
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {att.documentType.display}
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {formatDate(att.recordedDate)}
                                    </td>
                                    
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleDownload(att)}
                                            className="text-gray-500 hover:text-blue-600 disabled:opacity-50 flex items-center justify-end"
                                            title="Download Attachment"
                                            disabled={isLoading}
                                        >
                                            <Download className="w-5 h-5 mr-1" />
                                            Download
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}