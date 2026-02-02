import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// --- CONFIGURATION ---
const PORT = process.env.PORT || 3009; // Allow host to set PORT
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.resolve(__dirname, 'sabia.db');
const BASE_DATA_DIR = path.join(__dirname, 'property_data');

// Ensure base data directory exists
if (!fs.existsSync(BASE_DATA_DIR)) {
    fs.mkdirSync(BASE_DATA_DIR);
}

// --- MOCK DATABASE (Memory Fallback) ---
class MockDB {
    constructor() {
        console.log("----------------------------------------------------------------");
        console.log(" NOTE: Running in MEMORY-ONLY mode (MockDB).");
        console.log(" Data will be lost when the server restarts.");
        console.log("----------------------------------------------------------------");
        this.tables = {
            properties: [],
            property_documents: [],
            contractors: [],
            work_items: [],
            communication_logs: []
        };
    }
    serialize(fn) { fn(); }
    run(sql, params, callback) {
        if (typeof params === 'function') { callback = params; params = []; }
        const s = sql.trim();
        try {
            if (s.match(/^(CREATE|ALTER|PRAGMA)/i)) {
                if(callback) callback.call({changes: 0}, null); return;
            }
            if (s.match(/^INSERT INTO/i)) {
                const match = s.match(/INSERT INTO\s+(\w+)\s*\(([^)]+)\)/i);
                if (match) {
                    const table = match[1];
                    const cols = match[2].split(',').map(c => c.trim());
                    const obj = {};
                    cols.forEach((col, i) => obj[col] = params[i]);
                    if (!this.tables[table]) this.tables[table] = [];
                    this.tables[table].push(obj);
                    if(callback) callback.call({changes: 1, lastID: Date.now()}, null); return;
                }
            }
            if (s.match(/^UPDATE/i)) {
                const match = s.match(/UPDATE\s+(\w+)\s+SET\s+(.+)\s+WHERE\s+id=\?/i);
                if (match) {
                    const table = match[1];
                    const id = params[params.length - 1];
                    const row = this.tables[table]?.find(r => r.id === id);
                    if (row) {
                        const pairs = match[2].split(',').map(p => p.trim());
                        pairs.forEach((p, i) => { 
                            const key = p.split('=')[0].trim();
                            row[key] = params[i]; 
                        });
                    }
                    if(callback) callback.call({changes: row ? 1 : 0}, null); return;
                }
            }
            if (s.match(/^DELETE FROM/i)) {
                const match = s.match(/DELETE FROM\s+(\w+)\s+WHERE\s+id\s*=\s*\?/i);
                if (match) {
                    const table = match[1];
                    const id = params[0];
                    if (this.tables[table]) {
                         const len = this.tables[table].length;
                         this.tables[table] = this.tables[table].filter(r => r.id !== id);
                         if(callback) callback.call({changes: len - this.tables[table].length}, null); return;
                    }
                }
            }
            if(callback) callback.call({changes: 0}, null);
        } catch(e) { console.error("MockDB Execution Error", e); if(callback) callback(e); }
    }
    all(sql, params, callback) {
        if (typeof params === 'function') { callback = params; params = []; }
        const s = sql.trim();
        try {
            if (s.match(/^SELECT \* FROM/i)) {
                const match = s.match(/SELECT \* FROM\s+(\w+)/i);
                const table = match ? match[1] : null;
                let rows = this.tables[table] || [];
                const whereMatch = s.match(/WHERE\s+(\w+)\s*=\s*\?/i);
                if (whereMatch && params.length > 0) {
                    const field = whereMatch[1];
                    const val = params[0];
                    rows = rows.filter(r => r[field] === val);
                }
                if(callback) callback(null, rows); return;
            }
            if(callback) callback(null, []);
        } catch(e) { console.error("MockDB Query Error", e); if(callback) callback(e, []); }
    }
    get(sql, params, callback) {
        this.all(sql, params, (err, rows) => {
            if (err) callback(err);
            else callback(null, rows && rows.length > 0 ? rows[0] : undefined);
        });
    }
}

// --- DATABASE LOADER ---
let sqlite3;
let db;
let useMock = false;

try {
    const require = createRequire(import.meta.url);
    try {
        sqlite3 = require('sqlite3').verbose();
        console.log("SQLite3 module loaded successfully.");
    } catch (innerErr) {
        console.warn("SQLite3 module load failed:", innerErr.message);
        useMock = true;
    }
} catch (e) {
    console.warn("Could not create require context:", e.message);
    useMock = true;
}

function initializeDatabase() {
    if (useMock || !sqlite3) {
        console.log("Initializing MockDB immediately due to load failure.");
        db = new MockDB();
        configureDb();
        return;
    }
    try {
        db = new sqlite3.Database(DB_FILE, (err) => {
            if (err) {
                console.error(`Failed to open DB file (${DB_FILE}). Switching to MockDB.`);
                db = new MockDB();
                configureDb();
            } else {
                console.log(`Connected to SQLite database at: ${DB_FILE}`);
                configureDb();
            }
        });
    } catch (err) {
        console.error("Critical SQLite init error:", err.message);
        db = new MockDB();
        configureDb();
    }
}

function configureDb() {
    if (!useMock && db instanceof sqlite3.Database) {
        db.run('PRAGMA journal_mode = WAL;', (err) => { if(err) console.log("WAL mode skipped."); });
        db.run('PRAGMA busy_timeout = 5000;');
    }
    runMigrations();
}

// --- FILE SYSTEM HELPERS ---

const sanitizeFolderName = (name) => {
    if (!name) return 'unknown_property';
    return name.replace(/[^a-z0-9]/gi, '_').replace(/_{2,}/g, '_').toLowerCase();
};

const saveBase64ToFile = (base64Data, filePath) => {
    try {
        // Strip metadata prefix (e.g., "data:image/png;base64,")
        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
            const buffer = Buffer.from(matches[2], 'base64');
            fs.writeFileSync(filePath, buffer);
            console.log(`[FS] Saved file: ${filePath}`);
            return true;
        }
        return false;
    } catch (e) {
        console.error(`[FS] Error saving file ${filePath}:`, e);
        return false;
    }
};

const createPropertyFolderStructure = (property) => {
    if (!property.address) return null;
    
    const folderName = sanitizeFolderName(property.address);
    const propDir = path.join(BASE_DATA_DIR, folderName);
    const imagesDir = path.join(propDir, 'images');
    const docsDir = path.join(propDir, 'documents');

    // Create directories
    if (!fs.existsSync(propDir)) fs.mkdirSync(propDir);
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir);
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir);

    // 1. Save CSV Details
    const headers = Object.keys(property).filter(k => k !== 'galleryImages' && k !== 'documents').join(',');
    const values = Object.keys(property).filter(k => k !== 'galleryImages' && k !== 'documents').map(k => {
        const val = property[k];
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }).join(',');
    
    fs.writeFileSync(path.join(propDir, 'property_details.csv'), `${headers}\n${values}`);

    // 2. Save Gallery Images (if Base64)
    if (property.galleryImages && Array.isArray(property.galleryImages)) {
        property.galleryImages.forEach((img, idx) => {
            if (typeof img === 'string' && img.startsWith('data:')) {
                // Infer extension
                const ext = img.substring(img.indexOf('/') + 1, img.indexOf(';')) || 'jpg';
                const filename = `gallery_${idx + 1}.${ext}`;
                saveBase64ToFile(img, path.join(imagesDir, filename));
            }
        });
    }

    // 3. Save Main Image
    if (property.imageUrl && property.imageUrl.startsWith('data:')) {
        const ext = property.imageUrl.substring(property.imageUrl.indexOf('/') + 1, property.imageUrl.indexOf(';')) || 'jpg';
        saveBase64ToFile(property.imageUrl, path.join(propDir, `cover_image.${ext}`));
    }

    return propDir;
};

// --- MIDDLEWARE ---
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(bodyParser.json({ limit: '50mb' })); 

app.use((req, res, next) => { next(); });
app.use(express.static(path.join(__dirname, 'dist')));

const safeParse = (str) => {
    if (!str) return [];
    try { return JSON.parse(str); } catch (e) { return []; }
};

function runMigrations() {
    const columnsToAdd = [
        "zestimate REAL", "listingUrl TEXT", "lotSize TEXT", "hasGarage INTEGER",
        "parkingCapacity REAL", "parkingFeatures TEXT", "stories REAL", "roofType TEXT",
        "constructionMaterials TEXT", "flooring TEXT", "appliances TEXT", "heatingType TEXT",
        "coolingType TEXT", "sewer TEXT", "waterSource TEXT", "hasPool INTEGER",
        "poolFeatures TEXT", "zoning TEXT", "lotFeatures TEXT", "improvements TEXT",
        "repairDetails TEXT", "customLinks TEXT"
    ];
    
    db.serialize(() => {
        const tables = [
            `CREATE TABLE IF NOT EXISTS properties (
                id TEXT PRIMARY KEY, address TEXT, city TEXT, state TEXT, zip TEXT, type TEXT,
                purchasePrice REAL, purchaseDate TEXT, sqFt REAL, beds REAL, baths REAL, yearBuilt INTEGER,
                estimatedRepairCost REAL, afterRepairValue REAL, annualTaxes REAL, insuranceCost REAL, status TEXT,
                imageUrl TEXT, galleryImages TEXT, zestimate REAL, listingUrl TEXT, lotSize TEXT, hasGarage INTEGER,
                parkingCapacity REAL, parkingFeatures TEXT, stories REAL, roofType TEXT, constructionMaterials TEXT,
                flooring TEXT, appliances TEXT, heatingType TEXT, coolingType TEXT, sewer TEXT, waterSource TEXT,
                hasPool INTEGER, poolFeatures TEXT, zoning TEXT, lotFeatures TEXT, improvements TEXT, repairDetails TEXT,
                customLinks TEXT
            )`,
            `CREATE TABLE IF NOT EXISTS property_documents (id TEXT PRIMARY KEY, propertyId TEXT, name TEXT, type TEXT, uploadDate TEXT, data TEXT)`,
            `CREATE TABLE IF NOT EXISTS contractors (id TEXT PRIMARY KEY, businessName TEXT, contactName TEXT, email TEXT, phone TEXT, specialty TEXT, taxId TEXT, insuranceExpiry TEXT, notes TEXT)`,
            `CREATE TABLE IF NOT EXISTS work_items (id TEXT PRIMARY KEY, propertyId TEXT, contractorId TEXT, description TEXT, category TEXT, estimatedCost REAL, actualCost REAL, status TEXT, isBundle INTEGER, startDate TEXT, completionDate TEXT)`,
            `CREATE TABLE IF NOT EXISTS communication_logs (id TEXT PRIMARY KEY, propertyId TEXT, contactId TEXT, contactRole TEXT, date TEXT, type TEXT, summary TEXT, followUpRequired INTEGER)`
        ];

        tables.forEach(sql => db.run(sql));

        if (!useMock) {
            columnsToAdd.forEach(colDef => {
                db.run(`ALTER TABLE properties ADD COLUMN ${colDef}`, (err) => {});
            });
        }
    });
}

initializeDatabase();

// --- ROUTES ---

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        server: 'Sabia-Backend', 
        mode: useMock ? 'MOCK_MEMORY' : 'SQLITE_FILE', 
        port: PORT 
    });
});

app.get('/api/ping', (req, res) => res.send('pong'));

// Properties
app.get('/api/properties', (req, res) => {
    db.all("SELECT * FROM properties", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        try {
            const formatted = (rows || []).map(r => ({
                ...r,
                galleryImages: safeParse(r.galleryImages),
                improvements: safeParse(r.improvements),
                repairDetails: safeParse(r.repairDetails),
                customLinks: safeParse(r.customLinks),
                hasGarage: !!r.hasGarage, hasPool: !!r.hasPool
            }));
            res.json(formatted);
        } catch (e) {
            res.json([]);
        }
    });
});

app.post('/api/properties', (req, res) => {
    const p = req.body;
    
    // 1. File System Operations
    try {
        createPropertyFolderStructure(p);
    } catch (fsErr) {
        console.error("FS Operation Failed:", fsErr);
    }

    // 2. Database Insertion
    const sql = `INSERT INTO properties (id, address, city, state, zip, type, purchasePrice, purchaseDate, sqFt, beds, baths, yearBuilt, estimatedRepairCost, afterRepairValue, annualTaxes, insuranceCost, status, imageUrl, galleryImages, zestimate, listingUrl, lotSize, hasGarage, parkingCapacity, parkingFeatures, stories, roofType, constructionMaterials, flooring, appliances, heatingType, coolingType, sewer, waterSource, hasPool, poolFeatures, zoning, lotFeatures, improvements, repairDetails, customLinks) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const params = [
        p.id, p.address, p.city, p.state, p.zip, p.type, p.purchasePrice, p.purchaseDate, p.sqFt, p.beds, p.baths, p.yearBuilt, 
        p.estimatedRepairCost, p.afterRepairValue, p.annualTaxes, p.insuranceCost, p.status, p.imageUrl, JSON.stringify(p.galleryImages || []),
        p.zestimate, p.listingUrl, p.lotSize, p.hasGarage ? 1 : 0, p.parkingCapacity, p.parkingFeatures, p.stories, p.roofType,
        p.constructionMaterials, p.flooring, p.appliances, p.heatingType, p.coolingType, p.sewer, p.waterSource, p.hasPool ? 1 : 0,
        p.poolFeatures, p.zoning, p.lotFeatures, JSON.stringify(p.improvements || []), JSON.stringify(p.repairDetails || []), JSON.stringify(p.customLinks || [])
    ];
    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Property saved and folders created", id: p.id });
    });
});

app.put('/api/properties/:id', (req, res) => {
    const p = req.body;
    
    // Update files on edit as well
    try {
        createPropertyFolderStructure(p);
    } catch (fsErr) {
        console.error("FS Update Failed:", fsErr);
    }

    const sql = `UPDATE properties SET address=?, city=?, state=?, zip=?, type=?, purchasePrice=?, purchaseDate=?, sqFt=?, beds=?, baths=?, yearBuilt=?, estimatedRepairCost=?, afterRepairValue=?, annualTaxes=?, insuranceCost=?, status=?, imageUrl=?, galleryImages=?, zestimate=?, listingUrl=?, lotSize=?, hasGarage=?, parkingCapacity=?, parkingFeatures=?, stories=?, roofType=?, constructionMaterials=?, flooring=?, appliances=?, heatingType=?, coolingType=?, sewer=?, waterSource=?, hasPool=?, poolFeatures=?, zoning=?, lotFeatures=?, improvements=?, repairDetails=?, customLinks=? WHERE id=?`;
    const params = [
        p.address, p.city, p.state, p.zip, p.type, p.purchasePrice, p.purchaseDate, p.sqFt, p.beds, p.baths, p.yearBuilt, 
        p.estimatedRepairCost, p.afterRepairValue, p.annualTaxes, p.insuranceCost, p.status, p.imageUrl, JSON.stringify(p.galleryImages || []),
        p.zestimate, p.listingUrl, p.lotSize, p.hasGarage ? 1 : 0, p.parkingCapacity, p.parkingFeatures, p.stories, p.roofType,
        p.constructionMaterials, p.flooring, p.appliances, p.heatingType, p.coolingType, p.sewer, p.waterSource, p.hasPool ? 1 : 0,
        p.poolFeatures, p.zoning, p.lotFeatures, JSON.stringify(p.improvements || []), JSON.stringify(p.repairDetails || []), JSON.stringify(p.customLinks || []), req.params.id
    ];
    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Property updated" });
    });
});

app.delete('/api/properties/:id', (req, res) => {
    db.run("DELETE FROM properties WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Property deleted" });
    });
});

// Documents
app.get('/api/documents/:propertyId', (req, res) => {
    db.all("SELECT * FROM property_documents WHERE propertyId = ?", [req.params.propertyId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/documents', (req, res) => {
    const d = req.body;
    
    // Save document to file system
    db.get("SELECT address FROM properties WHERE id = ?", [d.propertyId], (err, row) => {
        if (!err && row && row.address) {
            try {
                const folderName = sanitizeFolderName(row.address);
                const docsDir = path.join(BASE_DATA_DIR, folderName, 'documents');
                if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
                
                if (d.data && d.data.startsWith('data:')) {
                    // Sanitize filename
                    const safeName = d.name.replace(/[^a-z0-9\.]/gi, '_');
                    saveBase64ToFile(d.data, path.join(docsDir, safeName));
                }
            } catch (fsErr) {
                console.error("Failed to save doc to disk:", fsErr);
            }
        }
        
        // Save to DB
        db.run("INSERT INTO property_documents (id, propertyId, name, type, uploadDate, data) VALUES (?,?,?,?,?,?)",
        [d.id, d.propertyId, d.name, d.type, d.uploadDate, d.data], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Document saved" });
        });
    });
});

app.delete('/api/documents/:id', (req, res) => {
    db.run("DELETE FROM property_documents WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Document deleted" });
    });
});

// Contractors
app.get('/api/contractors', (req, res) => {
    db.all("SELECT * FROM contractors", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});
app.post('/api/contractors', (req, res) => {
    const c = req.body;
    db.run(`INSERT INTO contractors (id, businessName, contactName, email, phone, specialty, taxId, insuranceExpiry, notes) VALUES (?,?,?,?,?,?,?,?,?)`, 
    [c.id, c.businessName, c.contactName, c.email, c.phone, c.specialty, c.taxId, c.insuranceExpiry, c.notes], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Contractor saved" });
    });
});

// Work Items
app.get('/api/work-items', (req, res) => {
    db.all("SELECT * FROM work_items", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const formatted = (rows || []).map(r => ({...r, isBundle: !!r.isBundle}));
        res.json(formatted);
    });
});
app.post('/api/work-items', (req, res) => {
    const w = req.body;
    db.run(`INSERT INTO work_items (id, propertyId, contractorId, description, category, estimatedCost, actualCost, status, isBundle, startDate, completionDate) VALUES (?,?,?,?,?,?,?,?,?,?,?)`, 
    [w.id, w.propertyId, w.contractorId, w.description, w.category, w.estimatedCost, w.actualCost, w.status, w.isBundle ? 1 : 0, w.startDate, w.completionDate], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Work Item saved" });
    });
});

// Logs
app.get('/api/logs', (req, res) => {
    db.all("SELECT * FROM communication_logs", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const formatted = (rows || []).map(r => ({...r, followUpRequired: !!r.followUpRequired}));
        res.json(formatted);
    });
});
app.post('/api/logs', (req, res) => {
    const l = req.body;
    db.run(`INSERT INTO communication_logs (id, propertyId, contactId, contactRole, date, type, summary, followUpRequired) VALUES (?,?,?,?,?,?,?,?)`, 
    [l.id, l.propertyId, l.contactId, l.contactRole, l.date, l.type, l.summary, l.followUpRequired ? 1 : 0], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Log saved" });
    });
});

// Email endpoint with PDF attachment support
app.post('/api/send-email', async (req, res) => {
    try {
        let to, subject, body, attachment;
        
        // Handle both JSON and FormData requests
        if (req.is('multipart/form-data')) {
            // FormData request (with PDF attachment)
            const formidable = require('formidable');
            const form = new formidable.IncomingForm();
            
            const [fields, files] = await form.parse(req);
            to = fields.to?.[0];
            subject = fields.subject?.[0];
            body = fields.body?.[0];
            attachment = files.attachment?.[0];
        } else {
            // JSON request (without attachment)
            ({ to, subject, body } = req.body);
        }
        
        // In production, this would use the Netlify function with Brevo
        // For local development, we'll simulate the email sending
        console.log('--- EMAIL REQUEST ---');
        console.log('To:', to);
        console.log('Subject:', subject);
        console.log('Body:', body?.substring(0, 100) + '...');
        if (attachment) {
            console.log('Attachment:', attachment.originalFilename, `(${attachment.size} bytes)`);
        }
        console.log('--- END EMAIL REQUEST ---');
        
        // Simulate email sending delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        res.json({ 
            success: true, 
            message: attachment ? 
                `Email with PDF attachment sent successfully (simulated in development)` :
                'Email sent successfully (simulated in development)',
            to: to,
            subject: subject,
            attachment: attachment ? attachment.originalFilename : null
        });
        
    } catch (error) {
        console.error('Email send error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to send email',
            details: error.message 
        });
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Server Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Sabia API Server running on http://0.0.0.0:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API endpoints available at http://localhost:${PORT}/api`);
});