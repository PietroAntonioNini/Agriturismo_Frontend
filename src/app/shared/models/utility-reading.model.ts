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
    createdAt: Date;
    updatedAt: Date;
    electricityConsumption?: number;
    waterConsumption?: number;
    gasConsumption?: number;
    electricityCost?: number;
    waterCost?: number;
    gasCost?: number;
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

export interface MonthlyUtilityData {
    month: number;
    year: number;
    apartmentId: number;
    apartmentName: string;
    electricity: number;
    water: number;
    gas: number;
}

export interface ApartmentUtilityData {
    apartmentId: number;
    apartmentName: string;
    monthlyData: {
        month: number;
        electricity: number;
        water: number;
        gas: number;
    }[];
}