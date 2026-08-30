/**
 * DWIP Enterprise - Tata Motors Service Advisor (TMSA-CV) Microservice Endpoints
 * 
 * Official production microservices catalog for Tata Motors CV Service Advisor & Trailer Advisor platforms.
 */

export const TMSA_PRODUCTION_BASE_URL = "https://mobility-cv-prod-microservices.api.tatamotors";

export const TMSA_MICROSERVICE_ENDPOINTS = {
  // Service Advisor (SA) Microservices
  BILLING_TYPE_MASTER: "/api/tmsa-cv/sa/billing-type-master/",
  COMPLAINT_CODE_MASTER: "/api/tmsa-cv/sa/complaint-code-master/",
  FAULT_CODE_MASTER: "/api/tmsa-cv/sa/fault-code-master/",
  VEHICLE_INVENTORY: "/api/tmsa-cv/sa/vehicle-inventory/",
  FENCE_IN_UPLOAD: "/api/tmsa-cv/sa/upload-image/",
  CRM_IMAGE_UPLOAD: "/api/tmsa-cv/sa/image-upload-in-crm/",
  MEDIA_UPLOAD_SA: "/api/tmsa-cv/sa/media-upload/",

  // Trailer Advisor (TA) Microservices
  MEDIA_UPLOAD_TA: "/api/tmsa-cv/ta/media-upload/",
} as const;

export type TmsaEndpointKey = keyof typeof TMSA_MICROSERVICE_ENDPOINTS;

export interface TmsaEndpointSpec {
  key: TmsaEndpointKey;
  name: string;
  category: "master" | "inventory" | "upload";
  subsystem: "SA" | "TA";
  path: string;
  fullUrl: string;
  method: "GET" | "POST";
  description: string;
}

export const TMSA_ENDPOINT_CATALOG: TmsaEndpointSpec[] = [
  {
    key: "BILLING_TYPE_MASTER",
    name: "Billing Master",
    category: "master",
    subsystem: "SA",
    path: TMSA_MICROSERVICE_ENDPOINTS.BILLING_TYPE_MASTER,
    fullUrl: `${TMSA_PRODUCTION_BASE_URL}${TMSA_MICROSERVICE_ENDPOINTS.BILLING_TYPE_MASTER}`,
    method: "GET",
    description: "Fetches official billing type master definitions, labour tax rules, and invoice classification codes.",
  },
  {
    key: "COMPLAINT_CODE_MASTER",
    name: "Complaint Code",
    category: "master",
    subsystem: "SA",
    path: TMSA_MICROSERVICE_ENDPOINTS.COMPLAINT_CODE_MASTER,
    fullUrl: `${TMSA_PRODUCTION_BASE_URL}${TMSA_MICROSERVICE_ENDPOINTS.COMPLAINT_CODE_MASTER}`,
    method: "GET",
    description: "Standardized customer complaint hierarchy, symptoms, and voice-of-customer codes for CV workshop intake.",
  },
  {
    key: "FAULT_CODE_MASTER",
    name: "Fault Code",
    category: "master",
    subsystem: "SA",
    path: TMSA_MICROSERVICE_ENDPOINTS.FAULT_CODE_MASTER,
    fullUrl: `${TMSA_PRODUCTION_BASE_URL}${TMSA_MICROSERVICE_ENDPOINTS.FAULT_CODE_MASTER}`,
    method: "GET",
    description: "DTC & ECU diagnostic fault code master with standard repair mappings and warranty causal classifications.",
  },
  {
    key: "VEHICLE_INVENTORY",
    name: "Vehicle Inventory",
    category: "inventory",
    subsystem: "SA",
    path: TMSA_MICROSERVICE_ENDPOINTS.VEHICLE_INVENTORY,
    fullUrl: `${TMSA_PRODUCTION_BASE_URL}${TMSA_MICROSERVICE_ENDPOINTS.VEHICLE_INVENTORY}`,
    method: "GET",
    description: "Queries live workshop yard inventory, gate-in staging count, and chassis status in Tata TMSA.",
  },
  {
    key: "FENCE_IN_UPLOAD",
    name: "Fence In Upload",
    category: "upload",
    subsystem: "SA",
    path: TMSA_MICROSERVICE_ENDPOINTS.FENCE_IN_UPLOAD,
    fullUrl: `${TMSA_PRODUCTION_BASE_URL}${TMSA_MICROSERVICE_ENDPOINTS.FENCE_IN_UPLOAD}`,
    method: "POST",
    description: "Uploads physical gate-in & geofence perimeter entry photos (vehicle front, number plate, odometer) directly to TMSA.",
  },
  {
    key: "CRM_IMAGE_UPLOAD",
    name: "CRM Upload",
    category: "upload",
    subsystem: "SA",
    path: TMSA_MICROSERVICE_ENDPOINTS.CRM_IMAGE_UPLOAD,
    fullUrl: `${TMSA_PRODUCTION_BASE_URL}${TMSA_MICROSERVICE_ENDPOINTS.CRM_IMAGE_UPLOAD}`,
    method: "POST",
    description: "Uploads job card inspection, damaged part evidence, and customer approval documents into Tata Siebel/CRM DMS.",
  },
  {
    key: "MEDIA_UPLOAD_SA",
    name: "Media Upload",
    category: "upload",
    subsystem: "SA",
    path: TMSA_MICROSERVICE_ENDPOINTS.MEDIA_UPLOAD_SA,
    fullUrl: `${TMSA_PRODUCTION_BASE_URL}${TMSA_MICROSERVICE_ENDPOINTS.MEDIA_UPLOAD_SA}`,
    method: "POST",
    description: "General Service Advisor media upload microservice for audio notes, technician video walkthroughs, and PDFs.",
  },
  {
    key: "MEDIA_UPLOAD_TA",
    name: "Trailer Media",
    category: "upload",
    subsystem: "TA",
    path: TMSA_MICROSERVICE_ENDPOINTS.MEDIA_UPLOAD_TA,
    fullUrl: `${TMSA_PRODUCTION_BASE_URL}${TMSA_MICROSERVICE_ENDPOINTS.MEDIA_UPLOAD_TA}`,
    method: "POST",
    description: "Trailer Advisor media microservice for trailer body inspection, fifth wheel, brake system, and kingpin evidence.",
  },
];
