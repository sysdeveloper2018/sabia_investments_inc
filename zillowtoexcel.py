import json
import pandas as pd
import re

def parse_zillow_blob_to_excel(raw_json_str, output_filename="Property_Data.xlsx"):
    try:
        # 1. Parse the main blob
        data = json.loads(raw_json_str)
        
        # 2. Reach the deep 'gdpClientCache' which is usually a stringified JSON
        # We navigate the path provided in your snippet
        cache_str = data.get("componentProps", {}).get("gdpClientCache", "{}")
        cache_data = json.loads(cache_str)
        
        # 3. Zillow uses a dynamic key for the property. We find the one containing 'property'
        # It's usually the first key in the gdpClientCache dictionary
        first_key = list(cache_data.keys())[0]
        property_info = cache_data[first_key].get("property", {})

        if not property_info:
            print("No property data found in blob.")
            return

        # 4. Extract key fields (Filtering out None/Empty values)
        # We create a dictionary of the most important facts
        flat_data = {
            "Address": f"{property_info.get('streetAddress')}, {property_info.get('city')}, {property_info.get('state')} {property_info.get('zipcode')}",
            "Price": property_info.get("price"),
            "Zestimate": property_info.get("zestimate"),
            "Rent Zestimate": property_info.get("rentZestimate"),
            "Bedrooms": property_info.get("bedrooms"),
            "Bathrooms": property_info.get("bathrooms"),
            "Living Area": f"{property_info.get('livingAreaValue')} {property_info.get('livingAreaUnitsShort')}",
            "Year Built": property_info.get("yearBuilt"),
            "Lot Size": property_info.get("lotSize"),
            "Days on Zillow": property_info.get("daysOnZillow"),
            "Tax Rate (%)": property_info.get("propertyTaxRate"),
        }

        # 5. Merge in 'resoFacts' (The deep technical details)
        reso_facts = property_info.get("resoFacts", {})
        for key, value in reso_facts.items():
            # Only add if the value is not empty/null
            if value is not None and value != [] and value != {}:
                # Convert lists (like parking features) to a single string
                clean_val = ", ".join(value) if isinstance(value, list) else value
                flat_data[f"Fact: {key}"] = clean_val

        # 6. Convert to DataFrame and Export to Excel
        df = pd.DataFrame([flat_data])
        
        # Clean up column names (CamelCase to Space)
        df.columns = [re.sub(r'(?<!^)(?=[A-Z])', ' ', str(c)) for c in df.columns]
        
        df.to_excel(output_filename, index=False)
        print(f"--- SUCCESS ---")
        print(f"Data exported to {output_filename}")

    except Exception as e:
        print(f"An error occurred during parsing: {e}")

# --- EXECUTION ---
# You would paste your long blob into a variable or read it from the .json file we created
# with open("3461_SE_31st_Ter_Ocala_FL_34471.json", "r") as f:
#    raw_blob = f.read()
# parse_zillow_blob_to_excel(raw_blob)