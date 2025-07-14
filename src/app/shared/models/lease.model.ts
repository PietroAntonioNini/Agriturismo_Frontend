export interface Lease {
    id: number;
    tenantId: number;
    apartmentId: number;
    startDate: Date;
    endDate: Date;
    monthlyRent: number;
    securityDeposit: number;
    isActive: boolean;
    paymentDueDay: number;
    termsAndConditions: string;
    specialClauses?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
    documents?: LeaseDocument[];
    paymentHistory?: LeasePayment[];
    // Campi per il contratto base
    initialUtilityReadings?: {
        electricity?: number;
        water?: number;
        gas?: number;
    };
    propertyDescription?: string;
    propertyCondition?: string;
    boilerCondition?: string;
}

// Interfaccia per il contratto base con letture utenze
export interface BaseContractData {
    lease: Lease;
    tenant: any; // Tipo Tenant
    apartment: any; // Tipo Apartment
    initialUtilityReadings?: {
        electricity?: number;
        water?: number;
        gas?: number;
    };
    propertyDescription?: string;
    propertyCondition?: string;
    boilerCondition?: string;
    securityDepositAmount?: number;
}

export interface LeaseDocument {
    id: number;
    leaseId: number;
    name: string;
    type: string;
    url: string;
    uploadDate: Date;
}

export interface LeasePayment {
    id: number;
    leaseId: number;
    amount: number;
    paymentDate: Date;
    paymentType: string;
    reference: string;
    notes?: string;
}

export interface LeaseFormData {
    tenantId: number;
    apartmentId: number;
    startDate: Date;
    endDate: Date;
    monthlyRent: number;
    securityDeposit: number;
    paymentDueDay: number;
    termsAndConditions: string;
    specialClauses?: string;
    notes?: string;
    // Aggiunti per il contratto base
    initialUtilityReadings?: {
        electricity?: number;
        water?: number;
        gas?: number;
    };
    propertyDescription?: string;
    propertyCondition?: string;
    boilerCondition?: string;
}