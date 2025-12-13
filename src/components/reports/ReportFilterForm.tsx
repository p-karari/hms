'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { OpenMrsLocation } from '@/lib/location/location';
import { PaymentModeOption } from '@/lib/reports/paymentModeReport';
import { PatientReportParams } from '@/lib/reports/types';
import { CodedValue } from '@/lib/patients/getVisitTypes';
import { Calendar, Filter, X, ChevronDown, ChevronUp, Users, FileText, DollarSign, Check, Search, User, MapPin, Pill, Activity } from 'lucide-react';

interface ReportOptions {
    visitTypes: CodedValue[];
    locations: OpenMrsLocation[];
    paymentModes: PaymentModeOption[];
}

interface ReportFilterFormProps {
    initialParams: PatientReportParams;
    options: ReportOptions;
}

// Updated Input Field to match design system
const InputField = ({ label, name, type = 'text', value, onChange, icon: Icon }: any) => (
    <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">
            {label}
        </label>
        <div className="relative">
            {Icon && (
                <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            )}
            <input
                name={name}
                type={type}
                value={value || ''}
                onChange={onChange}
                className={`w-full ${Icon ? 'pl-10' : 'pl-3'} pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white text-sm`}
                placeholder={`Enter ${label.toLowerCase()}`}
            />
        </div>
    </div>
);

// Updated Select Component
const SelectField = ({ 
    label, 
    name, 
    value, 
    onChange, 
    options, 
    icon: Icon,
    multiple = false 
}: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleClickOutside = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
            setIsOpen(false);
            setSearch('');
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionId: string) => {
        if (multiple) {
            const current = Array.isArray(value) ? value : [];
            const newValue = current.includes(optionId)
                ? current.filter(id => id !== optionId)
                : [...current, optionId];
            onChange({ target: { name, value: newValue } });
        } else {
            onChange({ target: { name, value: optionId } });
            setIsOpen(false);
            setSearch('');
        }
    };

    const filteredOptions = options.filter((opt: any) => 
        (opt.display || opt.name || opt.id).toLowerCase().includes(search.toLowerCase())
    );

    const selectedLabels = multiple 
        ? options.filter((opt: any) => value?.includes(opt.id)).map((opt: any) => opt.display || opt.name).join(', ')
        : options.find((opt: any) => opt.id === value)?.display || '';

    return (
        <div className="space-y-1.5 relative" ref={dropdownRef}>
            <label className="text-sm font-medium text-gray-700">
                {label}
            </label>
            
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg bg-white text-left flex justify-between items-center hover:border-gray-400 transition-colors text-sm"
                >
                    <span className="truncate">
                        {multiple 
                            ? value?.length ? `${value.length} selected` : `Select ${label.toLowerCase()}...`
                            : selectedLabels || `Select ${label.toLowerCase()}...`
                        }
                    </span>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {Icon && (
                    <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                )}
            </div>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    <div className="p-3 border-b border-gray-200 bg-gray-50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                autoFocus
                            />
                        </div>
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <div className="p-3 text-sm text-gray-500 text-center">
                                No options found
                            </div>
                        ) : (
                            filteredOptions.map((option: any) => {
                                const isSelected = multiple 
                                    ? value?.includes(option.id)
                                    : value === option.id;
                                
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => handleSelect(option.id)}
                                        className="w-full p-3 text-left flex items-center gap-3 hover:bg-gray-50 text-sm border-b border-gray-100 last:border-b-0"
                                    >
                                        <div className={`w-4 h-4 border rounded flex items-center justify-center 
                                            ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                            {isSelected && <Check size={10} className="text-white" />}
                                        </div>
                                        <span className="truncate">{option.display || option.name}</span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {multiple && value?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {options
                        .filter((opt: any) => value.includes(opt.id))
                        .map((opt: any) => (
                            <span key={opt.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                {opt.display || opt.name}
                                <button
                                    type="button"
                                    onClick={() => handleSelect(opt.id)}
                                    className="p-0.5 hover:bg-blue-200 rounded-full transition-colors"
                                >
                                    <X size={10} />
                                </button>
                            </span>
                        ))}
                </div>
            )}
        </div>
    );
};

export default function ReportFilterForm({ initialParams, options }: ReportFilterFormProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [params, setParams] = useState<PatientReportParams>(initialParams);
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        setParams(initialParams);
    }, [initialParams]);

    const handleChange = (e: any) => {
        const { name, value, type } = e.target;
        setParams(prev => ({
            ...prev,
            [name]: type === 'number' && value ? Number(value) : value || undefined
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newParams = new URLSearchParams();
        
        Object.entries(params).forEach(([key, value]) => {
            if (!value && key !== 'startDate' && key !== 'endDate') return;
            
            if (Array.isArray(value)) {
                value.forEach(v => newParams.append(key, v.toString()));
            } else if (value) {
                newParams.set(key, value.toString());
            }
        });

        if (!params.startDate) newParams.set('startDate', '');
        if (!params.endDate) newParams.set('endDate', '');

        router.replace(`?${newParams.toString()}`, { scroll: false });
    };

    const handleClear = () => {
        const clearedParams = {
            startDate: initialParams.startDate,
            endDate: initialParams.endDate,
        };
        setParams(clearedParams);
        router.replace(`?startDate=${clearedParams.startDate}&endDate=${clearedParams.endDate}`, { scroll: false });
    };

    const formOptions = {
        visitTypes: options.visitTypes.map(v => ({ id: v.uuid, display: v.display })),
        locations: options.locations.map(l => ({ id: l.uuid, display: l.display })),
        paymentModes: options.paymentModes.map(p => ({ id: p.id, display: p.name })),
        genders: [
            { id: 'M', display: 'Male' },
            { id: 'F', display: 'Female' },
            { id: 'O', display: 'Other' }
        ]
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Report Filters</h2>
                </div>
                <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                    {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
                </button>
            </div>

            {/* Basic Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                <InputField 
                    label="Start Date" 
                    name="startDate" 
                    type="date" 
                    value={params.startDate} 
                    onChange={handleChange} 
                    icon={Calendar} 
                />
                <InputField 
                    label="End Date" 
                    name="endDate" 
                    type="date" 
                    value={params.endDate} 
                    onChange={handleChange} 
                    icon={Calendar} 
                />
                <SelectField 
                    label="Visit Type" 
                    name="visitTypeIds" 
                    value={params.visitTypeIds} 
                    onChange={handleChange} 
                    options={formOptions.visitTypes} 
                    icon={Activity} 
                    multiple 
                />
                <SelectField 
                    label="Location" 
                    name="locationIds" 
                    value={params.locationIds} 
                    onChange={handleChange} 
                    options={formOptions.locations} 
                    icon={MapPin} 
                    multiple 
                />
            </div>

            {/* Advanced Filters - Animated Transition */}
            {showAdvanced && (
                <div className="border-t border-gray-200 pt-6 mb-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Additional Filters
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        <InputField 
                            label="Patient Name" 
                            name="fullName" 
                            value={params.fullName} 
                            onChange={handleChange} 
                            icon={User} 
                        />
                        <SelectField 
                            label="Gender" 
                            name="gender" 
                            value={params.gender} 
                            onChange={handleChange} 
                            options={formOptions.genders} 
                            icon={Users} 
                        />
                        <InputField 
                            label="Min Age" 
                            name="minAge" 
                            type="number" 
                            value={params.minAge} 
                            onChange={handleChange} 
                            icon={Users} 
                        />
                        <InputField 
                            label="Max Age" 
                            name="maxAge" 
                            type="number" 
                            value={params.maxAge} 
                            onChange={handleChange} 
                            icon={Users} 
                        />
                        <InputField 
                            label="Diagnosis" 
                            name="diagnosisQuery" 
                            value={params.diagnosisQuery} 
                            onChange={handleChange} 
                            icon={FileText} 
                        />
                        <InputField 
                            label="Prescription" 
                            name="prescriptionQuery" 
                            value={params.prescriptionQuery} 
                            onChange={handleChange} 
                            icon={Pill} 
                        />
                        <SelectField 
                            label="Payment Mode" 
                            name="paymentMethod" 
                            value={params.paymentMethod} 
                            onChange={handleChange} 
                            options={formOptions.paymentModes} 
                            icon={DollarSign} 
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <InputField 
                                label="Min Bill" 
                                name="minBillAmount" 
                                type="number" 
                                value={params.minBillAmount} 
                                onChange={handleChange} 
                                icon={DollarSign} 
                            />
                            <InputField 
                                label="Max Bill" 
                                name="maxBillAmount" 
                                type="number" 
                                value={params.maxBillAmount} 
                                onChange={handleChange} 
                                icon={DollarSign} 
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                    type="button"
                    onClick={handleClear}
                    className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm flex items-center gap-2"
                >
                    <X size={16} />
                    Clear Filters
                </button>
                <button
                    type="submit"
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2"
                >
                    <Filter size={16} />
                    Apply Filters
                </button>
            </div>
        </form>
    );
}