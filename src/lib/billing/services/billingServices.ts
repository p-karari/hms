// /services/billingServices.ts

// --- 1. TYPE DEFINITIONS ---

// Represents a single billable item
export interface CashierItem {
  item_id: number;
  name: string;
  description: string;
  department_id: number;
  default_price_id: number | null;
  uuid: string;
  // Audit fields are omitted for brevity but are present in the table
}

// Represents a department (e.g., Lab, Pharmacy)
export interface CashierDepartment {
  department_id: number;
  name: string;
  description: string | null;
  uuid: string;
}

// Represents a specific price for an item
export interface CashierItemPrice {
  item_price_id: number;
  item_id: number | null;
  service_id: number | null; // Nullable, as not every item maps to a core OpenMRS service
  price: number; // Stored as DECIMAL(10,2) in MySQL
  payment_mode: number | null; // Links to cashier_payment_mode table
  name: string | null; // Optional price name (e.g., 'Normal Rate', 'Insurance Rate')
  uuid: string;
}

export interface ServiceDisplay {
  service_id: number;
  service_name: string;
  short_name: string;
  service_type: string; // You'll need to map IDs to names
  service_status: 'ENABLED' | 'DISABLED' | string;
  prices: string; // This will come from joined price data
}

export interface ServiceType {
  type_id: number;
  type_name: string;
}

export interface CashierBillableService {
  service_id: number;
  name: string;
  short_name: string | null;
  service_type: number | null;
  service_category: number | null;
  service_status: string | null;
  creator: number;
  date_created: Date;
  changed_by: number | null;
  date_changed: Date | null;
  voided: boolean;
  voided_by: number | null;
  date_voided: Date | null;
  void_reason: string | null;
  uuid: string;
  concept_id: number | null;
}