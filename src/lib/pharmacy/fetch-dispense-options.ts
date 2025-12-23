'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';

export interface DispenseOption {
  value: string;
  label: string;
  code?: string;
  system?: string;
}

export interface DispenseOptions {
  units: DispenseOption[];
  doseUnits: DispenseOption[];
  routes: DispenseOption[];
  frequencies: DispenseOption[];
  practitioners: DispenseOption[];
}

export async function fetchDispenseOptions(locationId?: string): Promise<DispenseOptions> {
  try {
    const [units, doseUnits, routes, frequencies, practitioners] = await Promise.all([
      fetchUnits(),
      fetchDoseUnits(),
      fetchRoutes(),
      fetchFrequencies(),
      fetchPractitioners()
    ]);

    return {
      units,
      doseUnits,
      routes,
      frequencies,
      practitioners
    };
  } catch (error) {
    console.error('Error fetching dispense options:', error);
    return getDefaultOptions();
  }
}

/* -----------------------------
   Static Concept Options - Updated with full UUIDs
-------------------------------- */

async function fetchUnits(): Promise<DispenseOption[]> {
  return [
    { value: '162401AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Kit', code: '162401' },
    { value: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Tablet', code: '1513' },
    { value: '162263AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Milliliter', code: '162263' },
    { value: '162399AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Each', code: '162399' },
    { value: '162396AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Capsule', code: '162396' }
  ];
}

async function fetchDoseUnits(): Promise<DispenseOption[]> {
  return [
    { value: '162376AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Application', code: '162376' },
    { value: '161553AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Milligram', code: '161553' },
    { value: '162263AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Milliliter', code: '162263' },
    { value: '162258AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Gram', code: '162258' }
  ];
}

async function fetchRoutes(): Promise<DispenseOption[]> {
  return [
    { value: '162390AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'In both eyes', code: '162390' },
    { value: '160240AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Oral', code: '160240' },
    { value: '160242AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Intravenous', code: '160242' },
    { value: '160241AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Intramuscular', code: '160241' },
    { value: '162389AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Topical', code: '162389' }
  ];
}

async function fetchFrequencies(): Promise<DispenseOption[]> {
  return [
    { value: '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Once daily', code: '160862' },
    { value: '160863AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Twice daily', code: '160863' },
    { value: '160864AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Three times daily', code: '160864' },
    { value: '160865AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Four times daily', code: '160865' },
    { value: '160858AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Every morning', code: '160858' }
  ];
}

/* -----------------------------
   Practitioner Fetch
-------------------------------- */

async function fetchPractitioners(): Promise<DispenseOption[]> {
  let headers: Record<string, string>;

  try {
    headers = {
      ...(await getAuthHeaders()),
      Accept: 'application/fhir+json'
    };
  } catch {
    redirectToLogin();
    return [{ value: 'current-user', label: 'Current User' }];
  }

  try {
    const params = new URLSearchParams({
      _summary: 'data',
      _count: '50'
    });

    const baseUrl = `${process.env.OPENMRS_API_URL_ALT}/Practitioner`;
    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });

    if (!response.ok) {
      console.warn('Failed to fetch practitioners:', response.status);
      return [{ value: 'current-user', label: 'Current User' }];
    }

    const data = await response.json();

    if (!data?.entry?.length) {
      return [{ value: 'current-user', label: 'Current User' }];
    }

    return data.entry.map((entry: any) => {
      const practitioner = entry.resource;

      const name =
        practitioner.name?.[0]?.text ||
        `${practitioner.name?.[0]?.given?.[0] || ''} ${practitioner.name?.[0]?.family || ''}`.trim();

      return {
        value: practitioner.id,
        label: name || `Practitioner ${practitioner.id}`,
        code: practitioner.identifier?.[0]?.value
      };
    });
  } catch (error) {
    console.error('Error fetching practitioners:', error);
    return [{ value: 'current-user', label: 'Current User' }];
  }
}

/* -----------------------------
   Fallback Options
-------------------------------- */

function getDefaultOptions(): DispenseOptions {
  return {
    units: [
      { value: 'kit', label: 'Kit' },
      { value: 'tablet', label: 'Tablet' },
      { value: 'ml', label: 'Milliliter' }
    ],
    doseUnits: [
      { value: 'application', label: 'Application' },
      { value: 'mg', label: 'Milligram' },
      { value: 'ml', label: 'Milliliter' }
    ],
    routes: [
      { value: 'oral', label: 'Oral' },
      { value: 'iv', label: 'Intravenous' },
      { value: 'im', label: 'Intramuscular' }
    ],
    frequencies: [
      { value: 'once-daily', label: 'Once daily' },
      { value: 'twice-daily', label: 'Twice daily' },
      { value: 'three-times-daily', label: 'Three times daily' }
    ],
    practitioners: [
      { value: 'current-user', label: 'Current User' }
    ]
  };
}