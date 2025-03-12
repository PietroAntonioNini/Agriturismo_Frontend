export interface Tenant {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    documentType: string;
    documentNumber: string;
    documentExpiryDate: Date;
    address?: string;
    communicationPreferences: {
        email: boolean;
        sms: boolean;
        whatsapp: boolean;
    };
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
} 