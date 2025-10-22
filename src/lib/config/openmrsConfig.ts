/**
 * @file src/lib/config/openmrsConfig.ts
 * Core configuration constants required for OpenMRS API interaction.
 * These values are typically fixed by the server's module implementation.
 */

// This string constant is required by the OpenMRS API to validate the structure
// of the 'dose', 'route', and 'frequency' fields in the POST payload.
// It refers to a specific Java class within the OpenMRS application layer.
export const DOSING_TYPE: string = 'org.openmrs.SimpleDosingInstructions';