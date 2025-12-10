// components/billing/UnifiedDashboard.tsx
'use client';

import React, { useState } from 'react';
import CreateBillableItemForm from '@/components/billing/CreateBillableItemForm';
import DepartmentForm from '@/components/billing/createDepartmentForm';
import CreateServiceForm from '@/components/billing/CreateServiceForm';
import EditServiceForm from './EditServiceForm';
import { PaymentMode } from '@/lib/billing/getPaymentModes';
import { ServiceType } from '@/lib/billing/getServiceTypes';
import { CashierDepartment } from '@/lib/billing/services/billingServices';
import EditBillableItemForm from './EditBillableItemForm';
import EditDepartmentForm from './EditDepartmentForm';

// Define types based on your existing code
interface CashierService {
  service_id: number;
  service_name: string;
  short_name: string;
  service_type?: string;
  service_status: 'ENABLED' | 'DISABLED';
  prices?: string;
}

interface CashierItem {
  item_id: number;
  name: string;
  description: string;
  department_id: number;
  default_price_id: number | null;
  uuid: string;
  price?: number;
  department_name?: string;
}

interface UnifiedDashboardProps {
  departments: CashierDepartment[];
  services: CashierService[];
  billableItems: CashierItem[];
  serviceTypes: ServiceType[];
  paymentModes: PaymentMode[];
  handleCreateItemAction: (formData: FormData) => Promise<void>;
  handleCreateDepartmentAction: (formData: FormData) => Promise<void>;
  handleCreateServiceAction: (data: {
    serviceName: string;
    departmentId: number;
    initialPrice: number;
    shortName: string;
    itemDescription: string | null;
    serviceTypeId: number | null;
    paymentModeId: number | null;
  }) => Promise<void>;
  handleEditServiceAction: (data: {
    service_id: number;
    name?: string;
    short_name?: string;
    service_type?: number | null;
    service_status?: string;
  }) => Promise<void>;
  handleDeleteServiceAction: (data: {
    service_id: number;
    void_reason?: string;
  }) => Promise<void>;
  handleEditDepartmentAction: (data: {
    department_id: number;
    name?: string;
    description?: string | null;
  }) => Promise<void>;
  handleDeleteDepartmentAction: (data: {
    department_id: number;
    retire_reason?: string;
  }) => Promise<void>;
  handleEditItemAction: (data: {
    item_id: number;
    name?: string;
    description?: string | null;
    department_id?: number;
    prices?: Array<{
      price: number;
      payment_mode?: number | null;
      price_name?: string;
    }>;
  }) => Promise<void>;
  handleDeleteItemAction: (data: {
    item_id: number;
    retire_reason?: string;
  }) => Promise<void>;
}

type TabType = 'services' | 'billable-items' | 'departments';

export default function UnifiedDashboard({
  departments,
  services = [],
  billableItems = [],
  serviceTypes = [],
  paymentModes = [],
  handleCreateItemAction,
  handleCreateDepartmentAction,
  handleCreateServiceAction,
  handleDeleteServiceAction,
  handleEditServiceAction,
  handleEditDepartmentAction,
  handleDeleteDepartmentAction,
  handleEditItemAction,
  handleDeleteItemAction
}: UnifiedDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('services');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'department' | 'service' | 'billable-item' | null>(null);
  const [editingService, setEditingService] = useState<CashierService | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [editingDepartment, setEditingDepartment] = useState<CashierDepartment | null>(null);
  const [editingItem, setEditingItem] = useState<CashierItem | null>(null);
  const [editDepartmentModalOpen, setEditDepartmentModalOpen] = useState(false);
  const [editItemModalOpen, setEditItemModalOpen] = useState(false);

  const openModal = (type: 'department' | 'service' | 'billable-item') => {
    setModalType(type);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType(null);
  };

  const openEditModal = (service: CashierService) => {
    setEditingService(service);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditingService(null);
    setEditModalOpen(false);
  };

  const confirmDelete = async (service: CashierService) => {
    if (window.confirm(`Are you sure you want to delete "${service.service_name}"? This action cannot be undone.`)) {
      try {
        await handleDeleteServiceAction({
          service_id: service.service_id,
          void_reason: 'Deleted via dashboard'
        });
      } catch (error) {
        console.error('Failed to delete service:', error);
      }
    }
  };

  const confirmDeleteDepartment = async (department: CashierDepartment) => {
    if (window.confirm(`Are you sure you want to delete "${department.name}"? This action cannot be undone.`)) {
      try {
        await handleDeleteDepartmentAction({
          department_id: department.department_id,
          retire_reason: 'Deleted via dashboard'
        });
      } catch (error) {
        console.error('Failed to delete department:', error);
      }
    }
  };

  const confirmDeleteItem = async (item: CashierItem) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`)) {
      try {
        await handleDeleteItemAction({
          item_id: item.item_id,
          retire_reason: 'Deleted via dashboard'
        });
      } catch (error) {
        console.error('Failed to delete item:', error);
      }
    }
  };

  const openEditDepartmentModal = (department: CashierDepartment) => {
    setEditingDepartment(department);
    setEditDepartmentModalOpen(true);
  };

  const closeEditDepartmentModal = () => {
    setEditingDepartment(null);
    setEditDepartmentModalOpen(false);
  };

  const openEditItemModal = (item: CashierItem) => {
    setEditingItem(item);
    setEditItemModalOpen(true);
  };

  const closeEditItemModal = () => {
    setEditingItem(null);
    setEditItemModalOpen(false);
  };

  // Helper function to render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'services':
        return <ServicesTable 
          services={services} 
          onEdit={openEditModal} 
          onDelete={confirmDelete} 
        />;
      
      case 'billable-items':
        return <BillableItemsTable 
          items={billableItems} 
          onEdit={openEditItemModal} 
          onDelete={confirmDeleteItem} 
        />;
      
      case 'departments':
        return <DepartmentsTable 
          departments={departments} 
          onEdit={openEditDepartmentModal} 
          onDelete={confirmDeleteDepartment} 
        />;
      
      default:
        return null;
    }
  };

  const renderActionButton = () => {
    switch (activeTab) {
      case 'services':
        return (
          <button
            onClick={() => openModal('service')}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
          >
            Add New Service
          </button>
        );
      
      case 'billable-items':
        return (
          <button
            onClick={() => openModal('billable-item')}
            className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm shadow-sm"
          >
            Add New Billable Item
          </button>
        );
      
      case 'departments':
        return (
          <button
            onClick={() => openModal('department')}
            className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm shadow-sm"
          >
            Add New Department
          </button>
        );
      
      default:
        return null;
    }
  };

  const renderModalContent = () => {
    if (!modalType) return null;

    switch (modalType) {
      case 'service':
        return (
          <CreateServiceForm 
            departments={departments}
            serviceTypes={serviceTypes}
            paymentModes={paymentModes}
            createAction={async (data) => {
              await handleCreateServiceAction(data);
              closeModal();
            }}
          />
        );

      
      case 'billable-item':
        return (
          <CreateBillableItemForm 
            departments={departments}
            createAction={async (formData) => {
              await handleCreateItemAction(formData);
              closeModal();
            }}
          />
        );
      
      case 'department':
        return (
          <DepartmentForm 
            createAction={async (formData) => {
              await handleCreateDepartmentAction(formData);
              closeModal();
            }}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Billing Administration</h1>
        <p className="text-gray-600 mt-1 text-sm">Manage billing services, items, and departments</p>
      </header>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div className="border-b border-gray-200 w-full">
            <nav className="-mb-px flex space-x-1">
              <TabButton
                isActive={activeTab === 'services'}
                onClick={() => setActiveTab('services')}
                count={services.length}
              >
                Services
              </TabButton>
              <TabButton
                isActive={activeTab === 'billable-items'}
                onClick={() => setActiveTab('billable-items')}
                count={billableItems.length}
              >
                Billable Items
              </TabButton>
              <TabButton
                isActive={activeTab === 'departments'}
                onClick={() => setActiveTab('departments')}
                count={departments.length}
              >
                Departments
              </TabButton>
            </nav>
          </div>
          <div className="ml-4">
            {renderActionButton()}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {renderTabContent()}
      </main>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
            onClick={closeModal}
          />
          
          {/* Modal Container */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {modalType === 'service' && 'Create New Service'}
                    {modalType === 'billable-item' && 'Create New Billable Item'}
                    {modalType === 'department' && 'Create New Department'}
                  </h3>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6">
                {renderModalContent()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {editModalOpen && editingService && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
            onClick={closeEditModal}
          />
          
          {/* Modal Container */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Edit Service: {editingService.service_name}
                  </h3>
                  <button
                    onClick={closeEditModal}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <EditServiceForm 
                  service={editingService}
                  serviceTypes={serviceTypes}
                  paymentModes={paymentModes}
                  updateAction={async (data) => {
                    await handleEditServiceAction(data);
                    closeEditModal();
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {editDepartmentModalOpen && editingDepartment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
            onClick={closeEditDepartmentModal}
          />
          
          {/* Modal Container */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Edit Department: {editingDepartment.name}
                  </h3>
                  <button
                    onClick={closeEditDepartmentModal}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <EditDepartmentForm 
                  department={{
                    ...editingDepartment,
                    description: editingDepartment.description ?? undefined
                  }}
                  updateAction={async (data) => {
                    await handleEditDepartmentAction(data);
                    closeEditDepartmentModal();
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {/* Edit Item Modal */}
      {editItemModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
            onClick={closeEditItemModal}
          />
          
          {/* Modal Container */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Edit Item: {editingItem.name}
                  </h3>
                  <button
                    onClick={closeEditItemModal}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <EditBillableItemForm 
                  item={editingItem}
                  departments={departments}
                  paymentModes={paymentModes}
                  updateAction={async (data) => {
                    await handleEditItemAction(data);
                    closeEditItemModal();
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Services Table Component (now inside main component)
function ServicesTable({ 
  services, 
  onEdit, 
  onDelete 
}: { 
  services: CashierService[]; 
  onEdit: (service: CashierService) => void; 
  onDelete: (service: CashierService) => void; 
}) {
  if (!services || services.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-gray-500">No services defined yet.</p>
        <p className="text-sm text-gray-400 mt-1">Create your first service to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Service Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Short Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Service Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Service Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Prices
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {services.map((service) => (
            <tr key={service.service_id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="font-medium text-gray-900">{service.service_name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {service.short_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-600">
                  {service.service_type || '—'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`
                  inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${service.service_status === 'ENABLED' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                  }
                `}>
                  {service.service_status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {service.prices || 'No prices'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div className="flex space-x-2">
                  <button
                    onClick={() => onEdit(service)}
                    className="text-blue-600 hover:text-blue-900 font-medium hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(service)}
                    className="text-red-600 hover:text-red-900 font-medium hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Tab Button Component
function TabButton({ 
  children, 
  isActive, 
  onClick,
  count
}: { 
  children: React.ReactNode; 
  isActive: boolean; 
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative py-3 px-4 font-medium text-sm whitespace-nowrap
        ${isActive
          ? 'text-blue-600 border-b-2 border-blue-600'
          : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }
        transition-colors duration-200
      `}
    >
      {children}
      {count !== undefined && (
        <span className={`
          ml-2 px-2 py-0.5 text-xs rounded-full
          ${isActive 
            ? 'bg-blue-100 text-blue-700' 
            : 'bg-gray-100 text-gray-600'
          }
        `}>
          {count}
        </span>
      )}
    </button>
  );
}

// Billable Items Table Component
function BillableItemsTable({ 
  items, 
  onEdit, 
  onDelete 
}: { 
  items: CashierItem[]; 
  onEdit: (item: CashierItem) => void; 
  onDelete: (item: CashierItem) => void; 
}) {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-500">No billable items defined yet.</p>
        <p className="text-sm text-gray-400 mt-1">Create your first billable item to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Department
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Price
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item) => (
            <tr key={item.item_id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4">
                <div className="font-medium text-gray-900">{item.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  ID: {item.item_id}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {item.department_name}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-lg font-semibold text-gray-900">
                  ${item.price}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div className="flex space-x-2">
                  <button
                    onClick={() => onEdit(item)}
                    className="text-blue-600 hover:text-blue-900 font-medium hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(item)}
                    className="text-red-600 hover:text-red-900 font-medium hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Departments Table Component
function DepartmentsTable({ 
  departments, 
  onEdit, 
  onDelete 
}: { 
  departments: CashierDepartment[]; 
  onEdit: (department: CashierDepartment) => void; 
  onDelete: (department: CashierDepartment) => void; 
}) {
  if (!departments || departments.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <p className="text-gray-500">No departments defined yet.</p>
        <p className="text-sm text-gray-400 mt-1">Create your first department to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Department
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Description
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {departments.map((dept) => (
            <tr key={dept.department_id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4">
                <div className="font-medium text-gray-900">{dept.name}</div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-600 max-w-md">
                  {dept.description || 'No description provided'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {dept.department_id}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div className="flex space-x-2">
                  <button
                    onClick={() => onEdit(dept)}
                    className="text-blue-600 hover:text-blue-900 font-medium hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(dept)}
                    className="text-red-600 hover:text-red-900 font-medium hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}