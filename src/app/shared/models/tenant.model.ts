export interface Tenant {
  id: number;
  userId: number; // ← AGGIUNGI
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  documentType: string;
  documentNumber: string;
  documentExpiryDate: Date;
  documentFrontImage?: string;
  documentBackImage?: string;
  address?: string;
  communicationPreferences: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date; // ← AGGIUNGI
}