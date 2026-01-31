import asyncio
import json
import os
import re
import pandas as pd
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

# --- PART 1: THE DATA VULTURE (FIXED EXCEL HEADERS) ---
def parse_and_save_to_excel(raw_json_str, input_address):
    try:
        data = json.loads(raw_json_str)
        page_props = data.get("props", {}).get("pageProps", {})
        cache_str = page_props.get("componentProps", {}).get("gdpClientCache", "{}")
        cache_data = json.loads(cache_str)
        
        prop = {}
        for key in cache_data:
            if "property" in cache_data[key]:
                prop = cache_data[key]["property"]
                break
        if not prop: prop = page_props.get("property", {})

        if not prop:
            print("❌ Failure: Detailed data not found.")
            return

        # Initialize the report - We start with ONLY the Address as the first item
        report = {
            "Address": input_address # Renamed and moved to the front
        }

        # Add Core Metrics
        report.update({
            "Price": prop.get("price"),
            "Zestimate": prop.get("zestimate"),
            "Beds": prop.get("bedrooms"),
            "Baths": prop.get("bathrooms"),
            "Sqft": prop.get("livingAreaValue"),
            "Year Built": prop.get("yearBuilt"),
            "Home Type": prop.get("homeType"),
            "URL": f"https://www.zillow.com{prop.get('hdpUrl')}"
        })

        # Sweep standard facts
        reso = prop.get("resoFacts", {})
        for key, val in reso.items():
            if key == 'otherFacts': continue 
            if val is not None and val != [] and val != {}:
                clean_key = f"Fact: {re.sub(r'(?<!^)(?=[A-Z])', ' ', key).strip().capitalize()}"
                if isinstance(val, list):
                    report[clean_key] = ", ".join([str(i.get("text", i)) if isinstance(i, dict) else str(i) for i in val])
                else: report[clean_key] = val

        # Sweep other facts (Materials, Foundation, etc.)
        other_facts = reso.get("otherFacts", [])
        for item in other_facts:
            name, value = item.get("name"), item.get("value")
            if name and value:
                display_name = f"Fact: {re.sub(r'(?<!^)(?=[A-Z])', ' ', name).strip().capitalize()}"
                report[display_name] = value

        # Create DataFrame
        df = pd.DataFrame([report])
        
        # CLEANUP: Ensure No Index Column and correct header order
        # index=False removes the 1st column (numeric index) entirely
        filename = re.sub(r'[^\w\s-]', '', input_address).replace(' ', '_') + "_Report.xlsx"
        df.to_excel(filename, index=False)
        
        print(f"✅ SUCCESS: Data saved to {filename}")
        os.system(f"open '{filename}'")

    except Exception as e:
        print(f"❌ Parser Error: {e}")

# --- PART 2: THE HUMAN-STYLE SCRAPER ---
async def run_scraper(address):
    session_path = os.path.abspath("./zillow_pro_session")
    
    async with Stealth().use_async(async_playwright()) as p:
        context = await p.chromium.launch_persistent_context(
            user_data_dir=session_path,
            headless=False,
            args=["--disable-blink-features=AutomationControlled"]
        )
        page = context.pages[0] if context.pages else await context.new_page()

        print(f"🚀 Launching Zillow...")
        await page.goto("https://www.zillow.com/", wait_until="domcontentloaded")

        try:
            search_box = page.get_by_placeholder("Enter an address, neighborhood, city, or ZIP code")
            await search_box.click(force=True)
            
            print("⌨️ Typing address like a human...")
            await search_box.fill("") 
            await search_box.press_sequentially(address, delay=140)
            await asyncio.sleep(1)
            await search_box.press("Enter")

            print("⏳ Reaching property page...")
            await page.wait_for_url("**/homedetails/**", timeout=60000)
            
            # Stealth Scroll to hydrate all long facts
            await page.evaluate("window.scrollTo({top: 800, behavior: 'smooth'})")
            await asyncio.sleep(3)
            await page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
            await asyncio.sleep(2) 

            blob = await page.evaluate("() => JSON.stringify(window.__NEXT_DATA__ || window.hdpApolloPreloadedData)")
            if blob and blob != "null":
                parse_and_save_to_excel(blob, address)

        except Exception as e:
            print(f"❌ Scraper Error: {e}")
        finally:
            await asyncio.sleep(2)
            await context.close()

target = "4210 SW 6th Ave, Ocala, FL 34471"
asyncio.run(run_scraper(target))