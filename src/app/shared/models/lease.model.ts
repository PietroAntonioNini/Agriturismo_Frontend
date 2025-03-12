export interface Lease {
    id: number;
    tenantId: number;
    apartmentId: number;
    startDate: Date;
    endDate: Date;
    monthlyRent: number;
    securityDeposit: number;
    depositPaid: boolean;
    depositPaymentDate?: Date;
    isActive: boolean;
    renewalOption: boolean;
    termsAndConditions: string;
    specialClauses?: string;
    paymentFrequency: 'monthly' | 'quarterly' | 'yearly';
    paymentDueDay: number; // day of the month when payment is due
    lateFee: number;
    terminationNotice: number; // days required for termination notice
    signingDate: Date;
    contractFile?: string; // file path or URL to the contract document
    createdAt: Date;
    updatedAt: Date;
}