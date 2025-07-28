import { Tenant } from './tenant.model';
import { Apartment } from './apartment.model';
import { Lease } from './lease.model';

export interface Invoice {
    id: number;
    leaseId: number;
    tenantId: number;
    apartmentId: number;
    invoiceNumber: string;
    month: number;
    year: number;
    issueDate: string;
    dueDate: string;
    periodStart: string;
    periodEnd: string;
    items: InvoiceItem[];
    subtotal: number;
    tax: number;
    total: number;
    isPaid: boolean;
    status: 'pending' | 'paid' | 'overdue' | 'cancelled';
    paymentDate?: string;
    paymentMethod?: 'cash' | 'bank_transfer' | 'credit_card' | 'check';
    notes?: string;
    reminderSent: boolean;
    reminderDate?: string;
    paymentRecords?: PaymentRecord[];
    tenant?: Tenant;
    apartment?: Apartment;
    lease?: Lease;
    createdAt: string;
    updatedAt: string;
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
    paymentDate: string;
    paymentMethod: 'cash' | 'bank_transfer' | 'credit_card' | 'check';
    reference?: string;
    notes?: string;
    status: 'completed' | 'pending' | 'failed';
    createdAt: string;
    updatedAt: string;
}

// Interfacce per creazione e aggiornamento
export interface InvoiceCreate {
    leaseId: number;
    tenantId: number;
    apartmentId: number;
    invoiceNumber?: string;
    month: number;
    year: number;
    issueDate: string;
    dueDate: string;
    periodStart: string;
    periodEnd: string;
    notes?: string;
    items: InvoiceItemCreate[];
}

export interface InvoiceItemCreate {
    invoiceId?: number;
    description: string;
    amount: number;
    quantity: number;
    unitPrice: number;
    type: 'rent' | 'electricity' | 'water' | 'gas' | 'maintenance' | 'other';
}

export interface PaymentRecordCreate {
    invoiceId?: number;
    amount: number;
    paymentDate: string;
    paymentMethod: 'cash' | 'bank_transfer' | 'credit_card' | 'check';
    reference?: string;
    notes?: string;
}

// Interfacce per filtri e statistiche
export interface InvoiceFilters {
    status?: 'all' | 'paid' | 'unpaid' | 'overdue';
    period?: 'all' | 'this_month' | 'last_month' | 'this_year' | 'custom';
    tenantId?: number;
    apartmentId?: number;
    leaseId?: number;
    month?: number;
    year?: number;
    startDate?: string;
    endDate?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
}

export interface InvoiceStatistics {
    totalInvoiced: number;
    totalPaid: number;
    totalUnpaid: number;
    overdueInvoices: number;
    thisMonthInvoices: number;
    averagePaymentTime: number;
    period: string;
    startDate: string;
    endDate: string;
    paymentMethodsDistribution?: {
        bank_transfer: number;
        cash: number;
        credit_card: number;
        check: number;
    };
    monthlyTrends?: Array<{
        month: string;
        invoiced: number;
        paid: number;
    }>;
} 