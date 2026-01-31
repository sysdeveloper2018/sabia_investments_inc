import { Property, WorkItem, Contractor } from './types';

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const downloadCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) return;

  // Get headers
  const headers = Object.keys(data[0]);
  
  // Convert data to CSV string
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(fieldName => {
      // Handle string escaping for commas and quotes
      const val = row[fieldName];
      const stringVal = val === null || val === undefined ? '' : String(val);
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      return stringVal;
    }).join(','))
  ].join('\n');

  // Create blob and download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Parses a CSV string into an array of objects.
 * Handles quoted fields correctly (e.g. "Carpet, Tile").
 */
export const parseCSV = (text: string): Record<string, string>[] => {
  const lines = text.split('\n').filter(l => l.trim() !== '');
  if (lines.length === 0) return [];

  // Helper to split a line by comma, respecting quotes
  const splitLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    
    // Clean up quotes from start/end of values
    return result.map(val => val.replace(/^"|"$/g, '').replace(/""/g, '"'));
  };

  const headers = splitLine(lines[0]);
  
  return lines.slice(1).map(line => {
    const values = splitLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    return obj;
  });
};

/**
 * Resizes an image file to a maximum dimension while maintaining aspect ratio.
 * Converts HEIC/HEIF files to JPEG first using heic2any.
 * If conversion fails or browser cannot render image, returns raw base64 of original file.
 * Returns a Promise that resolves to a Base64 string.
 */
export const processImage = async (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
    let sourceFile: File | Blob = file;

    // Robust HEIC Check
    const isHeic = file.name.toLowerCase().endsWith('.heic') || 
                   file.name.toLowerCase().endsWith('.heif') || 
                   file.type === 'image/heic' || 
                   file.type === 'image/heif';

    if (isHeic) {
        try {
            // Access heic2any via window to avoid build-time resolution errors
            const converter = (window as any).heic2any;
            
            if (converter) {
                console.log(`Starting HEIC conversion for: ${file.name}`);
                // Convert to JPEG blob
                const converted = await converter({ 
                    blob: file, 
                    toType: 'image/jpeg',
                    quality: 0.6 // Reduce initial quality to keep memory usage low during conversion
                });
                
                // heic2any can return Blob or Blob[]
                if (Array.isArray(converted)) {
                    sourceFile = converted[0];
                } else {
                    sourceFile = converted;
                }
                console.log("HEIC conversion successful.");
            } else {
                 console.warn("heic2any library missing. Skipping conversion.");
            }
        } catch (error) {
            console.warn(`HEIC conversion failed for ${file.name}. Using original file.`, error);
            // Fallback: Keep sourceFile as 'file' (the original HEIC)
        }
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(sourceFile);
        
        reader.onload = (event) => {
            const rawBase64 = event.target?.result as string;
            const img = new Image();
            
            img.onload = () => {
                // If the browser can load the image (JPEG/PNG/Supported HEIC), resize it
                const elem = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (maxWidth * height) / width;
                    width = maxWidth;
                }

                elem.width = width;
                elem.height = height;
                const ctx = elem.getContext('2d');
                if (!ctx) {
                    // Fallback to raw if canvas fails
                    resolve(rawBase64);
                    return;
                }
                
                ctx.drawImage(img, 0, 0, width, height);
                // Compress to JPEG
                resolve(elem.toDataURL('image/jpeg', quality));
            };
            
            img.onerror = () => {
                // IMPORTANT: If the browser cannot render the format (e.g. raw HEIC on Chrome),
                // we resolve with the RAW file data instead of rejecting.
                // This ensures the file is still saved/uploaded, even if preview isn't available.
                console.warn(`Browser cannot render ${file.name}. Saving raw file data.`);
                resolve(rawBase64);
            };

            img.src = rawBase64;
        };
        
        reader.onerror = (err) => {
             console.error(`FileReader error for ${file.name}`, err);
             reject(err);
        };
    });
};