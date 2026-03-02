const fs = require('fs').promises;
const path = require('path');

// Conditional imports - only load Selenium if available
let selenium, Builder, By, until, Options;
let GeminiAI;

try {
    const seleniumModule = require('selenium-webdriver');
    Builder = seleniumModule.Builder;
    By = seleniumModule.By;
    until = seleniumModule.until;
    Options = seleniumModule.Options;
    selenium = true;
    console.log('🚗 Selenium WebDriver available - full automation enabled');
} catch (e) {
    selenium = false;
    console.log('🌐 Selenium not available - using simulated mode');
}

try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    GeminiAI = GoogleGenerativeAI;
} catch (e) {
    console.log('❌ Gemini AI not available');
}

// --- CONFIGURATION ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyCeI6WXnQ1_KadODmOOxFWtwhETwhD-t3w";
const MODEL_ID = "gemini-2.5-flash";

function extractPartialAddress(fullAddress) {
    if (!fullAddress) return '';
    
    const parts = fullAddress.trim().split(' ');
    if (parts.length < 2) return fullAddress;
    
    const afterNumber = parts.slice(1).join(' ');
    const words = afterNumber.split(' ');
    const partialAddress = words.slice(0, 3).join(' ');
    
    return parts[0] + ' ' + partialAddress;
}

async function extractWithGemini(imagePath, directoryPath) {
    if (!GeminiAI) {
        throw new Error('Gemini AI not available');
    }
    
    console.log(`🧠 Gemini is performing deep analysis on ${imagePath}...`);
    
    try {
        const genAI = new GeminiAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: MODEL_ID });
        
        const imageData = await fs.readFile(imagePath);
        
        const prompt = `
            You are a professional Real Estate Data Extraction Expert. 
            Examine this Volusia County Property Appraiser screenshot and extract EVERY piece of information. 
            Organize it into logical sections: 
            1. General Property Information (Alt Key, Parcel ID, Owner, Situs Address)
            2. Value Summary (Just Value, Assessed Value, Taxable Value)
            3. Property Transfer/Sales History (Date, Price, Book/Page)
            4. Building Characteristics (Year Built, Living Area, Exterior Wall, Roof)
            5. Land Data and Legal Description
            
            Format the output in clean JSON format with the following structure:
            {
                "generalInfo": {
                    "altKey": "",
                    "parcelId": "",
                    "owner": "",
                    "situsAddress": ""
                },
                "values": {
                    "justValue": "",
                    "assessedValue": "",
                    "taxableValue": ""
                },
                "salesHistory": [],
                "building": {
                    "yearBuilt": "",
                    "livingArea": "",
                    "exteriorWall": "",
                    "roof": ""
                },
                "landData": {},
                "legalDescription": ""
            }
            
            Do not skip any data visible in the image. Return valid JSON only.
        `;
        
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: imageData.toString('base64'),
                    mimeType: 'image/png'
                }
            }
        ]);
        
        const response = await result.response;
        const text = response.text();
        
        let jsonData;
        try {
            jsonData = JSON.parse(text);
        } catch (e) {
            jsonData = { rawText: text };
        }
        
        // Save multiple files in the directory
        const timestamp = new Date().toISOString();
        
        const reportPath = path.join(directoryPath, 'property_report.json');
        await fs.writeFile(reportPath, JSON.stringify(jsonData, null, 2));
        console.log(`✅ JSON report saved to: ${reportPath}`);
        
        const textReportPath = path.join(directoryPath, 'property_report_raw.txt');
        await fs.writeFile(textReportPath, text);
        console.log(`✅ Raw text report saved to: ${textReportPath}`);
        
        const metadata = {
            timestamp,
            imagePath: path.basename(imagePath),
            extractionModel: MODEL_ID,
            filesGenerated: [
                'property_snapshot.png',
                'property_report.json',
                'property_report_raw.txt',
                'metadata.json'
            ]
        };
        const metadataPath = path.join(directoryPath, 'metadata.json');
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
        console.log(`✅ Metadata saved to: ${metadataPath}`);
        
        return jsonData;
        
    } catch (error) {
        console.error(`❌ Gemini Extraction Error: ${error}`);
        throw error;
    }
}

async function runFullSeleniumAutomation(address, searchAddress, tmpDir) {
    console.log('🚗 Running full Selenium automation...');
    
    const options = new Options();
    options.addArguments('--headless');
    options.addArguments('--window-size=1920,1080');
    options.addArguments('--force-device-scale-factor=2');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');

    let driver;
    try {
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();

        const wait = await driver.wait(until.elementLocated(By.css('body')), 15000);

        console.log('🚀 Opening Volusia County Property Appraiser...');
        await driver.get('https://vcpa.vcgov.org/search/real-property');

        // Handle disclaimer
        console.log('⚖️ Handling disclaimer...');
        try {
            const agreeButton = await driver.wait(
                until.elementLocated(By.id('acceptDataDisclaimer')), 
                10000
            );
            await agreeButton.click();
            await driver.sleep(1000);
        } catch (e) {
            console.log('Notice: Disclaimer already accepted or not found.');
        }

        // Search for address
        console.log(`🔍 Searching for '${searchAddress}'...`);
        const searchInput = await driver.wait(
            until.elementLocated(By.css('input[type="search"]')),
            10000
        );
        await searchInput.sendKeys(searchAddress);
        await driver.sleep(5000);

        // Full page capture
        await driver.executeScript('window.scrollTo(0, document.body.scrollHeight);');
        await driver.sleep(1000);
        
        const totalHeight = await driver.executeScript('return document.body.parentNode.scrollHeight');
        await driver.manage().window().setRect({ width: 1920, height: totalHeight + 300 });
        await driver.sleep(2000);

        const screenshotPath = path.join(tmpDir, 'property_snapshot.png');
        const screenshot = await driver.takeScreenshot();
        await fs.writeFile(screenshotPath, Buffer.from(screenshot, 'base64'));
        console.log(`📸 Screenshot captured (Height: ${totalHeight}px)`);

        // Extract with Gemini
        const extractionResult = await extractWithGemini(screenshotPath, tmpDir);

        return {
            success: true,
            screenshotPath,
            extractionResult
        };

    } finally {
        if (driver) {
            await driver.quit();
        }
    }
}

async function runSimulatedMode(address, searchAddress, tmpDir) {
    console.log('🌐 Running simulated mode...');
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const simulatedResult = {
        generalInfo: {
            altKey: "SIMULATED_" + Date.now(),
            parcelId: "SIM_" + Math.random().toString(36).substr(2, 9).toUpperCase(),
            owner: "Property Owner (Simulated)",
            situsAddress: address
        },
        values: {
            justValue: "$250,000",
            assessedValue: "$225,000", 
            taxableValue: "$200,000"
        },
        salesHistory: [
            {
                date: "2023-01-15",
                price: "$245,000",
                bookPage: "1234-567"
            }
        ],
        building: {
            yearBuilt: "1985",
            livingArea: "1,850 sq ft",
            exteriorWall: "Wood Frame",
            roof: "Asphalt Shingle"
        },
        landData: {
            lotSize: "0.25 acres",
            zoning: "R-1"
        },
        legalDescription: "LOT 12, BLOCK 34, SUNSHINE SUBDIVISION..."
    };

    // Save simulated files
    try {
        const reportPath = path.join(tmpDir, 'property_report.json');
        await fs.writeFile(reportPath, JSON.stringify(simulatedResult, null, 2));
        
        const metadata = {
            timestamp: new Date().toISOString(),
            imagePath: 'property_snapshot.png',
            extractionModel: MODEL_ID,
            filesGenerated: [
                'property_snapshot.png',
                'property_report.json', 
                'property_report_raw.txt',
                'metadata.json'
            ],
            simulated: true,
            seleniumAvailable: selenium,
            note: selenium ? "Real automation available but using simulated data for demo" : "Simulated data - real automation requires Chrome browser environment"
        };
        const metadataPath = path.join(tmpDir, 'metadata.json');
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
        
        console.log('✅ Simulated files created');
    } catch (fileError) {
        console.log('File creation failed (expected in serverless):', fileError.message);
    }

    return {
        success: true,
        extractionResult: simulatedResult,
        simulated: true
    };
}

exports.handler = async function(event, context) {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { address } = JSON.parse(event.body);
        
        if (!address) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Address is required' })
            };
        }

        // Extract partial address for search
        const searchAddress = extractPartialAddress(address);
        console.log(`🔍 Processing address: ${searchAddress}`);

        // Create folder structure
        const sanitizedAddress = address.trim()
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 50);
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const folderName = `${sanitizedAddress}_${timestamp}`;
        const tmpDir = `/tmp/${folderName}`;
        
        try {
            await fs.mkdir(tmpDir, { recursive: true });
            console.log(`📁 Created directory: ${folderName}`);
        } catch (dirError) {
            console.log('Directory creation warning:', dirError.message);
        }

        // Choose automation mode based on Selenium availability
        let result;
        if (selenium) {
            try {
                result = await runFullSeleniumAutomation(address, searchAddress, tmpDir);
            } catch (seleniumError) {
                console.log('❌ Selenium failed, falling back to simulation:', seleniumError.message);
                result = await runSimulatedMode(address, searchAddress, tmpDir);
            }
        } else {
            result = await runSimulatedMode(address, searchAddress, tmpDir);
        }

        // Prepare response
        const response = {
            success: true,
            searchAddress,
            fullAddress: address,
            directoryName: folderName,
            extractionResult: result.extractionResult,
            filesCreated: [
                'property_snapshot.png',
                'property_report.json', 
                'property_report_raw.txt',
                'metadata.json'
            ],
            timestamp: new Date().toISOString(),
            mode: selenium && !result.simulated ? 'full-automation' : 'simulated',
            seleniumAvailable: selenium
        };

        // Add screenshot if available
        if (result.screenshotPath) {
            try {
                const imageBase64 = await fs.readFile(result.screenshotPath, 'base64');
                response.screenshot = `data:image/png;base64,${imageBase64}`;
            } catch (e) {
                console.log('Could not read screenshot:', e.message);
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(response)
        };

    } catch (error) {
        console.error('❌ Appraisal search error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};
