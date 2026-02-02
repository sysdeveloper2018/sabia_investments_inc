
export enum PropertyType {
    SINGLE_FAMILY = 'Single Family',
    MULTI_FAMILY = 'Multi-Family',
    COMMERCIAL = 'Commercial',
    LAND = 'Land'
}

export enum WorkStatus {
    PENDING = 'Pending',
    IN_PROGRESS = 'In Progress',
    COMPLETED = 'Completed',
    DELAYED = 'Delayed'
}

export enum ContactRole {
    CONTRACTOR = 'Contractor',
    BUYER = 'Buyer',
    INVESTOR = 'Investor',
    LAWYER = 'Lawyer',
    AGENT = 'Real Estate Agent',
    TENANT = 'Tenant'
}

export interface Contractor {
    id: string;
    businessName: string;
    contactName: string;
    email: string;
    phone: string;
    specialty: string;
    taxId?: string; // Optional for privacy in demo
    insuranceExpiry?: string;
    notes?: string;
}

export interface WorkItem {
    id: string;
    propertyId: string;
    contractorId: string; // Links to Contractor
    description: string;
    category: string; // e.g., Plumbing, Electrical
    estimatedCost: number;
    actualCost: number;
    status: WorkStatus;
    isBundle: boolean; // If true, represents a bundle of smaller tasks
    startDate: string;
    completionDate?: string;
}

export interface CommunicationLog {
    id: string;
    propertyId: string;
    contactId: string; // Could be contractor or external contact
    contactRole: ContactRole;
    date: string;
    type: 'Email' | 'Call' | 'Meeting' | 'Text';
    summary: string;
    followUpRequired: boolean;
}

export interface PropertyDocument {
    id: string;
    propertyId: string;
    name: string;
    type: string; // 'PDF', 'Image', 'Contract'
    uploadDate: string;
    data?: string; // Base64 content
}

export interface RepairItem {
    id: string;
    description: string;
    cost: number;
}

export interface LinkItem {
    id: string;
    title: string;
    url: string;
}

export interface Property {
    id: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    type: PropertyType;
    purchasePrice: number;
    purchaseDate: string;
    sqFt: number;
    beds?: number;
    baths?: number;
    yearBuilt?: number;
    
    // Financials
    estimatedRepairCost: number; // Initial estimate
    afterRepairValue: number; // (ARV)
    annualTaxes: number;
    insuranceCost: number;
    
    // New Fields from CSV
    zestimate?: number;
    listingUrl?: string;
    lotSize?: string;
    hasGarage?: boolean;
    parkingCapacity?: number;
    parkingFeatures?: string;
    stories?: number;
    roofType?: string;
    constructionMaterials?: string;
    flooring?: string;
    appliances?: string;
    heatingType?: string;
    coolingType?: string;
    sewer?: string;
    waterSource?: string;
    hasPool?: boolean;
    poolFeatures?: string;
    zoning?: string;
    lotFeatures?: string;

    // Improvements (Historical)
    improvements?: string[];
    
    // Renovation Budget (Future/Current)
    repairDetails?: RepairItem[];
    
    // Custom User Links
    customLinks?: LinkItem[];

    // Status
    status: 'Acquisition' | 'Rehab' | 'Listed' | 'Sold' | 'Held';
    imageUrl?: string;
    galleryImages?: string[]; // Array of base64 strings or URLs
    documents?: PropertyDocument[];
    
    // Additional Property Information
    mlsId?: string; // MLS Listing ID
    parcelId?: string; // Parcel/Tax ID
    schoolDistrict?: string; // School District
    hoaFee?: number; // Monthly HOA fee
    hoaName?: string; // HOA Company/Name
    electricCompany?: string; // Electric utility provider
    gasCompany?: string; // Gas utility provider
    waterCompany?: string; // Water utility provider
    internetProvider?: string; // Internet service provider
    additionalFeatures?: string[]; // Additional property features
}

// -- New Types for Notifications --
export interface EmailPayload {
    to: string;
    subject: string;
    body: string;
    attachment?: Blob; // The screenshot image data
}

export interface SmsPayload {
    to: string;
    message: string;
}