import asyncio
import json
import os
import re
import pandas as pd
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

# --- PART 1: THE DATA VULTURE (FIXED PARSING) ---
def parse_and_save_to_excel(raw_json_str, address):
    try:
        data = json.loads(raw_json_str)
        page_props = data.get("props", {}).get("pageProps", {})
        component_props = page_props.get("componentProps", {})
        cache_str = component_props.get("gdpClientCache", "{}")
        cache_data = json.loads(cache_str)
        
        first_key = list(cache_data.keys())[0]
        prop = cache_data[first_key].get("property", {})

        if not prop:
            print("❌ No property data found.")
            return

        report = {
            "Address": address,
            "Price": prop.get("price"),
            "Zestimate": prop.get("zestimate"),
            "Beds": prop.get("bedrooms"),
            "Baths": prop.get("bathrooms"),
            "Sqft": prop.get("livingAreaValue"),
            "Year Built": prop.get("yearBuilt"),
            "URL": f"https://www.zillow.com{prop.get('hdpUrl')}"
        }

        # 1. PARSE STANDARD RESO FACTS
        reso = prop.get("resoFacts", {})
        for key, val in reso.items():
            # Skip the 'otherFacts' key here, we handle it separately below
            if key == 'otherFacts': continue 
            
            if val is not None and val != [] and val != {}:
                clean_key = f"Fact: {re.sub(r'(?<!^)(?=[A-Z])', ' ', key).capitalize()}"
                if isinstance(val, list):
                    report[clean_key] = ", ".join([str(i.get("text", i)) if isinstance(i, dict) else str(i) for i in val])
                else:
                    report[clean_key] = val

        # 2. FIX: PARSE THE 'OTHER FACTS' LIST (Flooring, Sewer, Utilities, etc.)
        other_facts = reso.get("otherFacts", [])
        for item in other_facts:
            name = item.get("name")
            value = item.get("value")
            if name and value:
                # Format header (e.g., 'RoadSurfaceType' -> 'Fact: Road Surface Type')
                display_name = f"Fact: {re.sub(r'(?<!^)(?=[A-Z])', ' ', name).strip().capitalize()}"
                report[display_name] = value

        # Export to Excel
        df = pd.DataFrame([report])
        filename = re.sub(r'[^\w\s-]', '', address).replace(' ', '_') + "_Comprehensive.xlsx"
        df.to_excel(filename, index=False)
        
        print(f"✅ SUCCESS: {len(report)} facts parsed and saved to {filename}")
        os.system(f"open '{filename}'")

    except Exception as e:
        print(f"❌ Parser Error: {e}")

# --- PART 2: THE HUMAN-STYLE SCRAPER ---
async def run_scraper(address):
    user_session = os.path.abspath("./zillow_pro_session")
    
    async with Stealth().use_async(async_playwright()) as p:
        context = await p.chromium.launch_persistent_context(
            user_data_dir=user_session,
            headless=False,
            args=["--disable-blink-features=AutomationControlled"]
        )
        page = context.pages[0] if context.pages else await context.new_page()

        print(f"🚀 Navigating to Zillow...")
        await page.goto("https://www.zillow.com/", wait_until="domcontentloaded")

        try:
            search_box = page.get_by_placeholder("Enter an address, neighborhood, city, or ZIP code")
            
            # Anti-scroll force click
            await search_box.click(force=True)
            
            print("⌨️ Typing address character-by-character...")
            await search_box.fill("") 
            await search_box.press_sequentially(address, delay=150)
            
            await asyncio.sleep(1)
            await search_box.press("Enter")

            print("⏳ Waiting for property page... (Solve CAPTCHA if needed)")
            await page.wait_for_url("**/homedetails/**", timeout=60000)
            await asyncio.sleep(7) 

            blob = await page.evaluate("() => JSON.stringify(window.__NEXT_DATA__ || window.hdpApolloPreloadedData)")
            if blob and blob != "null":
                parse_and_save_to_excel(blob, address)

        except Exception as e:
            print(f"❌ Scraper Error: {e}")
        finally:
            await asyncio.sleep(2)
            await context.close()

target = "3575 SW 24th Avenue Rd, Ocala, FL 34471"
asyncio.run(run_scraper(target))