// app/billing/admin/page.tsx
import { 
  getAllDepartments, 
  getAllBillableItems,
  createBillableItem,
  createDepartment,

} from '@/lib/billing/manageBillableServices';
import { createFullBillableServiceAndConcept } from '@/lib/billing/createFullBillableServiceAndConcept';
import { deleteBillableService, voidServicePrices } from '@/lib/billing/deleteBillableService';
import { getServiceTypes } from '@/lib/billing/getServiceTypes';
import { getPaymentModes } from '@/lib/billing/getPaymentModes';
import { revalidatePath } from 'next/cache';
import { editBillableService, updateServicePrices } from '@/lib/billing/editBillableServices';
import UnifiedDashboard from '@/components/billing/BillingPageDashboard';
import { getAllBillableServices } from '@/lib/billing/getAllBillableServices';
import { editBillableItem, deleteBillableItem } from '@/lib/billing/manageBillableItems';
import { editDepartment, deleteDepartment } from '@/lib/billing/manageDepartments';

export const dynamic = 'force-dynamic';

export default async function BillingAdminPage() {
  // Fetch all required data
  const [departments, billableItems, services, serviceTypes, paymentModes] = await Promise.all([
    getAllDepartments(),
    getAllBillableItems(),
    getAllBillableServices(),
    getServiceTypes(), 
    getPaymentModes(), 
  ]);

  // Define server actions
  async function handleCreateItemAction(formData: FormData) {
    'use server';
    
    const name = formData.get('name') as string;
    const departmentId = parseInt(formData.get('departmentId') as string);
    const initialPrice = parseFloat(formData.get('price') as string);
    const description = formData.get('description') as string | null;
    const creatorId = 1; // Replace with actual user ID mechanism

    try {
      await createBillableItem(name, departmentId, initialPrice, creatorId, description);
      revalidatePath('/billing/admin');
    } catch (error) {
      console.error('Failed to create billable item:', error);
      throw error;
    }
  }

  async function handleCreateDepartmentAction(formData: FormData) {
    'use server';

    const name = formData.get('name') as string;
    const description = formData.get('description') as string | null;
    const creatorId = 1; // Replace with actual user ID mechanism

    if (!name) {
      console.error("Department name is required.");
      return;
    }

    try {
      await createDepartment(name, description, creatorId);
      revalidatePath('/billing/admin');
    } catch (error) {
      console.error('Failed to create department:', error);
      throw error;
    }
  }

  async function handleCreateServiceAction(data: {
    serviceName: string;
    departmentId: number;
    initialPrice: number;
    shortName: string;
    itemDescription: string | null;
    serviceTypeId: number | null;
    paymentModeId: number | null;
  }) {
    'use server';

    const creatorId = 1; // Replace with actual user ID mechanism

    try {
      await createFullBillableServiceAndConcept(
        data.serviceName,
        data.departmentId,
        data.initialPrice,
        creatorId,
        data.shortName,
        data.itemDescription,
        data.serviceTypeId,
        data.paymentModeId,
        'Default Price'
      );
      revalidatePath('/billing/admin');
    } catch (error) {
      console.error('Failed to create full billable service:', error);
      throw new Error("Failed to create the service.");
    }
  }

  async function handleEditServiceAction(data: {
    service_id: number;
    name?: string;
    short_name?: string;
    service_type?: number | null;
    service_status?: string;
    prices?: Array<{
      price: number;
      payment_mode?: number | null;
      price_name?: string;
    }>;
  }) {
    'use server';
    
    const changed_by = 1; // Replace with actual user ID mechanism
    const creatorId = 1; // Same user for price updates

    try {
      // Update the service details
      if (data.name || data.short_name || data.service_type !== undefined || data.service_status) {
        await editBillableService({
          service_id: data.service_id,
          name: data.name,
          short_name: data.short_name,
          service_type: data.service_type,
          service_status: data.service_status,
          changed_by
        });
      }
      
      // Update prices if provided
      if (data.prices && data.prices.length > 0) {
        await updateServicePrices(data.service_id, data.prices, creatorId);
      }
      
      revalidatePath('/billing/admin');
    } catch (error) {
      console.error('Failed to edit service:', error);
      throw error;
    }
  }

  async function handleDeleteServiceAction(data: {
    service_id: number;
    void_reason?: string;
  }) {
    'use server';
    
    const voided_by = 1; // Replace with actual user ID mechanism

    try {
      await deleteBillableService({
        service_id: data.service_id,
        voided_by,
        void_reason: data.void_reason
      });
      
      // Also void related prices
      await voidServicePrices(data.service_id, voided_by, data.void_reason);
      
      revalidatePath('/billing/admin');
    } catch (error) {
      console.error('Failed to delete service:', error);
      throw error;
    }
  }

  // New handler for editing department
  async function handleEditDepartmentAction(data: {
    department_id: number;
    name?: string;
    description?: string | null;
  }) {
    'use server';
    
    const changed_by = 1; // Replace with actual user ID mechanism

    try {
      await editDepartment({
        department_id: data.department_id,
        name: data.name,
        description: data.description,
        changed_by
      });
      revalidatePath('/billing/admin');
    } catch (error) {
      console.error('Failed to edit department:', error);
      throw error;
    }
  }

  // New handler for deleting department
  async function handleDeleteDepartmentAction(data: {
    department_id: number;
    retire_reason?: string;
  }) {
    'use server';
    
    const retired_by = 1; // Replace with actual user ID mechanism

    try {
      await deleteDepartment({
        department_id: data.department_id,
        retired_by,
        retire_reason: data.retire_reason
      });
      revalidatePath('/billing/admin');
    } catch (error) {
      console.error('Failed to delete department:', error);
      throw error;
    }
  }

  // New handler for editing billable item
  async function handleEditItemAction(data: {
    item_id: number;
    name?: string;
    description?: string | null;
    department_id?: number;
    prices?: Array<{
      price: number;
      payment_mode?: number | null;
      price_name?: string;
    }>;
  }) {
    'use server';
    
    const changed_by = 1; // Replace with actual user ID mechanism

    try {
      await editBillableItem({
        item_id: data.item_id,
        name: data.name,
        description: data.description,
        department_id: data.department_id,
        changed_by,
        prices: data.prices
      });
      revalidatePath('/billing/admin');
    } catch (error) {
      console.error('Failed to edit billable item:', error);
      throw error;
    }
  }

  // New handler for deleting billable item
  async function handleDeleteItemAction(data: {
    item_id: number;
    retire_reason?: string;
  }) {
    'use server';
    
    const retired_by = 1; // Replace with actual user ID mechanism

    try {
      await deleteBillableItem({
        item_id: data.item_id,
        retired_by,
        retire_reason: data.retire_reason
      });
      revalidatePath('/billing/admin');
    } catch (error) {
      console.error('Failed to delete billable item:', error);
      throw error;
    }
  }

  return (
    <UnifiedDashboard
      departments={departments}
      services={services}
      billableItems={billableItems}
      serviceTypes={serviceTypes}
      paymentModes={paymentModes}
      handleCreateItemAction={handleCreateItemAction}
      handleCreateDepartmentAction={handleCreateDepartmentAction}
      handleCreateServiceAction={handleCreateServiceAction}
      handleEditServiceAction={handleEditServiceAction}
      handleDeleteServiceAction={handleDeleteServiceAction}
      handleEditDepartmentAction={handleEditDepartmentAction}
      handleDeleteDepartmentAction={handleDeleteDepartmentAction}
      handleEditItemAction={handleEditItemAction}
      handleDeleteItemAction={handleDeleteItemAction}
    />
  );
}