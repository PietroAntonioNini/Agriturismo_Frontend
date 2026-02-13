export interface InitialReadings {
    electricityReadingId?: number | null;
    waterReadingId?: number | null;
    gasReadingId?: number | null;
    electricityLaundryReadingId?: number | null;
    electricityValue?: number | null;
    waterValue?: number | null;
    gasValue?: number | null;
    electricityLaundryValue?: number | null;
}

export interface LeaseCreate {
    tenantId: number;
    apartmentId: number;
    userId: number;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    securityDeposit: number;
    paymentDueDay: number;
    termsAndConditions: string;
    specialClauses?: string;
    notes?: string;
    initialReadings?: InitialReadings;
    // Campi aggiuntivi opzionali per compatibilità UI
    propertyDescription?: string;
    propertyCondition?: string;
    boilerCondition?: string;
}

export interface Lease extends LeaseCreate {
    id: number;
    isActive: boolean;
    status: 'active' | 'terminated';
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    // Baseline IDs (flat nella risposta del backend)
    electricityReadingId: number | null;
    waterReadingId: number | null;
    gasReadingId: number | null;
    electricityLaundryReadingId: number | null;
    documents?: LeaseDocument[];
    payments?: LeasePayment[];
}

export interface LeaseDocument {
    id: number;
    leaseId: number;
    userId: number;
    name: string;
    type: string;
    url: string;
    uploadDate: string;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string;
}

export interface LeasePayment {
    id: number;
    leaseId: number;
    userId: number;
    amount: number;
    paymentDate: string;
    paymentType: string;
    reference: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string;
}

// Per semplicità e coerenza con il backend, LeaseFormData può estendere LeaseCreate
export type LeaseFormData = LeaseCreate;