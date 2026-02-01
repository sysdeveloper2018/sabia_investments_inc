-- Neon PostgreSQL Database Setup for Sabia Investment Properties

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    purchasePrice INTEGER,
    purchaseDate TEXT,
    sqFt INTEGER,
    beds INTEGER,
    baths REAL,
    yearBuilt INTEGER,
    estimatedRepairCost INTEGER,
    afterRepairValue INTEGER,
    annualTaxes INTEGER,
    insuranceCost INTEGER,
    imageUrl TEXT,
    hasGarage BOOLEAN DEFAULT FALSE,
    hasPool BOOLEAN DEFAULT FALSE,
    documents TEXT,
    improvements TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contractors table
CREATE TABLE IF NOT EXISTS contractors (
    id TEXT PRIMARY KEY,
    businessName TEXT NOT NULL,
    contactName TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    specialty TEXT,
    taxId TEXT,
    insuranceExpiry TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Work items table
CREATE TABLE IF NOT EXISTS work_items (
    id TEXT PRIMARY KEY,
    propertyId TEXT NOT NULL,
    contractorId TEXT,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    estimatedCost INTEGER,
    actualCost INTEGER,
    status TEXT NOT NULL,
    isBundle BOOLEAN DEFAULT FALSE,
    startDate TEXT,
    completionDate TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (propertyId) REFERENCES properties(id),
    FOREIGN KEY (contractorId) REFERENCES contractors(id)
);

-- Communication logs table
CREATE TABLE IF NOT EXISTS communication_logs (
    id TEXT PRIMARY KEY,
    propertyId TEXT NOT NULL,
    contactId TEXT NOT NULL,
    contactRole TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    summary TEXT NOT NULL,
    followUpRequired BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (propertyId) REFERENCES properties(id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_work_items_property ON work_items(propertyId);
CREATE INDEX IF NOT EXISTS idx_work_items_contractor ON work_items(contractorId);
CREATE INDEX IF NOT EXISTS idx_comm_logs_property ON communication_logs(propertyId);
CREATE INDEX IF NOT EXISTS idx_comm_logs_date ON communication_logs(date);
