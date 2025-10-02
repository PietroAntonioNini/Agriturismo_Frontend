export interface Lease {
    id: number;
    tenantId: number;
    apartmentId: number;
    userId: number; // ← AGGIUNGI
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
    deletedAt?: Date; // ← AGGIUNGI
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


export interface LeaseDocument {
    id: number;
    leaseId: number;
    userId: number; // ← AGGIUNGI
    name: string;
    type: string;
    url: string;
    uploadDate: Date;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date; // ← AGGIUNGI
}

export interface LeasePayment {
    id: number;
    leaseId: number;
    userId: number; // ← AGGIUNGI
    amount: number;
    paymentDate: Date;
    paymentType: string;
    reference: string;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date; // ← AGGIUNGI
}

export interface LeaseFormData {
    tenantId: number;
    apartmentId: number;
    userId: number; // ← AGGIUNGI
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