// types/lab-orders.ts
export type OrderStatus = 'IN_PROGRESS' | 'COMPLETED' | 'DECLINED' | null;

export interface OpenMRSOrder {
  uuid: string;
  orderNumber: string;
  patient: {
    uuid: string;
    display: string;
    person: {
      uuid: string;
      display: string;
      age: number;
      gender: string;
    };
  };
  concept: {
    uuid: string;
    display: string;
  };
  dateActivated: string;
  fulfillerStatus: OrderStatus;
  fulfillerComment?: string;
  urgency: 'ROUTINE' | 'STAT';
  instructions?: string;
  orderer: {
    uuid: string;
    display: string;
  };
  encounter: {
    uuid: string;
    display: string;
  };
  // Optional fields for completeness
  action?: string;
  careSetting?: any;
  orderType?: any;
}

export interface ConceptDetails {
  uuid: string;
  display: string;
  name: {
    display: string;
    uuid: string;
    name: string;
    locale: string;
    localePreferred: boolean;
    conceptNameType: string;
  };
  datatype: {
    uuid: string;
    display: string;
    name: string;
    description: string;
    hl7Abbreviation: string;
  };
  set: boolean;
  answers: Array<{
    uuid: string;
    display: string;
  }>;
  hiNormal: number | null;
  hiAbsolute: number | null;
  hiCritical: number | null;
  lowNormal: number | null;
  lowAbsolute: number | null;
  lowCritical: number | null;
  units: string | null;
  allowDecimal: boolean | null;
  setMembers: ConceptDetails[];
}

export interface LabOrderFilters {
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface LabResultField {
  conceptUuid: string;
  display: string;
  datatype: string;
  units?: string;
  allowDecimal?: boolean;
  answers?: Array<{ uuid: string; display: string }>;
  lowNormal?: number;
  hiNormal?: number;
  value?: any;
}

export interface LabResultSubmission {
  orderUuid: string;
  encounterUuid: string;
  panelConceptUuid?: string; // For panel tests
  results: LabResultField[];
  comment?: string;
}