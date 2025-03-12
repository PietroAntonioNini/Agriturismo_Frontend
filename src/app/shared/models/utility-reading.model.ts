export interface UtilityReading {
    id: number;
    apartmentId: number;
    type: 'electricity' | 'water' | 'gas';
    readingDate: Date;
    previousReading: number;
    currentReading: number;
    consumption: number; // currentReading - previousReading
    unitCost: number; // cost per unit
    totalCost: number; // consumption * unitCost
    isPaid: boolean;
    paidDate?: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface UtilitySummary {
    apartmentId: number;
    month: number;
    year: number;
    electricity: {
        consumption: number;
        cost: number;
    };
    water: {
        consumption: number;
        cost: number;
    };
    gas: {
        consumption: number;
        cost: number;
    };
    totalCost: number;
} 