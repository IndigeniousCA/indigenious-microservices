-- Create database
CREATE DATABASE indigenous_businesses;

-- Main businesses table
CREATE TABLE businesses (
    id SERIAL PRIMARY KEY,
    -- Original data
    business_name VARCHAR(500) NOT NULL,
    category VARCHAR(100),
    phone VARCHAR(50),
    address TEXT,
    has_address BOOLEAN,
    
    -- REQ data
    neq VARCHAR(15) UNIQUE,
    legal_form VARCHAR(100),
    creation_date DATE,
    years_in_existence INTEGER,
    status VARCHAR(50),
    last_update DATE,
    
    -- Location details
    headquarters_address TEXT,
    postal_code VARCHAR(10),
    municipality VARCHAR(100),
    administrative_region VARCHAR(100),
    
    -- Additional info
    other_names TEXT[],
    number_of_employees VARCHAR(50),
    
    -- Metadata
    req_last_checked TIMESTAMP,
    data_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Directors/Officers table
CREATE TABLE directors (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id),
    name VARCHAR(200),
    role VARCHAR(100), -- President, Secretary, Treasurer, Director
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Business establishments (multiple locations)
CREATE TABLE establishments (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id),
    name VARCHAR(300),
    address TEXT,
    municipality VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE
);

-- RBQ data for construction companies
CREATE TABLE rbq_licenses (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id),
    rbq_number VARCHAR(20) UNIQUE,
    license_status VARCHAR(50),
    license_type VARCHAR(100),
    work_subcategories TEXT[],
    work_scope TEXT[], -- Commercial, Residential, Institutional
    valid_until DATE,
    restrictions TEXT
);

-- Related businesses
CREATE TABLE business_relationships (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id),
    related_business_id INTEGER REFERENCES businesses(id),
    relationship_type VARCHAR(100) -- subsidiary, parent, affiliated
);

-- Create indexes
CREATE INDEX idx_business_name ON businesses(business_name);
CREATE INDEX idx_neq ON businesses(neq);
CREATE INDEX idx_category ON businesses(category);
CREATE INDEX idx_status ON businesses(status);
CREATE INDEX idx_rbq ON rbq_licenses(rbq_number);
