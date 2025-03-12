export interface Apartment {
    id: number;
    name: string;
    number: string;
    size: number; // in square meters
    monthlyRent: number;
    features: string[];
    address: string;
    floor?: number;
    bedrooms: number;
    bathrooms: number;
    hasBalcony: boolean;
    hasParking: boolean;
    furnishingStatus: 'furnished' | 'semi-furnished' | 'unfurnished';
    description?: string;
    utilityMeters: {
        electricity: string;
        water: string;
        gas: string;
    };
    maintenanceHistory: MaintenanceRecord[];
    isAvailable: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface MaintenanceRecord {
    id: number;
    apartmentId: number;
    type: 'repair' | 'inspection' | 'upgrade' | 'cleaning';
    description: string;
    cost: number;
    date: Date;
    completedBy: string;
    notes?: string;
} 