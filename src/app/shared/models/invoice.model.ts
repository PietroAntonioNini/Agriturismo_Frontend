import { Tenant } from './tenant.model';
import { Apartment } from './apartment.model';
import { Lease } from './lease.model';

export interface Invoice {
    id: number;
    leaseId: number;
    tenantId: number;
    apartmentId: number;
    userId: number; // ← AGGIUNGI
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
    payments?: PaymentRecord[];
    tenant?: Tenant;
    apartment?: Apartment;
    lease?: Lease;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string; // ← AGGIUNGI
}

export interface InvoiceItem {
    id: number;
    invoiceId: number;
    userId: number; // ← AGGIUNGI
    description: string;
    amount: number;
    quantity: number;
    unitPrice: number;
    type: 'rent' | 'electricity' | 'water' | 'gas' | 'electricity_laundry' | 'tari' | 'meter_fee' | 'entry' | 'maintenance' | 'other';
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string; // ← AGGIUNGI
}

export interface PaymentRecord {
    id: number;
    invoiceId: number;
    userId: number; // ← AGGIUNGI
    amount: number;
    paymentDate: string;
    paymentMethod: 'cash' | 'bank_transfer' | 'credit_card' | 'check';
    reference?: string;
    notes?: string;
    status: 'completed' | 'pending' | 'failed';
    createdAt: string;
    updatedAt: string;
    deletedAt?: string; // ← AGGIUNGI
}

// Interfacce per creazione e aggiornamento
// Payload POST /invoices: allineato allo schema backend (payload_example.md)
export interface InvoiceCreate {
    leaseId: number;
    tenantId: number;
    apartmentId: number;
    invoiceNumber: string;
    month: number;
    year: number;
    issueDate: string;
    dueDate: string;
    includeUtilities?: boolean;
    subtotal?: number;
    notes?: string;
    items: InvoiceItemCreate[];
}

/** Item inviato al backend: solo description, amount, type (no userId, quantity, unitPrice, invoiceId) */
export interface InvoiceItemCreate {
    description: string;
    amount: number;
    /** Tipi accettati: entry | rent | electricity | water | gas | electricity_laundry | tari | meter_fee | maintenance | other */
    type: 'entry' | 'rent' | 'electricity' | 'water' | 'gas' | 'electricity_laundry' | 'tari' | 'meter_fee' | 'maintenance' | 'other';
}

export interface PaymentRecordCreate {
    invoiceId?: number;
    userId?: number; // ← AGGIUNGI
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