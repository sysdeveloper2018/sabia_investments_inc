const { Builder, By, until, Options } = require('selenium-webdriver');
const fs = require('fs').promises;
const path = require('path');

// Gemini API integration
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIGURATION ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyCeI6WXnQ1_KadODmOOxFWtwhETwhD-t3w";
const MODEL_ID = "gemini-2.5-flash";

function extractPartialAddress(fullAddress) {
    // Extract address: take first 3 letters after the numbers
    // Example: "1823 8th jeremy st" -> "823 8th   jer"
    if (!fullAddress) return '';
    
    const parts = fullAddress.trim().split(' ');
    if (parts.length < 2) return fullAddress;
    
    // Take everything after the first number, but limit to first 3 words
    const afterNumber = parts.slice(1).join(' ');
    const words = afterNumber.split(' ');
    const partialAddress = words.slice(0, 3).join(' ');
    
    return parts[0] + ' ' + partialAddress;
}

async function extractWithGemini(imagePath) {
    console.log(`🧠 Gemini is performing deep analysis on ${imagePath}...`);
    
    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
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
        
        // Try to parse as JSON
        let jsonData;
        try {
            jsonData = JSON.parse(text);
        } catch (e) {
            // If parsing fails, return the raw text
            jsonData = { rawText: text };
        }
        
        // Save the report
        const reportPath = imagePath.replace(".png", "_report.json");
        await fs.writeFile(reportPath, JSON.stringify(jsonData, null, 2));
        console.log(`✅ Report saved to: ${reportPath}`);
        
        return jsonData;
        
    } catch (error) {
        console.error(`❌ Gemini Extraction Error: ${error}`);
        throw error;
    }
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
        console.log(`🔍 Searching for address: ${searchAddress}`);

        // Setup Chrome options
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
            await driver.sleep(5000); // Wait for results

            // Create folder structure (in Netlify, we'll use /tmp)
            const folderName = searchAddress.trim().replace(/\s+/g, '_');
            const tmpDir = `/tmp/${folderName}`;
            await fs.mkdir(tmpDir, { recursive: true });

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
            const extractionResult = await extractWithGemini(screenshotPath);

            // Convert screenshot to base64 for response
            const imageBase64 = await fs.readFile(screenshotPath, 'base64');

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    searchAddress,
                    extractionResult,
                    screenshot: `data:image/png;base64,${imageBase64}`,
                    timestamp: new Date().toISOString()
                })
            };

        } finally {
            if (driver) {
                await driver.quit();
            }
        }

    } catch (error) {
        console.error('❌ Automation Error:', error);
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
