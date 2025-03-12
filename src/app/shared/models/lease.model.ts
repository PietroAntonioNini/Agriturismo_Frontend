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
}