// shared/models/index.ts o shared/models/models.ts

export interface Apartment {
  id?: string;
  name: string;
  description?: string;
  floor: number;
  squareMeters: number;
  rooms: number;
  bathrooms: number;
  hasBalcony: boolean;
  hasParking: boolean;
  isFurnished: boolean;
  monthlyRent: number;
  status: 'available' | 'occupied' | 'maintenance';
  isAvailable?: boolean;
  notes?: string;
  // Aggiungi questa proprietà se vuoi tenere traccia dei numeri dei contatori
  utilityMetersInfo?: {
    electricityMeterNumber: string;
    waterMeterNumber: string; 
    gasMeterNumber: string;
  };
  maintenanceHistory: MaintenanceRecord[];
  amenities?: string[];
  images?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Le altre interfacce come sopra

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