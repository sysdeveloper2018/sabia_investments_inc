import asyncio
import json
import os
import re
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

async def scrape_zillow_human_mode(address):
    # This folder will store your 'human' cookies so you don't get stuck in a loop
    user_data_path = os.path.join(os.getcwd(), "zillow_user_session")
    
    async with Stealth().use_async(async_playwright()) as p:
        # Launch with a persistent profile
        context = await p.chromium.launch_persistent_context(
            user_data_dir=user_data_path,
            headless=False, # Must be False so you can solve the check
            args=["--disable-blink-features=AutomationControlled"]
        )
        
        page = context.pages[0] if context.pages else await context.new_page()
        
        print("Navigating to Zillow...")
        await page.goto("https://www.zillow.com/", wait_until="domcontentloaded")

        # Search for the property
        search_input = page.get_by_placeholder("Enter an address, neighborhood, city, or ZIP code")
        await search_input.click()
        await search_input.fill(address)
        await page.keyboard.press("Enter")
        
        print("If you see 'Press and Hold', do it now. The script will wait...")

        try:
            # We wait specifically for the 'homedetails' URL to appear
            # This confirms we bypassed the 404/redirect trap
            await page.wait_for_url("**/homedetails/**", timeout=60000)
            print("Successfully reached the property page!")

            # Snatched the hidden data
            data_script = await page.wait_for_selector("script#hdpApolloPreloadedData", state="attached")
            if data_script:
                content = await data_script.inner_text()
                property_data = json.loads(content)
                
                filename = f"{address.replace(' ', '_').replace(',', '')}.json"
                with open(filename, "w", encoding="utf-8") as f:
                    json.dump(property_data, f, indent=4)
                print(f"Data saved to {filename}")

        except Exception as e:
            print(f"Extraction failed: {e}")
            print("If you are on a 404 page, try clicking 'Return to Zillow' manually while the script is running.")
        
        finally:
            await asyncio.sleep(5)
            await context.close()

address_to_scrape = "3461 SE 31st Ter, Ocala, FL 34471"
asyncio.run(scrape_zillow_human_mode(address_to_scrape))