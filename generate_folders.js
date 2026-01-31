import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { verbose } = require('sqlite3');
const sqlite = verbose();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'sabia.db');
const BASE_DIR = path.join(__dirname, 'property_data');

if (!fs.existsSync(BASE_DIR)) {
    fs.mkdirSync(BASE_DIR);
}

console.log(`Connecting to database: ${DB_FILE}`);
const db = new sqlite.Database(DB_FILE, (err) => {
    if (err) {
        console.error("Could not connect to database:", err);
        process.exit(1);
    }
});

db.all("SELECT * FROM properties", [], (err, rows) => {
    if (err) {
        console.error("Error reading DB:", err);
        return;
    }

    console.log(`Found ${rows.length} properties. Generating folders...`);

    rows.forEach(p => {
        if (!p.address) return;

        const sanitize = (name) => name.replace(/[^a-z0-9]/gi, '_').replace(/_{2,}/g, '_').toLowerCase();
        const folderName = sanitize(p.address);
        const targetFolder = path.join(BASE_DIR, folderName);

        if (!fs.existsSync(targetFolder)) {
            fs.mkdirSync(targetFolder);
            console.log(`Created folder: ${folderName}`);
        } else {
            console.log(`Updating folder: ${folderName}`);
        }

        // Generate CSV
        const headers = Object.keys(p).join(',');
        const values = Object.values(p).map(val => {
             if (val === null || val === undefined) return '';
             const str = String(val);
             if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                 return `"${str.replace(/"/g, '""')}"`;
             }
             return str;
        }).join(',');
        
        const csvContent = `${headers}\n${values}`;
        const filePath = path.join(targetFolder, `${folderName}_details.csv`);
        
        fs.writeFileSync(filePath, csvContent);
    });
    
    console.log("Operation complete.");
    db.close();
});
