import React, { useState, useRef, useEffect } from 'react';
import { Property, PropertyType, PropertyDocument, LinkItem } from '../types';
import { ChevronDown, ChevronUp, Plus, MapPin, DollarSign, Home, Download, Image as ImageIcon, Upload, X, Pencil, Wrench, Trees, FileSpreadsheet, CheckCircle, Trash2, AlertTriangle, FileText, Map, Landmark, Hammer, Calculator, ArrowLeft, ExternalLink, Eye, Loader2, Clock, Link as LinkIcon, MessageSquare, FolderInput, StopCircle, ChevronLeft, ChevronRight, Maximize2, Box } from 'lucide-react';
import { downloadCSV, parseCSV, processImage, formatCurrency } from '../utils';

interface PropertyManagerProps {
  properties: Property[];
  onAddProperty: (p: Property) => Promise<void>;
  onUpdateProperty: (p: Property) => void;
  onDeleteProperty: (id: string) => void;
  onChatClick: (id: string) => void;
}

// Custom Tooltip for instant feedback
const QuickTooltip: React.FC<{ content: string; children?: React.ReactNode }> = ({ content, children }) => (
  <div className="group/tooltip relative flex items-center justify-center w-full lg:w-auto h-full">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block z-50 pointer-events-none w-max max-w-[150px]">
       <div className="relative">
         <div className="bg-slate-950 text-white text-[10px] font-bold px-2 py-1.5 rounded border border-slate-700 shadow-xl text-center uppercase tracking-wider relative z-10">
           {content}
         </div>
         <div className="w-2 h-2 bg-slate-950 border-r border-b border-slate-700 transform rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1 z-0"></div>
       </div>
    </div>
  </div>
);

// SafeImage Component: Handles Broken/Unsupported Images (like raw HEIC on Chrome)
const SafeImage: React.FC<{ src: string, alt: string, className?: string, onClick?: () => void }> = ({ src, alt, className, onClick }) => {
    const [error, setError] = useState(false);
    
    if (error) {
        return (
            <div className={`flex flex-col items-center justify-center bg-slate-800 text-slate-500 border border-slate-700 ${className}`} onClick={onClick}>
                <FileText size={20} className="mb-1 opacity-50" />
                <span className="text-[9px] font-bold uppercase tracking-wide">File Saved</span>
                <span className="text-[8px] opacity-70">(Preview N/A)</span>
            </div>
        );
    }
    
    return (
        <img 
            src={src} 
            alt={alt} 
            className={className} 
            onError={() => setError(true)} 
            loading="lazy" 
            onClick={onClick}
        />
    );
};

export const PropertyManager: React.FC<PropertyManagerProps> = ({ properties, onAddProperty, onUpdateProperty, onDeleteProperty, onChatClick }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [galleryViewId, setGalleryViewId] = useState<string | null>(null); // New dedicated gallery view state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null); // Lightbox index state
  
  const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [processStatusText, setProcessStatusText] = useState('');
  
  // Cancellation Ref
  const cancelUploadRef = useRef(false);
  
  // Pagination state for Gallery (in Details view)
  const [visibleGalleryCount, setVisibleGalleryCount] = useState(12);

  // Accordion State
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    financial: false,
    renovation: false,
    details: false,
    exterior: false,
    systems: false,
    land: false,
    improvements: false,
    images: false,
    documents: false,
    links: false
  });

  const formTopRef = useRef<HTMLDivElement>(null);
  const gallerySectionRef = useRef<HTMLDivElement>(null);

  // References
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Improvement Input State
  const [improvementInput, setImprovementInput] = useState('');
  
  // Link Input State
  const [linkInput, setLinkInput] = useState({ title: '', url: '' });

  // Repair Detail Input State
  const [repairInput, setRepairInput] = useState({ description: '', cost: '' });

  // New Property State
  const [newProp, setNewProp] = useState<Partial<Property>>({
    type: PropertyType.SINGLE_FAMILY,
    status: 'Acquisition',
    galleryImages: [],
    documents: [],
    improvements: [],
    repairDetails: [],
    customLinks: []
  });

  // Reset pagination when viewing a new property
  useEffect(() => {
    setVisibleGalleryCount(12);
  }, [viewingId, isFormOpen]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (lightboxIndex === null || !galleryViewId) return;
        const prop = properties.find(p => p.id === galleryViewId);
        if (!prop || !prop.galleryImages) return;

        if (e.key === 'ArrowRight') {
            setLightboxIndex((prev) => (prev !== null && prev < prop.galleryImages!.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowLeft') {
            setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prop.galleryImages!.length - 1));
        } else if (e.key === 'Escape') {
            setLightboxIndex(null);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, galleryViewId, properties]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const scrollToGallery = () => {
    if (gallerySectionRef.current) {
        gallerySectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;

    if (type === 'number') {
        finalValue = parseFloat(value) || 0;
    } else if (type === 'checkbox') {
        finalValue = (e.target as HTMLInputElement).checked;
    }

    setNewProp(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  const cancelUpload = () => {
    cancelUploadRef.current = true;
    setProcessStatusText('Cancelling...');
  };

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setImageProcessing(true);
          setProcessStatusText('Optimizing cover...');
          try {
              const base64 = await processImage(e.target.files[0], 800);
              setNewProp(prev => ({ ...prev, imageUrl: base64 }));
          } catch (error) {
              console.error("Error processing image", error);
              // processImage now resolves raw data on error, but if something catastrophic happens:
              alert("Failed to process cover image.");
          } finally {
              setImageProcessing(false);
              setProcessStatusText('');
              if (mainImageInputRef.current) mainImageInputRef.current.value = '';
          }
      }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          setImageProcessing(true);
          cancelUploadRef.current = false;
          setProcessStatusText(`Preparing ${e.target.files.length} images...`);
          
          const fileList = Array.from(e.target.files) as File[];
          const results: string[] = [];
          
          for (let i = 0; i < fileList.length; i++) {
             if (cancelUploadRef.current) {
                 console.log("Upload cancelled by user.");
                 break;
             }

             const file = fileList[i];
             
             if (!file.type.startsWith('image/') && !file.name.toLowerCase().match(/\.(heic|heif|jpg|jpeg|png|webp)$/)) {
                 continue;
             }

             setProcessStatusText(`Processing ${i + 1}/${fileList.length}...`);
             try {
                // processImage will now return raw base64 if conversion fails, ensuring upload succeeds
                const base64 = await processImage(file, 800);
                results.push(base64);
             } catch (error) {
                 console.error(`Error processing ${file.name}`, error);
             }
          }

          if (results.length > 0) {
              setNewProp(prev => ({
                  ...prev,
                  galleryImages: [...(prev.galleryImages || []), ...results]
              }));
          }
          
          setImageProcessing(false);
          setProcessStatusText('');
          if (galleryInputRef.current) galleryInputRef.current.value = '';
          if (folderInputRef.current) folderInputRef.current.value = '';
      }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = () => {
              const newDoc: PropertyDocument = {
                  id: Date.now().toString(),
                  propertyId: newProp.id || '',
                  name: file.name,
                  type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
                  uploadDate: new Date().toISOString().split('T')[0],
                  data: reader.result as string
              };
              setNewProp(prev => ({
                  ...prev,
                  documents: [...(prev.documents || []), newDoc]
              }));
          };
          reader.readAsDataURL(file);
      }
  };

  const removeGalleryImage = (index: number) => {
      setNewProp(prev => ({
          ...prev,
          galleryImages: prev.galleryImages?.filter((_, i) => i !== index)
      }));
  };

  const removeDocument = (id: string) => {
      setNewProp(prev => ({
          ...prev,
          documents: prev.documents?.filter(d => d.id !== id)
      }));
  };

  const addImprovement = () => {
    if (!improvementInput.trim()) return;
    setNewProp(prev => ({
        ...prev,
        improvements: [...(prev.improvements || []), improvementInput.trim()]
    }));
    setImprovementInput('');
  };

  const removeImprovement = (index: number) => {
    setNewProp(prev => ({
        ...prev,
        improvements: prev.improvements?.filter((_, i) => i !== index)
    }));
  };

  const addLink = () => {
    if (!linkInput.title || !linkInput.url) return;
    const newLink: LinkItem = { 
        id: Date.now().toString(), 
        title: linkInput.title, 
        url: linkInput.url 
    };
    setNewProp(prev => ({
        ...prev,
        customLinks: [...(prev.customLinks || []), newLink]
    }));
    setLinkInput({ title: '', url: '' });
  };

  const removeLink = (id: string) => {
    setNewProp(prev => ({
        ...prev,
        customLinks: prev.customLinks?.filter(l => l.id !== id)
    }));
  };

  const addRepairItem = () => {
    if (!repairInput.description.trim() || !repairInput.cost) return;
    const cost = parseFloat(repairInput.cost);
    const newItem = { 
        id: Date.now().toString(), 
        description: repairInput.description, 
        cost: cost 
    };

    const updatedRepairs = [...(newProp.repairDetails || []), newItem];
    const totalRepairCost = updatedRepairs.reduce((sum, item) => sum + item.cost, 0);

    setNewProp(prev => ({
        ...prev,
        repairDetails: updatedRepairs,
        estimatedRepairCost: totalRepairCost // Auto-update total
    }));
    setRepairInput({ description: '', cost: '' });
  };

  const removeRepairItem = (index: number) => {
      const updatedRepairs = newProp.repairDetails?.filter((_, i) => i !== index) || [];
      const totalRepairCost = updatedRepairs.reduce((sum, item) => sum + item.cost, 0);
      
      setNewProp(prev => ({
          ...prev,
          repairDetails: updatedRepairs,
          estimatedRepairCost: totalRepairCost
      }));
  };

  // --- SMART DROPBOX HANDLER ---
  const handleDropboxClick = async (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();

      // Robust check for mobile/tablet devices
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                       (typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1);
      
      if (isMobile) {
          // Attempt to use the Native Share Sheet
          // This allows the user to see "More apps..." and select Dropbox manually from the system list.
          // This resolves the issue where users were stuck in the "Photo Library" menu.
          if (navigator.share) {
              try {
                  await navigator.share({
                      title: 'Open Dropbox',
                      url: 'https://www.dropbox.com/home'
                  });
                  return;
              } catch (error) {
                  // Ignore user cancellation (AbortError)
                  // If genuine error, fall through to deep link
                  if ((error as Error).name === 'AbortError') return;
              }
          }

          // Fallback: Deep Link Anchor Click
          // Tries to launch the app directly if Share Sheet isn't available or fails
          const link = document.createElement('a');
          link.href = 'dropbox://www.dropbox.com/home'; 
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => document.body.removeChild(link), 500);
      } else {
          // Desktop: Open web in new tab
          window.open('https://www.dropbox.com/home', '_blank');
      }
  };

  const handleEdit = (prop: Property) => {
      setEditingId(prop.id);
      setNewProp({ 
          ...prop, 
          improvements: prop.improvements || [], 
          repairDetails: prop.repairDetails || [],
          customLinks: prop.customLinks || []
      });
      setIsFormOpen(true);
      setExpandedSections({
          basic: true,
          financial: false,
          renovation: true, 
          details: false,
          exterior: false,
          systems: false,
          land: false,
          improvements: false,
          images: true, // Auto open images since we might be editing them
          documents: false,
          links: true
      });
      setTimeout(() => {
          formTopRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
  };

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setNewProp({ 
        type: PropertyType.SINGLE_FAMILY, 
        status: 'Acquisition', 
        galleryImages: [], 
        documents: [], 
        improvements: [],
        repairDetails: [],
        customLinks: []
    });
    setImprovementInput('');
    setRepairInput({ description: '', cost: '' });
    setLinkInput({ title: '', url: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProp.address) return; 

    const baseProperty: any = {
        purchasePrice: 0,
        sqFt: 0,
        estimatedRepairCost: 0,
        afterRepairValue: 0,
        annualTaxes: 0,
        insuranceCost: 0,
        beds: 0,
        baths: 0,
        yearBuilt: new Date().getFullYear(),
        imageUrl: `https://picsum.photos/400/300?random=${Date.now()}`,
        galleryImages: [],
        documents: [],
        improvements: [],
        repairDetails: [],
        customLinks: [],
        hasGarage: false,
        hasPool: false,
        ...newProp
    };

    if (editingId) {
        onUpdateProperty({ ...baseProperty, id: editingId });
    } else {
        onAddProperty({ ...baseProperty, id: Date.now().toString(), purchaseDate: new Date().toISOString().split('T')[0] });
    }
    
    resetForm();
  };

  const handleExport = () => {
    downloadCSV(properties, 'sabia_properties_export');
  };

  const handleImportClick = () => {
    csvInputRef.current?.click();
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
        onDeleteProperty(deleteConfirmId);
        setDeleteConfirmId(null);
        if (viewingId === deleteConfirmId) {
            setViewingId(null);
        }
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      // ... same as before
      const file = e.target.files?.[0];
      if (!file) return;

      try {
          setImportStatus('processing');
          const text = await file.text();
          const data = parseCSV(text);
          
          if (data.length === 0) {
              alert("No data found in CSV");
              setImportStatus('idle');
              return;
          }

          let importCount = 0;
          for (const row of data) {
              // ... logic omitted for brevity, assumed same ...
              // Using updated onAddProperty logic from context
               let address = row['Address'] || '';
              let city = '';
              let state = '';
              let zip = '';
              
              const addrParts = address.split(',').map(s => s.trim());
              if (addrParts.length >= 3) {
                  address = addrParts[0];
                  city = addrParts[1];
                  const stateZip = addrParts[2].split(' ');
                  state = stateZip[0];
                  zip = stateZip[1] || '';
              }

              const parseMoney = (val: string) => {
                  if (!val) return 0;
                  return parseFloat(val.replace(/[$,]/g, '')) || 0;
              };

              const parseBool = (val: string) => {
                  if (!val) return false;
                  const v = val.toLowerCase();
                  return v === 'true' || v === 'yes' || v === '1';
              };

              const newProperty: Property = {
                  id: Date.now().toString() + Math.random().toString().slice(2, 5) + importCount,
                  address: address,
                  city: city,
                  state: state,
                  zip: zip,
                  type: row['Fact: Home type'] === 'SingleFamily' ? PropertyType.SINGLE_FAMILY : 
                        row['Fact: Home type'] === 'MultiFamily' ? PropertyType.MULTI_FAMILY : PropertyType.SINGLE_FAMILY,
                  purchasePrice: parseMoney(row['Price']),
                  purchaseDate: new Date().toISOString().split('T')[0],
                  sqFt: parseFloat(row['Sqft']) || 0,
                  beds: parseFloat(row['Beds']) || parseFloat(row['Fact: Bedrooms']) || 0,
                  baths: parseFloat(row['Baths']) || parseFloat(row['Fact: Bathrooms']) || 0,
                  yearBuilt: parseInt(row['Year Built']) || parseInt(row['Fact: Year built']) || 0,
                  estimatedRepairCost: 0, 
                  afterRepairValue: parseMoney(row['Zestimate']),
                  annualTaxes: 0,
                  insuranceCost: 0,
                  zestimate: parseMoney(row['Zestimate']),
                  listingUrl: row['URL'],
                  lotSize: row['Fact: Lot size'],
                  hasGarage: parseBool(row['Fact: Has garage']) || parseBool(row['Fact: Garage y n']),
                  parkingCapacity: parseFloat(row['Fact: Parking capacity']) || 0,
                  parkingFeatures: row['Fact: Parking features'],
                  stories: parseFloat(row['Fact: Stories total']) || 1,
                  roofType: row['Fact: Roof'],
                  constructionMaterials: row['Fact: Construction materials'],
                  flooring: row['Fact: Flooring'],
                  appliances: row['Fact: Appliances'],
                  heatingType: row['Fact: Heating'] || (parseBool(row['Fact: Heating y n']) ? 'Yes' : ''),
                  coolingType: row['Fact: Cooling'] || (parseBool(row['Fact: Cooling y n']) ? 'Yes' : ''),
                  sewer: row['Fact: Sewer'],
                  waterSource: row['Fact: Water source'],
                  hasPool: parseBool(row['Fact: Pool private y n']),
                  poolFeatures: row['Fact: Pool features'],
                  zoning: row['Fact: Zoning'],
                  lotFeatures: row['Fact: Lot features'],
                  improvements: [],
                  repairDetails: [],
                  customLinks: [],
                  status: 'Acquisition',
                  imageUrl: `https://picsum.photos/400/300?random=${Date.now() + importCount}`,
                  galleryImages: [],
                  documents: []
              };
              await onAddProperty(newProperty);
              importCount++;
          }
          
          setImportStatus('success');
          setTimeout(() => setImportStatus('idle'), 4000);
          if (csvInputRef.current) csvInputRef.current.value = '';

      } catch (error) {
          console.error("Import failed", error);
          alert("Failed to parse CSV file.");
          setImportStatus('idle');
      }
  };

  const DenseField = ({ label, value }: { label: string, value: string | number | undefined | null }) => (
      <div className="flex flex-col">
          <dt className="text-[9px] uppercase text-slate-500 font-extrabold tracking-widest">{label}</dt>
          <dd className="text-sm text-slate-200 font-medium truncate leading-tight mt-0.5" title={String(value || '')}>{value || '-'}</dd>
      </div>
  );

  const inputClass = "w-full p-2 bg-slate-800 border border-slate-700 rounded-md focus:ring-2 focus:ring-vestra-gold focus:border-transparent outline-none text-slate-100 placeholder-slate-500 text-sm";
  const labelClass = "block text-xs font-bold text-slate-400 uppercase mb-1";
  const sectionBtnClass = "w-full flex items-center justify-between p-4 hover:bg-slate-800/50 text-left transition-colors border-b border-slate-800 last:border-0";
  const sectionTitleClass = "flex items-center gap-2 font-medium text-slate-100";

  // --- Dedicated Gallery Page Renderer ---
  const renderGalleryPage = () => {
      const prop = properties.find(p => p.id === galleryViewId);
      if (!prop) {
          return (
              <div className="flex flex-col items-center justify-center p-12 h-screen text-center animate-in fade-in">
                  <AlertTriangle size={48} className="text-red-500 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Gallery Not Found</h3>
                  <button onClick={() => setGalleryViewId(null)} className="mt-4 px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white font-bold transition-colors">
                      Back to Assets
                  </button>
              </div>
          );
      }

      const images = prop.galleryImages || [];

      return (
          <div className="animate-in slide-in-from-bottom-4 duration-300 min-h-screen pb-12">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
                  <div>
                      <button onClick={() => setGalleryViewId(null)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-2">
                          <ArrowLeft size={20} />
                          <span className="font-bold text-xs uppercase tracking-wide">Back to Assets</span>
                      </button>
                      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                          <ImageIcon className="text-vestra-gold" /> 
                          {prop.address} Gallery
                      </h1>
                      <p className="text-sm text-slate-400 mt-1">{images.length} Photos • {prop.city}, {prop.state}</p>
                  </div>
                  <div className="flex gap-2 items-center flex-wrap">
                      <button 
                          onClick={(e) => handleDropboxClick(e)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors text-sm font-bold shadow-lg w-full md:w-auto justify-center"
                      >
                          <Box size={16} /> Dropbox
                      </button>
                      <button 
                          onClick={() => setViewingId(prop.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded hover:bg-slate-700 transition-colors border border-slate-700 text-sm font-bold w-full md:w-auto justify-center"
                      >
                          <Eye size={16} /> View Details
                      </button>
                      <button 
                          onClick={() => handleEdit(prop)}
                          className="flex items-center gap-2 px-4 py-2 bg-vestra-gold text-slate-900 rounded hover:bg-yellow-500 transition-colors text-sm font-bold shadow-lg w-full md:w-auto justify-center"
                      >
                          <Upload size={16} /> Manage Photos
                      </button>
                  </div>
              </div>

              {/* Grid */}
              {images.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/50">
                      <ImageIcon size={64} className="text-slate-700 mb-4" />
                      <p className="text-slate-500 text-lg font-medium">No images uploaded yet.</p>
                      <div className="flex gap-4 mt-4">
                          <button 
                              onClick={(e) => handleDropboxClick(e)}
                              className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                          >
                              <Box size={16} /> Open Dropbox
                          </button>
                          <button 
                              onClick={() => handleEdit(prop)}
                              className="px-6 py-2 bg-vestra-gold text-slate-900 rounded font-bold hover:bg-yellow-500 transition-colors"
                          >
                              Upload Photos
                          </button>
                      </div>
                  </div>
              ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {images.map((img, idx) => (
                          <div 
                              key={idx} 
                              className="group relative aspect-square bg-slate-900 rounded-lg overflow-hidden border border-slate-800 cursor-pointer hover:border-vestra-gold transition-all shadow-md"
                              onClick={() => setLightboxIndex(idx)}
                          >
                              <SafeImage src={img} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <Maximize2 size={24} className="text-white drop-shadow-md" />
                              </div>
                              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                  #{idx + 1}
                              </div>
                          </div>
                      ))}
                  </div>
              )}

              {/* Lightbox Overlay */}
              {lightboxIndex !== null && (
                  <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
                      {/* Close Button */}
                      <button 
                          onClick={() => setLightboxIndex(null)}
                          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 bg-black/50 rounded-full transition-colors z-50"
                      >
                          <X size={32} />
                      </button>

                      {/* Nav Buttons */}
                      <button 
                          onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => (prev! > 0 ? prev! - 1 : images.length - 1)); }}
                          className="absolute left-4 text-white p-3 bg-black/50 hover:bg-slate-800 rounded-full transition-colors z-50"
                      >
                          <ChevronLeft size={32} />
                      </button>
                      <button 
                          onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => (prev! < images.length - 1 ? prev! + 1 : 0)); }}
                          className="absolute right-4 text-white p-3 bg-black/50 hover:bg-slate-800 rounded-full transition-colors z-50"
                      >
                          <ChevronRight size={32} />
                      </button>

                      {/* Main Image */}
                      <div className="relative max-w-full max-h-full p-4 flex flex-col items-center">
                          <SafeImage 
                              src={images[lightboxIndex]} 
                              alt={`Full view ${lightboxIndex}`} 
                              className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl border border-slate-800"
                          />
                          <div className="mt-4 text-white text-sm font-medium bg-black/60 px-4 py-2 rounded-full">
                              {lightboxIndex + 1} / {images.length}
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  };

  const renderDetailsView = () => {
    const prop = properties.find(p => p.id === viewingId);
    
    if (!prop) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center animate-in fade-in">
                <AlertTriangle size={48} className="text-red-500 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Property Not Found</h3>
                <p className="text-slate-400 mb-6">The details for this asset could not be loaded.</p>
                <button onClick={() => setViewingId(null)} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white font-bold transition-colors">
                    Back to List
                </button>
            </div>
        );
    }

    const fullAddress = `${prop.address}, ${prop.city}, ${prop.state} ${prop.zip}`;
    const displayedImages = prop.galleryImages?.slice(0, visibleGalleryCount) || [];
    const hasMoreImages = (prop.galleryImages?.length || 0) > visibleGalleryCount;

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            {/* Header / Nav */}
            <div className="flex items-center justify-between">
                <button onClick={() => setViewingId(null)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                    <span className="font-bold text-sm uppercase tracking-wide">Back to Assets</span>
                </button>
                <div className="flex gap-2">
                    <QuickTooltip content="Open Dropbox">
                        <button 
                            onClick={(e) => handleDropboxClick(e)}
                            className="p-2 text-blue-400 hover:bg-blue-900/20 rounded transition-colors"
                        >
                            <Box size={18} />
                        </button>
                    </QuickTooltip>
                    <QuickTooltip content="Open Chat Log">
                        <button 
                            onClick={() => onChatClick(prop.id)} 
                            className="p-2 text-green-400 hover:bg-green-900/20 rounded transition-colors"
                        >
                            <MessageSquare size={18} />
                        </button>
                    </QuickTooltip>
                    {prop.galleryImages && prop.galleryImages.length > 0 && (
                        <QuickTooltip content="Open Full Gallery">
                            <button 
                                onClick={() => setGalleryViewId(prop.id)} 
                                className="flex items-center gap-2 bg-slate-800 text-vestra-gold px-4 py-2 rounded font-bold text-sm hover:bg-slate-700 transition-colors border border-slate-700"
                            >
                                <ImageIcon size={16} /> Gallery Page
                            </button>
                        </QuickTooltip>
                    )}
                    <QuickTooltip content="Delete">
                        <button onClick={() => setDeleteConfirmId(prop.id)} className="p-2 text-red-500 hover:bg-red-900/20 rounded transition-colors">
                            <Trash2 size={18} />
                        </button>
                    </QuickTooltip>
                    <QuickTooltip content="Edit Data">
                        <button onClick={() => handleEdit(prop)} className="flex items-center gap-2 bg-vestra-gold text-slate-900 px-4 py-2 rounded font-bold text-sm hover:bg-yellow-500 transition-colors">
                            <Pencil size={16} /> Edit Data
                        </button>
                    </QuickTooltip>
                </div>
            </div>

            {/* Main Dense Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Column 1: Visuals & Financials (4 cols) */}
                <div className="md:col-span-4 space-y-4">
                    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
                        <div className="h-56 md:h-64 relative group">
                             <SafeImage src={prop.imageUrl || ''} alt="Main" className="w-full h-full object-cover" />
                             <div className="absolute top-3 right-3">
                                 <span className={`px-3 py-1 rounded text-xs font-bold border backdrop-blur-md shadow-sm
                                    ${prop.status === 'Sold' ? 'bg-green-900/80 text-green-400 border-green-700' : 
                                      prop.status === 'Rehab' ? 'bg-blue-900/80 text-blue-400 border-blue-700' :
                                      'bg-slate-900/80 text-white border-slate-700'}`}>
                                     {prop.status}
                                 </span>
                             </div>
                        </div>
                        <div className="p-4 border-t border-slate-800">
                            <h2 className="text-xl font-bold text-white leading-tight">{prop.address}</h2>
                            <p className="text-slate-400 text-sm mt-1 mb-4 flex items-center gap-1">
                                <MapPin size={14} /> {prop.city}, {prop.state} {prop.zip}
                            </p>
                            
                            <div className="grid grid-cols-2 gap-y-4 gap-x-2 bg-slate-800/50 p-3 rounded border border-slate-700">
                                <DenseField label="Purchase Price" value={formatCurrency(prop.purchasePrice)} />
                                <DenseField label="Target ARV" value={formatCurrency(prop.afterRepairValue)} />
                                <DenseField label="Est. Rehab Budget" value={formatCurrency(prop.estimatedRepairCost)} />
                                <DenseField label="Current Zestimate" value={formatCurrency(prop.zestimate || 0)} />
                            </div>

                            <div className="mt-4 flex gap-2">
                                <QuickTooltip content="Open in Maps">
                                    <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`, '_blank')} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded flex items-center justify-center gap-1 w-full">
                                        <Map size={14} /> Maps
                                    </button>
                                </QuickTooltip>
                                {prop.listingUrl && (
                                    <QuickTooltip content="View Listing">
                                        <button onClick={() => window.open(prop.listingUrl, '_blank')} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded flex items-center justify-center gap-1 w-full">
                                            <ExternalLink size={14} /> Listing
                                        </button>
                                    </QuickTooltip>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Compact Gallery with Pagination */}
                    {prop.galleryImages && prop.galleryImages.length > 0 && (
                        <div ref={gallerySectionRef} className="bg-slate-900 rounded-xl border border-slate-800 p-4 scroll-mt-20">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <ImageIcon size={14} /> Photo Gallery ({prop.galleryImages.length})
                                </h3>
                                <button 
                                    onClick={() => setGalleryViewId(prop.id)}
                                    className="text-[10px] text-vestra-gold hover:underline font-bold"
                                >
                                    View Full Gallery
                                </button>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {displayedImages.map((img, i) => (
                                    <SafeImage 
                                        key={i} 
                                        src={img} 
                                        alt={`Gallery ${i}`} 
                                        className="aspect-square object-cover rounded border border-slate-700 cursor-pointer hover:border-vestra-gold" 
                                        onClick={() => setGalleryViewId(prop.id)} // Click opens full gallery page
                                    />
                                ))}
                            </div>
                            {hasMoreImages && (
                                <button 
                                    onClick={() => setGalleryViewId(prop.id)} // Go to full gallery instead of just loading more here
                                    className="w-full mt-3 py-2 bg-slate-800 text-xs text-vestra-gold font-bold rounded hover:bg-slate-700 transition-colors border border-slate-700 flex items-center justify-center gap-1"
                                >
                                    <Plus size={12} /> View All {prop.galleryImages.length} Photos
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Column 2: Specs & Systems (4 cols) */}
                <div className="md:col-span-4 space-y-4">
                    {/* Interior Specs */}
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                         <h3 className="text-xs font-bold text-vestra-gold uppercase mb-3 border-b border-slate-800 pb-2 flex items-center gap-2">
                             <Home size={14} /> Structure & Interior
                         </h3>
                         <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                             <DenseField label="Square Ft" value={`${prop.sqFt?.toLocaleString()} sqft`} />
                             <DenseField label="Layout" value={`${prop.beds || '-'} Bed / ${prop.baths || '-'} Bath`} />
                             <DenseField label="Year Built" value={prop.yearBuilt} />
                             <DenseField label="Stories" value={prop.stories} />
                             <DenseField label="Flooring" value={prop.flooring} />
                             <DenseField label="Foundation" value={prop.constructionMaterials} />
                         </div>
                    </div>

                    {/* Exterior Specs */}
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                         <h3 className="text-xs font-bold text-vestra-gold uppercase mb-3 border-b border-slate-800 pb-2 flex items-center gap-2">
                             <Trees size={14} /> Exterior & Lot
                         </h3>
                         <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                             <DenseField label="Lot Size" value={prop.lotSize} />
                             <DenseField label="Garage" value={prop.hasGarage ? 'Yes' : 'No'} />
                             <DenseField label="Parking" value={`${prop.parkingCapacity || 0} Spaces`} />
                             <DenseField label="Pool" value={prop.hasPool ? 'Yes' : 'No'} />
                             <DenseField label="Roof Type" value={prop.roofType} />
                             <DenseField label="Zoning" value={prop.zoning} />
                         </div>
                    </div>

                    {/* Systems */}
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                         <h3 className="text-xs font-bold text-vestra-gold uppercase mb-3 border-b border-slate-800 pb-2 flex items-center gap-2">
                             <Wrench size={14} /> Systems
                         </h3>
                         <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <DenseField label="Heating" value={prop.heatingType} />
                                <DenseField label="Cooling" value={prop.coolingType} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <DenseField label="Water" value={prop.waterSource} />
                                <DenseField label="Sewer" value={prop.sewer} />
                            </div>
                         </div>
                    </div>
                </div>

                {/* Column 3: Renovation & Documents (4 cols) */}
                <div className="md:col-span-4 space-y-4">
                     {/* Renovation Scope */}
                     <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col h-[300px]">
                         <h3 className="text-xs font-bold text-vestra-gold uppercase mb-3 border-b border-slate-800 pb-2 flex items-center gap-2">
                             <Calculator size={14} /> Rehab Scope ({prop.repairDetails?.length || 0})
                         </h3>
                         <div className="flex-1 overflow-y-auto pr-1 space-y-2 no-scrollbar">
                             {prop.repairDetails && prop.repairDetails.length > 0 ? (
                                 prop.repairDetails.map((item, i) => (
                                     <div key={i} className="flex justify-between items-start text-sm border-b border-slate-800/50 pb-1 last:border-0">
                                         <span className="text-slate-300 font-medium">{item.description}</span>
                                         <span className="text-vestra-gold font-mono">{formatCurrency(item.cost)}</span>
                                     </div>
                                 ))
                             ) : (
                                 <p className="text-xs text-slate-500 italic text-center mt-8">No repair items logged.</p>
                             )}
                         </div>
                         <div className="pt-3 border-t border-slate-800 mt-2 flex justify-between items-center">
                             <span className="text-xs font-bold text-slate-500 uppercase">Total Budget</span>
                             <span className="text-lg font-bold text-white">{formatCurrency(prop.estimatedRepairCost)}</span>
                         </div>
                     </div>

                     {/* Historical Improvements */}
                     <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                         <h3 className="text-xs font-bold text-vestra-gold uppercase mb-3 border-b border-slate-800 pb-2 flex items-center gap-2">
                             <Hammer size={14} /> Improvements
                         </h3>
                         <div className="flex flex-wrap gap-2">
                            {prop.improvements && prop.improvements.length > 0 ? (
                                prop.improvements.map((tag, i) => (
                                    <span key={i} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">
                                        {tag}
                                    </span>
                                ))
                            ) : (
                                <span className="text-xs text-slate-500 italic">None recorded</span>
                            )}
                         </div>
                     </div>

                     {/* Custom Links (Detail View) */}
                     {prop.customLinks && prop.customLinks.length > 0 && (
                        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                            <h3 className="text-xs font-bold text-vestra-gold uppercase mb-3 border-b border-slate-800 pb-2 flex items-center gap-2">
                                <LinkIcon size={14} /> External Links
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {prop.customLinks.map(link => (
                                    <a 
                                        key={link.id} 
                                        href={link.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs bg-slate-800 hover:bg-slate-700 text-vestra-gold border border-slate-700 px-3 py-1.5 rounded flex items-center gap-1 transition-colors"
                                    >
                                        <ExternalLink size={10} /> {link.title}
                                    </a>
                                ))}
                            </div>
                        </div>
                     )}

                     {/* Documents */}
                     <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                         <h3 className="text-xs font-bold text-vestra-gold uppercase mb-3 border-b border-slate-800 pb-2 flex items-center gap-2">
                             <FileText size={14} /> Documents
                         </h3>
                         <div className="space-y-2">
                            {prop.documents && prop.documents.length > 0 ? (
                                prop.documents.map((doc) => (
                                    <div key={doc.id} className="flex items-center justify-between bg-slate-800 p-2 rounded text-xs border border-slate-700">
                                        <span className="truncate max-w-[120px] text-slate-300">{doc.name}</span>
                                        {doc.data && (
                                            <a href={doc.data} download={doc.name} className="text-vestra-gold hover:underline flex items-center gap-1">
                                                <Download size={10} /> Save
                                            </a>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <span className="text-xs text-slate-500 italic">No files attached</span>
                            )}
                         </div>
                     </div>
                </div>
            </div>
        </div>
    );
  };
  
  // Helpers for Edit Form Gallery Pagination
  const editGalleryDisplayed = newProp.galleryImages?.slice(0, visibleGalleryCount) || [];
  const editGalleryHasMore = (newProp.galleryImages?.length || 0) > visibleGalleryCount;

  // --- Main Return ---
  
  // 1. Render Gallery Page if active
  if (galleryViewId && !isFormOpen) {
      return renderGalleryPage();
  }

  // 2. Render normal views
  return (
    <div className="space-y-6 relative">
      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 text-red-500 mb-4">
                    <div className="p-2 bg-red-900/20 rounded-full">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-xl font-bold">Confirm Deletion</h3>
                </div>
                <p className="text-slate-300 mb-6">
                    Are you sure you want to delete this property? This action is permanent and cannot be undone. All associated data will be removed.
                </p>
                <div className="flex gap-3 justify-end">
                    <button 
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-4 py-2 rounded-lg font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmDelete}
                        className="px-4 py-2 rounded-lg font-bold bg-red-600 text-white hover:bg-red-700 shadow-lg transition-colors flex items-center gap-2"
                    >
                        <Trash2 size={16} /> Delete Property
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Top Header - Hide if viewing details to save vertical space/confusion, or keep simple? We keep simple. */}
      {!viewingId && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
            <h2 className="text-2xl font-bold text-white">Property Portfolio</h2>
            <p className="text-slate-400 text-sm">Manage your investment assets, leads, and detailed property data.</p>
            </div>
            <div className="flex gap-2 items-center">
                {importStatus === 'success' && (
                    <div className="bg-green-900/50 text-green-400 text-xs font-bold px-3 py-2 rounded flex items-center gap-2 animate-in fade-in">
                        <CheckCircle size={14} /> Import Successful
                    </div>
                )}
                {importStatus === 'processing' && (
                    <div className="bg-blue-900/50 text-blue-400 text-xs font-bold px-3 py-2 rounded flex items-center gap-2 animate-in fade-in">
                        <Loader2 size={14} className="animate-spin" /> Importing...
                    </div>
                )}
            
            {/* Hidden CSV Input */}
            <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                ref={csvInputRef}
                onChange={handleCsvUpload}
            />

            <button 
                onClick={handleImportClick}
                disabled={importStatus === 'processing'}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-md hover:bg-slate-700 transition-colors shadow-sm text-sm font-medium disabled:opacity-50"
            >
                <FileSpreadsheet size={16} />
                Import CSV
            </button>
            <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-md hover:bg-slate-700 transition-colors shadow-sm text-sm font-medium"
            >
                <Download size={16} />
                Export CSV
            </button>
            <button 
                onClick={() => {
                    if(isFormOpen) {
                        resetForm();
                    } else {
                        setIsFormOpen(true);
                    }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-vestra-gold text-slate-900 rounded-md hover:bg-yellow-500 transition-colors shadow-sm text-sm font-bold"
            >
                {isFormOpen ? 'Cancel' : <><Plus size={16} /> Add Property</>}
            </button>
            </div>
        </div>
      )}

      <div ref={formTopRef}></div>
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-slate-900 rounded-xl shadow-xl border border-slate-800 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 relative z-10">
          {/* ... (Form Content omitted for brevity, logic handles it in existing file flow) ... */}
          {/* Re-injecting Form Header & Content handled by surrounding code structure implicitly if I output full file */}
          <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
            <h3 className="font-semibold text-lg text-white">
                {editingId ? 'Edit Asset Details' : 'New Asset Entry'}
            </h3>
            {editingId && <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded">Editing Mode</span>}
          </div>

          <div className="divide-y divide-slate-800">
            {/* Section 1: Basic Info */}
            <div className="bg-slate-900">
              <button type="button" onClick={() => toggleSection('basic')} className={sectionBtnClass}>
                <div className={sectionTitleClass}><MapPin size={18} className="text-vestra-gold" /> Location & Basic Info</div>
                {expandedSections.basic ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {expandedSections.basic && (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-1 md:col-span-2">
                    <label className={labelClass}>Street Address</label>
                    <input name="address" required placeholder="123 Main St" className={inputClass} onChange={handleInputChange} value={newProp.address || ''} />
                  </div>
                  <div>
                    <label className={labelClass}>City</label>
                    <input name="city" placeholder="Metropolis" className={inputClass} onChange={handleInputChange} value={newProp.city || ''} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelClass}>State</label>
                      <input name="state" placeholder="NY" className={inputClass} onChange={handleInputChange} value={newProp.state || ''} />
                    </div>
                    <div>
                      <label className={labelClass}>Zip</label>
                      <input name="zip" placeholder="10001" className={inputClass} onChange={handleInputChange} value={newProp.zip || ''} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Property Type</label>
                    <select name="type" className={inputClass} onChange={handleInputChange} value={newProp.type}>
                      {Object.values(PropertyType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                   <div>
                    <label className={labelClass}>Current Status</label>
                    <select name="status" className={inputClass} onChange={handleInputChange} value={newProp.status}>
                      <option value="Acquisition">Acquisition (Lead)</option>
                      <option value="Rehab">Rehab / In Progress</option>
                      <option value="Listed">Listed for Sale</option>
                      <option value="Held">Held (Rental)</option>
                      <option value="Sold">Sold</option>
                    </select>
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className={labelClass}>Listing / Zillow URL</label>
                    <input name="listingUrl" placeholder="https://..." className={inputClass} onChange={handleInputChange} value={newProp.listingUrl || ''} />
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Financials */}
            <div className="bg-slate-900">
              <button type="button" onClick={() => toggleSection('financial')} className={sectionBtnClass}>
                <div className={sectionTitleClass}><DollarSign size={18} className="text-vestra-gold" /> Financial Data</div>
                {expandedSections.financial ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {expandedSections.financial && (
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Purchase / List Price ($)</label>
                    <input type="number" name="purchasePrice" className={inputClass} onChange={handleInputChange} value={newProp.purchasePrice || ''} />
                  </div>
                  <div>
                    <label className={labelClass}>Zestimate ($)</label>
                    <input type="number" name="zestimate" className={inputClass} onChange={handleInputChange} value={newProp.zestimate || ''} />
                  </div>
                  <div>
                    <label className={labelClass}>Est. Repair Cost ($)</label>
                    <div className="relative">
                        <input 
                            type="number" 
                            name="estimatedRepairCost" 
                            className={`${inputClass} ${newProp.repairDetails?.length ? 'bg-slate-800/50 text-slate-400' : ''}`}
                            onChange={handleInputChange} 
                            value={newProp.estimatedRepairCost || ''} 
                            readOnly={!!newProp.repairDetails?.length}
                        />
                        {newProp.repairDetails && newProp.repairDetails.length > 0 && (
                            <div className="absolute right-2 top-2 text-xs text-vestra-gold font-medium">Calculated</div>
                        )}
                    </div>
                    {newProp.repairDetails && newProp.repairDetails.length > 0 && (
                         <p className="text-[10px] text-slate-500 mt-1">Based on budget below.</p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>After Repair Value (ARV)</label>
                    <input type="number" name="afterRepairValue" className={inputClass} onChange={handleInputChange} value={newProp.afterRepairValue || ''} />
                  </div>
                  <div>
                    <label className={labelClass}>Annual Taxes ($)</label>
                    <input type="number" name="annualTaxes" className={inputClass} onChange={handleInputChange} value={newProp.annualTaxes || ''} />
                  </div>
                  <div>
                    <label className={labelClass}>Annual Insurance ($)</label>
                    <input type="number" name="insuranceCost" className={inputClass} onChange={handleInputChange} value={newProp.insuranceCost || ''} />
                  </div>
                </div>
              )}
            </div>

            {/* Section 2.5: Renovation Budget */}
            <div className="bg-slate-900">
              <button type="button" onClick={() => toggleSection('renovation')} className={sectionBtnClass}>
                <div className={sectionTitleClass}><Calculator size={18} className="text-vestra-gold" /> Renovation Budget</div>
                {expandedSections.renovation ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {expandedSections.renovation && (
                <div className="p-6">
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 mb-6">
                        <h4 className="text-sm font-bold text-white mb-3">Add Estimated Repair</h4>
                        <div className="flex flex-col md:flex-row gap-3 items-end">
                             <div className="flex-1 w-full">
                                <label className={labelClass}>Description</label>
                                <input 
                                    placeholder="e.g. Master Bathroom Tile" 
                                    className={inputClass}
                                    value={repairInput.description}
                                    onChange={(e) => setRepairInput({...repairInput, description: e.target.value})}
                                />
                             </div>
                             <div className="w-full md:w-32">
                                <label className={labelClass}>Est. Cost ($)</label>
                                <input 
                                    type="number"
                                    placeholder="0" 
                                    className={inputClass}
                                    value={repairInput.cost}
                                    onChange={(e) => setRepairInput({...repairInput, cost: e.target.value})}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRepairItem())}
                                />
                             </div>
                             <button 
                                type="button" 
                                onClick={addRepairItem}
                                className="w-full md:w-auto px-4 py-2 bg-vestra-gold text-slate-900 rounded-md hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2 font-bold"
                             >
                                <Plus size={18} /> Add
                             </button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between items-center px-3 py-2 text-xs font-bold text-slate-500 uppercase border-b border-slate-700 mb-2">
                            <span>Item Description</span>
                            <span className="mr-8">Cost Estimate</span>
                        </div>
                        {(!newProp.repairDetails || newProp.repairDetails.length === 0) && (
                            <p className="text-slate-500 text-sm italic text-center py-4">No repairs added yet.</p>
                        )}
                        {newProp.repairDetails?.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-slate-800 p-3 rounded border border-slate-700 hover:border-slate-600 transition-colors group">
                                <span className="text-slate-200 text-sm font-medium">{item.description}</span>
                                <div className="flex items-center gap-4">
                                    <span className="text-vestra-gold font-mono font-bold">{formatCurrency(item.cost)}</span>
                                    <button 
                                        type="button" 
                                        onClick={() => removeRepairItem(idx)} 
                                        className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {newProp.repairDetails && newProp.repairDetails.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-700 flex justify-end">
                            <div className="text-right">
                                <p className="text-xs text-slate-400 uppercase">Total Renovation Budget</p>
                                <p className="text-2xl font-bold text-white">{formatCurrency(newProp.estimatedRepairCost || 0)}</p>
                            </div>
                        </div>
                    )}
                </div>
              )}
            </div>

            {/* Section 3: Interior */}
            <div className="bg-slate-900">
              <button type="button" onClick={() => toggleSection('details')} className={sectionBtnClass}>
                <div className={sectionTitleClass}><Home size={18} className="text-vestra-gold" /> Interior & Structure</div>
                {expandedSections.details ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {expandedSections.details && (
                <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className={labelClass}>Sq Ft</label>
                    <input type="number" name="sqFt" className={inputClass} onChange={handleInputChange} value={newProp.sqFt || ''} />
                  </div>
                  <div>
                    <label className={labelClass}>Beds</label>
                    <input type="number" name="beds" className={inputClass} onChange={handleInputChange} value={newProp.beds || ''} />
                  </div>
                  <div>
                    <label className={labelClass}>Baths</label>
                    <input type="number" name="baths" className={inputClass} onChange={handleInputChange} value={newProp.baths || ''} />
                  </div>
                  <div>
                    <label className={labelClass}>Stories</label>
                    <input type="number" name="stories" className={inputClass} onChange={handleInputChange} value={newProp.stories || ''} />
                  </div>
                  <div>
                    <label className={labelClass}>Year Built</label>
                    <input type="number" name="yearBuilt" className={inputClass} onChange={handleInputChange} value={newProp.yearBuilt || ''} />
                  </div>
                   <div className="col-span-2">
                    <label className={labelClass}>Flooring</label>
                    <input name="flooring" placeholder="e.g. Hardwood, Tile" className={inputClass} onChange={handleInputChange} value={newProp.flooring || ''} />
                  </div>
                   <div className="col-span-2 md:col-span-1">
                    <label className={labelClass}>Foundation / Material</label>
                    <input name="constructionMaterials" placeholder="e.g. Block, Frame" className={inputClass} onChange={handleInputChange} value={newProp.constructionMaterials || ''} />
                  </div>
                </div>
              )}
            </div>

             {/* Section 4: Exterior */}
             <div className="bg-slate-900">
              <button type="button" onClick={() => toggleSection('exterior')} className={sectionBtnClass}>
                <div className={sectionTitleClass}><Home size={18} className="text-vestra-gold" /> Exterior & Amenities</div>
                {expandedSections.exterior ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {expandedSections.exterior && (
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div className="flex items-center gap-4 bg-slate-800 p-3 rounded border border-slate-700">
                        <input type="checkbox" id="hasGarage" name="hasGarage" checked={!!newProp.hasGarage} onChange={handleInputChange} className="w-5 h-5 rounded text-vestra-gold focus:ring-vestra-gold bg-slate-700" />
                        <label htmlFor="hasGarage" className="text-sm font-medium text-slate-200">Has Garage</label>
                   </div>
                   <div className="flex items-center gap-4 bg-slate-800 p-3 rounded border border-slate-700">
                        <input type="checkbox" id="hasPool" name="hasPool" checked={!!newProp.hasPool} onChange={handleInputChange} className="w-5 h-5 rounded text-vestra-gold focus:ring-vestra-gold bg-slate-700" />
                        <label htmlFor="hasPool" className="text-sm font-medium text-slate-200">Has Pool</label>
                   </div>
                   <div>
                        <label className={labelClass}>Roof Type</label>
                        <input name="roofType" placeholder="e.g. Shingle" className={inputClass} onChange={handleInputChange} value={newProp.roofType || ''} />
                   </div>
                   <div>
                        <label className={labelClass}>Parking Capacity</label>
                        <input type="number" name="parkingCapacity" className={inputClass} onChange={handleInputChange} value={newProp.parkingCapacity || ''} />
                   </div>
                   <div className="col-span-1 md:col-span-2">
                        <label className={labelClass}>Parking Features</label>
                        <input name="parkingFeatures" placeholder="e.g. Attached, Driveway" className={inputClass} onChange={handleInputChange} value={newProp.parkingFeatures || ''} />
                   </div>
                   <div className="col-span-1 md:col-span-3">
                        <label className={labelClass}>Pool Features</label>
                        <input name="poolFeatures" placeholder="e.g. In Ground, Screened" className={inputClass} onChange={handleInputChange} value={newProp.poolFeatures || ''} />
                   </div>
                </div>
              )}
            </div>

            {/* Section 5: External Links (NEW) */}
            <div className="bg-slate-900">
              <button type="button" onClick={() => toggleSection('links')} className={sectionBtnClass}>
                <div className={sectionTitleClass}><LinkIcon size={18} className="text-vestra-gold" /> External Links</div>
                {expandedSections.links ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {expandedSections.links && (
                <div className="p-6">
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 mb-6">
                        <h4 className="text-sm font-bold text-white mb-3">Add Custom Link</h4>
                        <div className="flex flex-col md:flex-row gap-3 items-end">
                             <div className="flex-1 w-full">
                                <label className={labelClass}>Title</label>
                                <input 
                                    placeholder="e.g. County Records" 
                                    className={inputClass}
                                    value={linkInput.title}
                                    onChange={(e) => setLinkInput({...linkInput, title: e.target.value})}
                                />
                             </div>
                             <div className="flex-1 w-full">
                                <label className={labelClass}>URL</label>
                                <input 
                                    placeholder="https://..." 
                                    className={inputClass}
                                    value={linkInput.url}
                                    onChange={(e) => setLinkInput({...linkInput, url: e.target.value})}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())}
                                />
                             </div>
                             <button 
                                type="button" 
                                onClick={addLink}
                                className="w-full md:w-auto px-4 py-2 bg-vestra-gold text-slate-900 rounded-md hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2 font-bold"
                             >
                                <Plus size={18} /> Add
                             </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {(!newProp.customLinks || newProp.customLinks.length === 0) && (
                            <p className="text-slate-500 text-sm italic text-center py-4">No links added.</p>
                        )}
                        {newProp.customLinks?.map((link) => (
                            <div key={link.id} className="flex justify-between items-center bg-slate-800 p-3 rounded border border-slate-700 hover:border-slate-600 transition-colors group">
                                <div className="flex flex-col">
                                    <span className="text-slate-200 text-sm font-medium flex items-center gap-2">
                                        <ExternalLink size={12} className="text-vestra-gold"/> {link.title}
                                    </span>
                                    <span className="text-[10px] text-slate-500 truncate max-w-[200px] md:max-w-md">{link.url}</span>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => removeLink(link.id)} 
                                    className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
              )}
            </div>

            {/* Section 8: Images */}
            <div className="bg-slate-900">
              <button type="button" onClick={() => toggleSection('images')} className={sectionBtnClass}>
                <div className={sectionTitleClass}>
                    <ImageIcon size={18} className="text-vestra-gold" /> 
                    Images & Gallery 
                    {newProp.galleryImages && newProp.galleryImages.length > 0 && (
                        <span className="ml-2 bg-slate-700 text-white text-[10px] px-2 py-0.5 rounded-full">
                            {newProp.galleryImages.length}
                        </span>
                    )}
                </div>
                {expandedSections.images ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {expandedSections.images && (
                <div className="p-6 space-y-6">
                    {/* Main Image Upload */}
                    <div>
                        <label className={labelClass}>Cover Image</label>
                        <div className="flex items-start gap-4">
                            <input 
                                type="file" 
                                accept="image/*, .heic, .heif" 
                                className="hidden" 
                                ref={mainImageInputRef}
                                onChange={handleMainImageUpload}
                            />
                            <div 
                                onClick={() => mainImageInputRef.current?.click()}
                                className="w-32 h-24 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-vestra-gold transition-colors text-slate-500 hover:text-vestra-gold bg-slate-800/50"
                            >
                                {imageProcessing && !newProp.imageUrl ? (
                                    <div className="flex flex-col items-center gap-1">
                                        <Loader2 className="animate-spin text-vestra-gold" size={24} />
                                        <span className="text-[9px] text-slate-400">Processing...</span>
                                    </div>
                                ) : newProp.imageUrl ? (
                                    <SafeImage src={newProp.imageUrl} alt="Cover" className="w-full h-full object-cover rounded-md" />
                                ) : (
                                    <>
                                        <Upload size={20} />
                                        <span className="text-xs mt-1">Upload</span>
                                    </>
                                )}
                            </div>
                            <div className="text-xs text-slate-500 max-w-xs">
                                Upload a main cover photo. Images are automatically converted (HEIC supported) and resized for web optimization.
                            </div>
                        </div>
                    </div>

                    {/* Gallery Upload */}
                    <div>
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-2">
                             <label className={labelClass}>Gallery</label>
                             <div className="flex flex-wrap items-center gap-2">
                                 {imageProcessing ? (
                                     <div className="flex items-center gap-3">
                                         <span className="text-xs text-vestra-gold flex items-center gap-1">
                                             <Loader2 size={12} className="animate-spin" /> {processStatusText || 'Processing...'}
                                         </span>
                                         <button 
                                            type="button"
                                            onClick={cancelUpload}
                                            className="text-xs flex items-center gap-1 bg-red-900/30 text-red-400 px-2 py-1 rounded border border-red-900 hover:bg-red-900/50 transition-colors"
                                         >
                                             <StopCircle size={12} /> Cancel
                                         </button>
                                     </div>
                                 ) : (
                                    <>
                                        <button 
                                            type="button"
                                            onClick={(e) => handleDropboxClick(e)}
                                            className="text-xs flex items-center gap-1 bg-blue-900/30 text-blue-400 px-3 py-1.5 rounded border border-blue-800 hover:bg-blue-900/50 transition-colors font-bold mr-2"
                                        >
                                            <Box size={14} /> Open Dropbox
                                        </button>
                                        <span className="text-slate-600 hidden md:inline">|</span>
                                        {/* Standard File Upload */}
                                        <button 
                                            type="button" 
                                            onClick={() => galleryInputRef.current?.click()}
                                            disabled={imageProcessing}
                                            className="text-xs flex items-center gap-1 bg-slate-800 text-vestra-gold hover:text-white disabled:opacity-50 px-3 py-1.5 rounded border border-slate-700"
                                        >
                                            <Plus size={14} /> Add Images
                                        </button>
                                        
                                        {/* Folder Upload */}
                                        <button 
                                            type="button" 
                                            onClick={() => folderInputRef.current?.click()}
                                            disabled={imageProcessing}
                                            className="text-xs flex items-center gap-1 bg-slate-800 text-vestra-gold hover:text-white disabled:opacity-50 px-3 py-1.5 rounded border border-slate-700"
                                        >
                                            <FolderInput size={14} /> Upload Folder
                                        </button>
                                    </>
                                 )}
                             </div>
                        </div>
                        
                        {/* Hidden Input for Standard Multiple Files */}
                        <input 
                            type="file" 
                            accept="image/*, .heic, .heif" 
                            multiple 
                            className="hidden"
                            ref={galleryInputRef} 
                            onChange={handleGalleryUpload}
                        />

                        {/* Hidden Input for Folder/Directory Upload */}
                        <input
                            type="file"
                            className="hidden"
                            ref={folderInputRef}
                            // @ts-ignore - 'webkitdirectory' is non-standard but supported by major browsers
                            webkitdirectory=""
                            multiple
                            onChange={handleGalleryUpload}
                        />
                        
                        {/* Gallery Grid */}
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                            {editGalleryDisplayed.map((img, idx) => (
                                <div key={idx} className="relative group aspect-square rounded-md overflow-hidden bg-slate-800 border border-slate-700">
                                    <SafeImage src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                                    <button 
                                        type="button"
                                        onClick={() => removeGalleryImage(idx)}
                                        className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            <div 
                                onClick={() => galleryInputRef.current?.click()}
                                className="aspect-square border-2 border-dashed border-slate-700 rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-vestra-gold text-slate-500 hover:text-vestra-gold bg-slate-800/30 transition-colors"
                            >
                                <Plus size={24} />
                                <span className="text-xs mt-1">Select Files</span>
                            </div>
                        </div>
                        {editGalleryHasMore && (
                            <button 
                                type="button" 
                                onClick={() => setVisibleGalleryCount(prev => prev + 12)}
                                className="w-full mt-3 py-2 bg-slate-800 text-xs text-vestra-gold font-bold rounded hover:bg-slate-700 transition-colors border border-slate-700 flex items-center justify-center gap-1"
                            >
                                <Plus size={12} /> Load More Photos ({newProp.galleryImages!.length - visibleGalleryCount} remaining)
                            </button>
                        )}
                    </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end">
            <button type="submit" className="px-6 py-2 bg-vestra-gold text-slate-900 font-bold rounded-md shadow-lg hover:bg-yellow-500 transition-colors">
              {editingId ? 'Update Property' : 'Save New Property'}
            </button>
          </div>
        </form>
      )}

      {/* Render Details View if a property is selected, else render Grid List */}
      {viewingId && !isFormOpen ? (
          renderDetailsView()
      ) : !isFormOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map(prop => {
                const daysHeld = prop.purchaseDate ? Math.floor((new Date().getTime() - new Date(prop.purchaseDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
                
                // --- ACTION BUTTONS CONFIG ---
                const actions = [
                    { 
                        icon: Map, 
                        label: 'View on Map', 
                        onClick: (e: any) => { e.stopPropagation(); window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${prop.address}, ${prop.city}, ${prop.state} ${prop.zip}`)}`, '_blank'); }, 
                        color: 'text-slate-400 hover:text-blue-400' 
                    },
                    ...(prop.listingUrl ? [{ 
                        icon: ExternalLink, 
                        label: 'View Listing', 
                        onClick: (e: any) => { e.stopPropagation(); window.open(prop.listingUrl, '_blank'); }, 
                        color: 'text-slate-400 hover:text-indigo-400' 
                    }] : []),
                    { 
                        icon: Landmark, 
                        label: 'Property Appraiser', 
                        onClick: (e: any) => { e.stopPropagation(); window.open(`https://www.google.com/search?q=${encodeURIComponent(`${prop.address} ${prop.city} ${prop.state} property appraiser`)}`, '_blank'); }, 
                        color: 'text-slate-400 hover:text-purple-400' 
                    },
                    { 
                        icon: Box, 
                        label: 'Open Dropbox', 
                        onClick: (e: any) => handleDropboxClick(e), 
                        color: 'text-blue-400 hover:text-white' 
                    },
                    { 
                        icon: ImageIcon, 
                        label: 'Open Full Gallery', 
                        onClick: (e: any) => { e.stopPropagation(); setGalleryViewId(prop.id); }, 
                        color: 'text-slate-400 hover:text-blue-400' 
                    },
                    { 
                        icon: Eye, 
                        label: 'View Details', 
                        onClick: (e: any) => { e.stopPropagation(); setViewingId(prop.id); }, 
                        color: 'text-slate-400 hover:text-white' 
                    },
                    { 
                        icon: MessageSquare, 
                        label: 'Open Chat Log', 
                        onClick: (e: any) => { e.stopPropagation(); onChatClick(prop.id); }, 
                        color: 'text-slate-400 hover:text-green-400' 
                    },
                    { 
                        icon: Pencil, 
                        label: 'Edit Property', 
                        onClick: (e: any) => { e.stopPropagation(); handleEdit(prop); }, 
                        color: 'text-slate-400 hover:text-vestra-gold' 
                    },
                    { 
                        icon: Trash2, 
                        label: 'Delete Property', 
                        onClick: (e: any) => { e.stopPropagation(); setDeleteConfirmId(prop.id); }, 
                        color: 'text-slate-400 hover:text-red-500' 
                    },
                ];

                return (
            <div 
                key={prop.id} 
                role="button"
                tabIndex={0}
                className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 overflow-hidden md:hover:border-slate-700 transition-all group cursor-pointer relative"
                onClick={() => setViewingId(prop.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setViewingId(prop.id); }}
            >
                <div className="h-48 overflow-hidden relative">
                <SafeImage src={prop.imageUrl || ''} alt={prop.address} className="w-full h-full object-cover md:group-hover:scale-105 transition-transform duration-500 opacity-100 md:opacity-90 md:group-hover:opacity-100" />
                
                <div className="absolute top-3 right-3 bg-slate-900/90 text-white text-xs px-2 py-1 rounded backdrop-blur-sm border border-slate-700 font-bold uppercase tracking-wider">
                    {prop.status}
                </div>

                {/* Days Held Badge */}
                <div className="absolute top-3 left-3 bg-slate-900/90 text-white text-xs px-2 py-1 rounded backdrop-blur-sm border border-slate-700 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Clock size={12} /> {daysHeld > 0 ? daysHeld : 0} Days
                </div>

                {prop.galleryImages && prop.galleryImages.length > 0 && (
                    <div className="absolute bottom-3 left-3 bg-slate-900/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1">
                        <ImageIcon size={10} /> {prop.galleryImages.length} Photos
                    </div>
                )}
                
                <div className="absolute inset-0 bg-black/40 opacity-0 md:group-hover:opacity-100 transition-opacity hidden md:flex items-center justify-center pointer-events-none">
                    <span className="bg-vestra-gold text-slate-900 px-4 py-2 rounded-full font-bold text-sm shadow-lg flex items-center gap-2 transform translate-y-4 md:group-hover:translate-y-0 transition-transform">
                        <Eye size={16} /> View Details
                    </span>
                </div>
                </div>

                <div className="p-5 relative">
                
                {/* --- ADDRESS HEADER (Full Width) --- */}
                <div className="mb-4">
                    <h3 className="font-bold text-lg text-white truncate">{prop.address}</h3>
                    <p className="text-slate-400 text-sm">{prop.city}, {prop.state}</p>
                </div>
                
                {/* --- ACTION TOOLBAR (DESKTOP) --- */}
                {/* Moved below address to prevent squeezing. Visible only on LG+. */}
                <div className="hidden lg:flex flex-wrap items-center gap-2 mb-4 relative z-10">
                    {actions.map((action, idx) => (
                        <QuickTooltip key={idx} content={action.label}>
                            <button 
                                type="button"
                                onClick={action.onClick}
                                className={`p-2 rounded-md border border-slate-800 bg-slate-800/50 hover:bg-slate-800 transition-colors ${action.color.replace('hover:', '')}`}
                            >
                                <action.icon size={16} />
                            </button>
                        </QuickTooltip>
                    ))}
                </div>
                
                {/* --- ACTION TOOLBAR (MOBILE) --- */}
                {/* Visible ONLY on screens smaller than LG (1024px). Forces 4x2 Grid. */}
                <div className="lg:hidden w-full mb-4 relative z-10">
                    <div className="grid grid-cols-4 gap-2">
                        {actions.map((action, idx) => (
                            <button 
                                key={idx}
                                type="button"
                                onClick={action.onClick}
                                className={`
                                    flex items-center justify-center p-3 rounded-lg border border-slate-700 bg-slate-800 transition-colors
                                    ${action.color.replace('hover:', 'active:')}
                                `}
                            >
                                <action.icon size={20} />
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Custom Links on Card */}
                {prop.customLinks && prop.customLinks.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {prop.customLinks.map(link => (
                            <a 
                                key={link.id} 
                                href={link.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-vestra-gold px-2 py-1 rounded flex items-center gap-1 transition-colors"
                            >
                                <LinkIcon size={10} /> {link.title}
                            </a>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                    <span className="block text-slate-500 text-xs uppercase">List Price</span>
                    <span className="font-semibold text-slate-200">${prop.purchasePrice?.toLocaleString() || '0'}</span>
                    </div>
                    <div>
                    <span className="block text-slate-500 text-xs uppercase">Est. Repair</span>
                    <span className="font-semibold text-slate-200">${prop.estimatedRepairCost?.toLocaleString() || '0'}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-white">
                    <span className="flex items-center gap-1"><Home size={12}/> {prop.sqFt?.toLocaleString() || '-'} sqft</span>
                    <span>{prop.beds || '-'}bd / {prop.baths || '-'}ba</span>
                    <span>{prop.yearBuilt || 'N/A'}</span>
                </div>
                </div>
            </div>
            );
            })}
        </div>
      )}
    </div>
  );
};