export interface Invoice {
    id: number;
    leaseId: number;
    tenantId: number;
    apartmentId: number;
    invoiceNumber: string;
    month: number;
    year: number;
    issueDate: Date;
    dueDate: Date;
    periodStart: Date;
    periodEnd: Date;
    items: InvoiceItem[];
    subtotal: number;
    tax: number;
    total: number;
    isPaid: boolean;
    status: 'pending' | 'paid' | 'overdue' | 'cancelled';
    paymentDate?: Date;
    paymentMethod?: 'cash' | 'bank_transfer' | 'credit_card' | 'check';
    notes?: string;
    reminderSent: boolean;
    reminderDate?: Date;
    paymentRecords?: PaymentRecord[];
    createdAt: Date;
    updatedAt: Date;
}

export interface InvoiceItem {
    id: number;
    invoiceId: number;
    description: string;
    amount: number;
    quantity: number;
    unitPrice: number;
    type: 'rent' | 'electricity' | 'water' | 'gas' | 'maintenance' | 'other';
}

export interface PaymentRecord {
    id: number;
    invoiceId: number;
    amount: number;
    paymentDate: Date;
    paymentMethod: 'cash' | 'bank_transfer' | 'credit_card' | 'check';
    reference?: string;
    notes?: string;
    status: 'completed' | 'pending' | 'failed';
    createdAt: Date;
    updatedAt: Date;
} 