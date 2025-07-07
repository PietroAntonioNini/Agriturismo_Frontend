export interface UtilityReading {
    id?: number;
    apartmentId: number;
    type: 'electricity' | 'water' | 'gas';
    readingDate: Date;
    previousReading: number;
    currentReading: number;
    consumption: number; // currentReading - previousReading (calcolato automaticamente)
    unitCost: number; // costo per unità
    totalCost: number; // consumption * unitCost (calcolato automaticamente)
    isPaid: boolean;
    paidDate?: Date;
    createdAt?: Date;
    updatedAt?: Date;
    notes?: string; // Note aggiuntive sulla lettura
    // Campi opzionali per compatibilità con il backend
    electricityConsumption?: number;
    waterConsumption?: number;
    gasConsumption?: number;
    electricityCost?: number;
    waterCost?: number;
    gasCost?: number;
}

// Interfaccia per la creazione che corrisponde al backend schema
export interface UtilityReadingCreate {
    apartmentId: number;
    type: 'electricity' | 'water' | 'gas';
    readingDate: string; // Formato ISO date string per il backend
    previousReading: number;
    currentReading: number;
    consumption: number;
    unitCost: number;
    totalCost: number;
    isPaid: boolean;
    notes?: string;
    // Campi opzionali per il backend (lasciati undefined)
    electricityConsumption?: number;
    waterConsumption?: number;
    gasConsumption?: number;
    electricityCost?: number;
    waterCost?: number;
    gasCost?: number;
}

export interface LastReading {
    apartmentId: number;
    type: 'electricity' | 'water' | 'gas';
    lastReading: number;
    lastReadingDate: Date;
    hasHistory: boolean; // indica se è la prima lettura o meno
}

export interface UtilitySummary {
    apartmentId: number;
    apartmentName: string;
    month: number;
    year: number;
    electricity: {
        consumption: number;
        cost: number;
        readingsCount: number;
    };
    water: {
        consumption: number;
        cost: number;
        readingsCount: number;
    };
    gas: {
        consumption: number;
        cost: number;
        readingsCount: number;
    };
    totalCost: number;
}

export interface MonthlyUtilityData {
    month: number;
    year: number;
    apartmentId: number;
    apartmentName: string;
    electricity: number;
    water: number;
    gas: number;
    electricityCost: number;
    waterCost: number;
    gasCost: number;
    totalCost: number;
}

export interface ApartmentUtilityData {
    apartmentId: number;
    apartmentName: string;
    monthlyData: {
        month: number;
        monthName: string;
        electricity: number;
        water: number;
        gas: number;
        electricityCost: number;
        waterCost: number;
        gasCost: number;
        totalCost: number;
    }[];
    yearlyTotals: {
        electricity: number;
        water: number;
        gas: number;
        totalCost: number;
    };
}

export interface UtilityStatistics {
    totalApartments: number;
    totalConsumption: {
        electricity: number;
        water: number;
        gas: number;
    };
    totalCosts: {
        electricity: number;
        water: number;
        gas: number;
        total: number;
    };
    averageConsumption: {
        electricity: number;
        water: number;
        gas: number;
    };
    monthlyTrend: {
        month: number;
        monthName: string;
        totalConsumption: number;
        totalCost: number;
    }[];
}

export interface UtilityFormData {
    apartmentId: number;
    type: 'electricity' | 'water' | 'gas';
    readingDate: Date;
    currentReading: number;
    unitCost: number;
    notes?: string;
}

// Tipi per le unità di misura
export interface UtilityTypeConfig {
    type: 'electricity' | 'water' | 'gas';
    label: string;
    unit: string;
    icon: string;
    color: string;
    defaultCost: number;
}