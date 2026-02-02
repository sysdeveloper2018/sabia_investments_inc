import React, { useState, useEffect, useRef } from 'react';
import { Property, WorkItem } from '../types';
import { formatCurrency } from '../utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { analyzePropertyDeal, generatePropertyReport } from '../services/geminiService';
import { captureElementAsImage, sendEmailService, sendSmsService } from '../services/communicationService';
import { generatePDFFromElement, createFinancialAnalysisPDF, downloadPDF } from '../services/pdfService';
import { FileText, AlertTriangle, Loader2, MessageSquare, Camera, Share2, CheckCircle, Smartphone, Printer, Image as ImageIcon, MessageCircle, Upload, Mail, FileDown } from 'lucide-react';

interface FinancialsProps {
  properties: Property[];
  workItems: WorkItem[];
}

const Financials: React.FC<FinancialsProps> = ({ properties, workItems }) => {
  const [selectedPropId, setSelectedPropId] = useState<string>('');
  const [metrics, setMetrics] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  
  // Report State
  const [reportContent, setReportContent] = useState<string>('');
  const [reportLoading, setReportLoading] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  // Share State
  const [includeSms, setIncludeSms] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'capturing' | 'sending' | 'success' | 'error'>('idle');
  const [emailRecipient, setEmailRecipient] = useState<string>('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  
  // Refs
  const reportRef = useRef<HTMLDivElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null); // New ref for PDF upload

  // Derived state for the selected property
  const selectedProp = properties.find(p => p.id === selectedPropId);

  useEffect(() => {
    if (!selectedProp) {
      setMetrics(null);
      setAiAnalysis('');
      setReportContent('');
      setValidationError('');
      return;
    }

    // Calculate totals from work items
    const actualWorkCost = workItems
      .filter(w => w.propertyId === selectedProp.id)
      .reduce((sum, w) => sum + w.actualCost, 0);

    const totalInvestment = selectedProp.purchasePrice + actualWorkCost;
    // Simple logic: Assuming rent is 1% of ARV for demo (typical rule of thumb)
    const estimatedMonthlyRent = selectedProp.afterRepairValue * 0.01; 
    const annualIncome = estimatedMonthlyRent * 12;
    const annualExpenses = selectedProp.annualTaxes + selectedProp.insuranceCost + (annualIncome * 0.1); // 10% maintenance/vacancy
    const noi = annualIncome - annualExpenses;
    const capRate = (noi / selectedProp.purchasePrice) * 100;
    const cashOnCash = (noi / totalInvestment) * 100; // Simplified assuming all cash

    setMetrics({
      totalInvestment,
      actualWorkCost,
      estimatedMonthlyRent,
      annualIncome,
      annualExpenses,
      noi,
      capRate: capRate.toFixed(2),
      cashOnCash: cashOnCash.toFixed(2)
    });
    
    setAiAnalysis(''); 
    setReportContent('');
    setValidationError('');
    setShareStatus('idle');
  }, [selectedPropId, properties, workItems]);

  const handleRunAnalysis = async () => {
      if(!selectedProp) return;
      setLoadingAi(true);
      
      // Construct full address to prevent AI hallucinations about location
      const fullAddress = `${selectedProp.address}, ${selectedProp.city}, ${selectedProp.state} ${selectedProp.zip}`;
      
      const result = await analyzePropertyDeal(
          fullAddress,
          selectedProp.purchasePrice,
          selectedProp.estimatedRepairCost,
          selectedProp.afterRepairValue
      );
      setAiAnalysis(result);
      setLoadingAi(false);
  };

  const handleGenerateReport = async () => {
      setValidationError('');
      setReportContent('');
      
      if (!selectedProp) {
          setValidationError('Please select a property first.');
          return;
      }

      // Validation
      const missingFields = [];
      if (!selectedProp.sqFt || selectedProp.sqFt === 0) missingFields.push('Square Footage');
      if (!selectedProp.beds) missingFields.push('Bedrooms');
      if (!selectedProp.baths) missingFields.push('Bathrooms');
      if (!selectedProp.purchasePrice) missingFields.push('Purchase Price');

      if (missingFields.length > 0) {
          setValidationError(`Cannot generate report. Missing data: ${missingFields.join(', ')}. Please update in Properties tab.`);
          return;
      }

      setReportLoading(true);
      const report = await generatePropertyReport(selectedProp, metrics);
      setReportContent(report);
      setReportLoading(false);
  };

  const handlePrint = () => {
      window.print();
  };

  // Trigger File Input
  const handleTextPdfClick = () => {
    pdfInputRef.current?.click();
  };

  // Handle File Selection & Share
  const handlePdfSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        setShareStatus('sending');

        // Check for Web Share API support with files
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
             await navigator.share({
                 files: [file],
                 title: `Investment Report: ${selectedProp?.address}`,
                 text: `Attached is the ROI analysis and valuation report for ${selectedProp?.address}.`
             });
             setShareStatus('success');
        } else {
             alert("Sharing files is not supported on this browser. Please attach the file manually in Messages.");
             setShareStatus('error');
        }
    } catch (err) {
        // User cancelled share or other error
        console.error("Share failed", err);
        setShareStatus('idle');
    } finally {
        setTimeout(() => setShareStatus('idle'), 3000);
        // Reset input so the same file can be selected again if needed
        if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  // Automated Share (Requires Backend for Real Email/SMS)
  const handleAutomatedShare = async () => {
    setValidationError('');
    setShareStatus('idle');

    if (!selectedProp) {
        setValidationError('Please select a property to share.');
        return;
    }

    if (!reportRef.current) {
        setValidationError('Financial view is not ready to capture.');
        return;
    }

    try {
        setShareStatus('capturing');
        
        // 1. Capture Screenshot
        const imageBlob = await captureElementAsImage(reportRef.current);
        if (!imageBlob) throw new Error("Failed to capture screenshot");

        setShareStatus('sending');

        // 2. Send Email (Always)
        await sendEmailService({
            to: 'admin@sabia-inc.com',
            subject: `Financial Snapshot: ${selectedProp.address}`,
            body: `Attached is the financial breakdown for ${selectedProp.address}.`,
            attachment: imageBlob
        });

        // 3. Send SMS (Optional)
        if (includeSms) {
            await sendSmsService({
                to: '555-123-4567',
                message: `Sabia Update: Financials for ${selectedProp.address} have been emailed to you. Cap Rate: ${metrics?.capRate}%`
            });
        }

        setShareStatus('success');
        setTimeout(() => setShareStatus('idle'), 3000);

    } catch (error) {
        console.error(error);
        setShareStatus('error');
    }
  };

  // Email Report Function with PDF attachment
  const handleEmailReport = async () => {
    setValidationError('');
    setEmailStatus('idle');

    if (!selectedProp) {
        setValidationError('Please select a property to email.');
        return;
    }

    if (!emailRecipient) {
        setValidationError('Please enter an email address.');
        return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailRecipient)) {
        setValidationError('Please enter a valid email address.');
        return;
    }

    try {
        setEmailStatus('sending');

        // Generate PDF attachment
        const pdfBlob = await createFinancialAnalysisPDF(selectedProp, metrics, aiAnalysis, reportContent);
        
        // Create comprehensive report content
        const reportSubject = `ROI Analysis Report: ${selectedProp.address}`;
        let reportBody = `ROI Investment Analysis Report\n\n`;
        reportBody += `Property: ${selectedProp.address}\n`;
        reportBody += `${selectedProp.city}, ${selectedProp.state} ${selectedProp.zip}\n\n`;
        
        if (metrics) {
            reportBody += `=== FINANCIAL METRICS ===\n`;
            reportBody += `Purchase Price: ${formatCurrency(selectedProp.purchasePrice)}\n`;
            reportBody += `Estimated Renovation: ${formatCurrency(metrics.actualWorkCost || selectedProp.estimatedRepairCost)}\n`;
            reportBody += `Total Investment: ${formatCurrency(metrics.totalInvestment)}\n`;
            reportBody += `After Repair Value: ${formatCurrency(selectedProp.afterRepairValue)}\n`;
            reportBody += `Projected Monthly Rent: ${formatCurrency(metrics.estimatedMonthlyRent)}\n`;
            reportBody += `Annual Income: ${formatCurrency(metrics.annualIncome)}\n`;
            reportBody += `Annual Expenses: ${formatCurrency(metrics.annualExpenses)}\n`;
            reportBody += `Net Operating Income: ${formatCurrency(metrics.noi)}\n`;
            reportBody += `Cap Rate: ${metrics.capRate}%\n`;
            reportBody += `Cash on Cash Return: ${metrics.cashOnCash}%\n\n`;
        }

        if (aiAnalysis) {
            reportBody += `=== AI INVESTMENT ANALYSIS ===\n`;
            reportBody += `${aiAnalysis}\n\n`;
        }

        if (reportContent) {
            reportBody += `=== MARKET VALUATION REPORT ===\n`;
            reportBody += `${reportContent}\n\n`;
        }

        reportBody += `---\n`;
        reportBody += `Generated by Sabia Investments Properties Inc.\n`;
        reportBody += `Date: ${new Date().toLocaleDateString()}\n`;

        // Send email using Brevo with PDF attachment
        await sendEmailService({
            to: emailRecipient,
            subject: reportSubject,
            body: reportBody,
            attachment: pdfBlob || undefined
        });

        setEmailStatus('success');
        setTimeout(() => setEmailStatus('idle'), 3000);

    } catch (error) {
        console.error('Email send error:', error);
        setEmailStatus('error');
        setValidationError('Failed to send email. Please try again.');
    }
  };

  // Download PDF Function
  const handleDownloadPDF = async () => {
    if (!selectedProp) {
        setValidationError('Please select a property to download PDF.');
        return;
    }

    try {
        setPdfStatus('generating');
        
        const filename = `ROI-Analysis-${selectedProp.address.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.pdf`;
        const success = await downloadPDF({
            filename,
            elementId: 'financial-report-container',
            title: `ROI Analysis Report: ${selectedProp.address}`
        });

        if (success) {
            setPdfStatus('success');
            setTimeout(() => setPdfStatus('idle'), 3000);
        } else {
            setPdfStatus('error');
            setValidationError('Failed to generate PDF. Please try again.');
        }

    } catch (error) {
        console.error('PDF generation error:', error);
        setPdfStatus('error');
        setValidationError('Failed to generate PDF. Please try again.');
    }
  };

  // Manual Share (Opens user's default apps)
  const handleManualSms = () => {
      if(!selectedProp || !metrics) return;
      const message = encodeURIComponent(`Sabia Financials for ${selectedProp.address}:\nPurchase: ${formatCurrency(selectedProp.purchasePrice)}\nNOI: ${formatCurrency(metrics.noi)}\nCap Rate: ${metrics.capRate}%\n(Note: Attach screenshot manually)`);
      window.open(`sms:?body=${message}`);
  };

  // Share with PDF attachment (using Web Share API)
  const handleShareWithPDF = async () => {
    if (!selectedProp) {
        setValidationError('Please select a property to share.');
        return;
    }

    try {
        setPdfStatus('generating');
        
        // Generate PDF
        const pdfBlob = await createFinancialAnalysisPDF(selectedProp, metrics, aiAnalysis, reportContent);
        if (!pdfBlob) {
            throw new Error('Failed to generate PDF');
        }

        // Create file for sharing
        const filename = `ROI-Analysis-${selectedProp.address.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.pdf`;
        const file = new File([pdfBlob], filename, { type: 'application/pdf' });

        // Check if Web Share API is supported
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                title: `ROI Analysis: ${selectedProp.address}`,
                text: `Check out this ROI analysis for ${selectedProp.address}`,
                files: [file]
            });
            setPdfStatus('success');
        } else {
            // Fallback: download the file
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            setValidationError('Web Share API not supported. PDF downloaded instead.');
            setPdfStatus('success');
        }

        setTimeout(() => setPdfStatus('idle'), 3000);

    } catch (error) {
        console.error('Share error:', error);
        setPdfStatus('error');
        setValidationError('Failed to share PDF. Please try again.');
    }
  };

  const chartData = metrics ? [
    { name: 'Purchase', value: selectedProp!.purchasePrice },
    { name: 'Renovation', value: metrics.actualWorkCost },
    { name: 'Holding Costs', value: 5000 }, // Dummy value for visualization
  ] : [];

  const COLORS = ['#334155', '#d4af37', '#94a3b8'];

  // Check if at least one analysis type is present for the Text PDF button
  const hasAnalysis = !!aiAnalysis || !!reportContent;

  return (
    <div className="space-y-6">
       <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl text-white shadow-lg no-print">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
                <h2 className="text-2xl font-bold">Investment Calculator</h2>
                <p className="text-slate-400">Select a property to view comprehensive financial metrics and ROI projections.</p>
            </div>
            {selectedProp && (
                 <div className="flex flex-col gap-2 items-end mt-4 md:mt-0">
                     {/* Automated Actions */}
                     <div className="flex items-center gap-4 bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="smsCheck"
                                checked={includeSms}
                                onChange={(e) => setIncludeSms(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-600 text-vestra-gold focus:ring-vestra-gold bg-slate-700"
                            />
                            <label htmlFor="smsCheck" className="text-sm text-slate-300 flex items-center gap-1 cursor-pointer">
                                <MessageSquare size={14} /> Send Auto Text
                            </label>
                        </div>
                        <div className="h-6 w-px bg-slate-600 mx-2"></div>
                        <button 
                            type="button"
                            onClick={handleAutomatedShare}
                            disabled={shareStatus !== 'idle' && shareStatus !== 'error'}
                            className={`
                                flex items-center gap-2 text-xs font-bold px-3 py-2 rounded transition-all disabled:opacity-50
                                ${shareStatus === 'success' ? 'bg-green-600 text-white' : 'bg-blue-700 hover:bg-blue-600 text-white'}
                            `}
                        >
                            {shareStatus === 'idle' && <><Camera size={14} /> Auto-Send Screenshot</>}
                            {shareStatus === 'capturing' && <><Loader2 className="animate-spin" size={14} /> Capturing...</>}
                            {shareStatus === 'sending' && <><Share2 className="animate-pulse" size={14} /> Sending...</>}
                            {shareStatus === 'success' && <><CheckCircle size={14} /> Sent!</>}
                            {shareStatus === 'error' && <><AlertTriangle size={14} /> Error</>}
                        </button>
                     </div>

                     {/* Manual Actions Link */}
                     <div className="flex gap-3">
                         <button type="button" onClick={handleManualSms} className="text-xs text-vestra-gold hover:text-white flex items-center gap-1">
                             <Smartphone size={12} /> Open in My Messages App
                         </button>
                         <button type="button" onClick={handleShareWithPDF} className="text-xs text-vestra-gold hover:text-white flex items-center gap-1">
                             <Share2 size={12} /> Share PDF
                         </button>
                     </div>
                 </div>
            )}
          </div>
          
          <div className="max-w-xl">
            <label className="block text-sm font-semibold text-vestra-gold uppercase mb-2">Select Asset</label>
            <div className="flex flex-col md:flex-row gap-3">
                <select 
                  className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:ring-2 focus:ring-vestra-gold"
                  value={selectedPropId}
                  onChange={(e) => setSelectedPropId(e.target.value)}
                >
                  <option value="">-- Choose Property --</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.address}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                    <button 
                        type="button"
                        onClick={handleGenerateReport}
                        disabled={reportLoading}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-vestra-gold text-slate-900 font-bold rounded-lg shadow-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                        {reportLoading ? <Loader2 className="animate-spin" size={20}/> : <FileText size={20} />}
                        MLS Report
                    </button>
                    <button 
                        type="button"
                        onClick={handlePrint}
                        disabled={!selectedProp}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 text-white font-bold rounded-lg shadow-lg hover:bg-slate-600 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                        <Printer size={20} />
                        Print PDF
                    </button>

                    <button 
                        type="button"
                        onClick={handleDownloadPDF}
                        disabled={!selectedProp || pdfStatus === 'generating'}
                        className={`
                            flex items-center justify-center gap-2 px-4 py-3 font-bold rounded-lg shadow-lg transition-colors disabled:opacity-50 whitespace-nowrap
                            ${pdfStatus === 'success' ? 'bg-green-600 text-white' : 
                              pdfStatus === 'error' ? 'bg-red-600 text-white' :
                              'bg-purple-600 hover:bg-purple-500 text-white'}
                        `}
                    >
                        {pdfStatus === 'generating' && <Loader2 className="animate-spin" size={20} />}
                        {pdfStatus === 'success' && <CheckCircle size={20} />}
                        {pdfStatus === 'error' && <AlertTriangle size={20} />}
                        {pdfStatus === 'idle' && <FileDown size={20} />}
                        {pdfStatus === 'idle' ? 'Download PDF' : 
                         pdfStatus === 'generating' ? 'Generating...' :
                         pdfStatus === 'success' ? 'Downloaded!' :
                         'Error - Retry'}
                    </button>
                    
                    {/* HIDDEN PDF INPUT */}
                    <input 
                        type="file" 
                        accept="application/pdf" 
                        ref={pdfInputRef} 
                        className="hidden" 
                        onChange={handlePdfSelected}
                    />

                    {/* Text PDF Button triggers input */}
                    <button 
                        type="button"
                        onClick={handleTextPdfClick}
                        disabled={!selectedProp || !hasAnalysis || shareStatus === 'sending'}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-600 text-white font-bold rounded-lg shadow-lg hover:bg-slate-500 transition-colors disabled:opacity-50 whitespace-nowrap"
                        title={!hasAnalysis ? "Run AI Analysis or MLS Report first" : "Select PDF to Text"}
                    >
                         {shareStatus === 'sending' ? <Loader2 className="animate-spin" size={20}/> : <Upload size={20} />}
                        Text PDF
                    </button>
                </div>
            </div>

            {/* Email Section */}
            <div className="flex flex-col md:flex-row gap-3 mt-4">
                <input 
                    type="email"
                    placeholder="Enter email address for ROI report..."
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:ring-2 focus:ring-vestra-gold placeholder-slate-400"
                />
                <button 
                    type="button"
                    onClick={handleEmailReport}
                    disabled={emailStatus === 'sending' || !selectedProp}
                    className={`
                        flex items-center justify-center gap-2 px-6 py-3 font-bold rounded-lg shadow-lg transition-colors disabled:opacity-50 whitespace-nowrap
                        ${emailStatus === 'success' ? 'bg-green-600 text-white' : 
                          emailStatus === 'error' ? 'bg-red-600 text-white' :
                          'bg-blue-600 hover:bg-blue-500 text-white'}
                    `}
                >
                    {emailStatus === 'sending' && <Loader2 className="animate-spin" size={20} />}
                    {emailStatus === 'success' && <CheckCircle size={20} />}
                    {emailStatus === 'error' && <AlertTriangle size={20} />}
                    {emailStatus === 'idle' && <Mail size={20} />}
                    {emailStatus === 'idle' ? 'Email ROI Report' : 
                     emailStatus === 'sending' ? 'Sending...' :
                     emailStatus === 'success' ? 'Sent!' :
                     'Error - Retry'}
                </button>
            </div>
            {validationError && (
                <div className="mt-3 p-3 bg-red-900/20 border border-red-900/50 rounded text-red-400 text-sm flex items-start gap-2">
                    <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>{validationError}</span>
                </div>
            )}
          </div>
       </div>

       {/* Printable Report Container */}
       {selectedProp && (
           <div 
             id="financial-report-container"
             ref={reportRef} 
             className="printable-area bg-slate-950 shadow-2xl relative print:bg-white print:text-black print:shadow-none"
           >
                {/* 
                    PRINT LAYOUT WRAPPER 
                    Updated to use white background and distinct borders for printing.
                */}
                <div className="print:max-w-none print:w-full print:bg-white print:p-0">
                    
                    {/* 1. Header Banner Image */}
                    <div className="w-full relative bg-slate-900 print:bg-white print:mb-6 print:h-64 overflow-hidden">
                        {selectedProp.imageUrl ? (
                            <div className="w-full h-80 relative print:h-full print:rounded-none">
                                <img 
                                    src={selectedProp.imageUrl} 
                                    alt={selectedProp.address} 
                                    className="w-full h-full object-cover print:object-cover print:object-center"
                                />
                                {/* Remove dark gradient in print */}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent print:hidden"></div>
                            </div>
                        ) : (
                            <div className="w-full h-48 bg-slate-900 flex items-center justify-center border-b border-slate-800 print:bg-slate-50 print:border print:border-slate-300">
                                <div className="flex flex-col items-center text-slate-600">
                                    <ImageIcon size={48} />
                                    <span className="text-sm mt-2 font-bold uppercase tracking-wider">No Image Available</span>
                                </div>
                            </div>
                        )}
                        
                        {/* Header Info Overlay */}
                        <div className="absolute bottom-0 left-0 w-full p-8 flex flex-col md:flex-row justify-between items-end 
                                        print:absolute print:bottom-0 print:left-0 print:p-6 print:flex-row print:w-full print:bg-white/90 print:backdrop-blur-sm print:border-t print:border-slate-300">
                            <div className="print:flex-1">
                                <h1 className="text-4xl font-extrabold text-white mb-2 drop-shadow-md print:text-black print:text-3xl print:drop-shadow-none">{selectedProp.address}</h1>
                                <p className="text-lg text-slate-300 font-medium drop-shadow-md flex items-center gap-2 print:text-slate-700 print:drop-shadow-none">
                                    <span className="text-vestra-gold print:text-black font-bold">{selectedProp.city}, {selectedProp.state} {selectedProp.zip}</span>
                                    <span className="w-1 h-1 bg-slate-400 rounded-full print:bg-slate-400"></span>
                                    <span>{selectedProp.type}</span>
                                </p>
                            </div>
                            <div className="text-right mt-4 md:mt-0 print:text-right print:mt-0">
                                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1 drop-shadow-md print:text-slate-600 print:drop-shadow-none">Purchase Price</p>
                                <h2 className="text-3xl font-bold text-vestra-gold drop-shadow-md print:text-black print:drop-shadow-none">{formatCurrency(selectedProp.purchasePrice)}</h2>
                            </div>
                        </div>
                    </div>

                    {/* Report Body */}
                    <div className="p-8 space-y-8 print:p-8 print:space-y-8">
                        
                        {/* 2. Key Metrics Grid (Full Width) */}
                        {metrics && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:grid print:grid-cols-4 print:gap-4">
                                {/* Applied print:bg-white, print:border-2, print:border-slate-300, print:text-black to all boxes */}
                                <div className="bg-slate-900 p-5 rounded-lg border border-slate-800 print:bg-white print:border-2 print:border-slate-300 print:rounded-md print:shadow-none">
                                    <p className="text-xs text-slate-500 uppercase font-bold print:text-slate-600">Est. Renovation</p>
                                    <h3 className="text-2xl font-bold text-white mt-1 print:text-black">{formatCurrency(metrics.actualWorkCost || selectedProp.estimatedRepairCost)}</h3>
                                </div>
                                <div className="bg-slate-900 p-5 rounded-lg border border-slate-800 print:bg-white print:border-2 print:border-slate-300 print:rounded-md print:shadow-none">
                                    <p className="text-xs text-slate-500 uppercase font-bold print:text-slate-600">After Repair Value</p>
                                    <h3 className="text-2xl font-bold text-vestra-gold mt-1 print:text-black">{formatCurrency(selectedProp.afterRepairValue)}</h3>
                                </div>
                                <div className="bg-slate-900 p-5 rounded-lg border border-slate-800 print:bg-white print:border-2 print:border-slate-300 print:rounded-md print:shadow-none">
                                    <p className="text-xs text-slate-500 uppercase font-bold print:text-slate-600">Projected NOI</p>
                                    <h3 className="text-2xl font-bold text-green-400 mt-1 print:text-green-700">{formatCurrency(metrics.noi)}</h3>
                                </div>
                                <div className="bg-slate-900 p-5 rounded-lg border border-slate-800 print:bg-white print:border-2 print:border-slate-300 print:rounded-md print:shadow-none">
                                    <p className="text-xs text-slate-500 uppercase font-bold print:text-slate-600">Cap Rate</p>
                                    <h3 className="text-2xl font-bold text-white mt-1 print:text-black">{metrics.capRate}%</h3>
                                </div>
                            </div>
                        )}

                        {/* 3. Split Section: Chart & AI Analysis */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:grid print:grid-cols-3 print:gap-6">
                            
                            {/* Left Col: Financial Breakdown (Chart) */}
                            <div className="lg:col-span-1 bg-slate-900 p-6 rounded-lg border border-slate-800 print:col-span-1 print:bg-white print:border-2 print:border-slate-300 print:rounded-lg print:break-inside-avoid print:shadow-none">
                                <h4 className="text-sm font-bold text-slate-400 uppercase mb-4 border-b border-slate-800 pb-2 print:text-black print:border-slate-200">Financial Breakdown</h4>
                                <div className="h-64 w-full print:h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                        <Pie
                                            data={chartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            formatter={(value: number) => formatCurrency(value)} 
                                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#ccc', color: '#000' }}
                                            itemStyle={{ color: '#000' }}
                                        />
                                        <Legend iconType="circle" wrapperStyle={{fontSize: '10px', color: '#000'}}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-4 space-y-2 print:space-y-1">
                                    <div className="flex justify-between text-xs text-slate-300 print:text-black">
                                        <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-700 print:bg-slate-800"></div> Holding Costs</span>
                                        <span>$5,000</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-300 print:text-black">
                                        <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-600 print:bg-slate-500"></div> Purchase</span>
                                        <span>{formatCurrency(selectedProp.purchasePrice)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-300 print:text-black">
                                        <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-vestra-gold"></div> Renovation</span>
                                        <span>{formatCurrency(metrics?.actualWorkCost || 0)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right Col: AI Analysis */}
                            {/* Added print:bg-none to remove dark gradient overlay */}
                            <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-lg border border-slate-700 relative print:col-span-2 print:bg-white print:bg-none print:border-2 print:border-slate-300 print:rounded-lg print:break-inside-avoid print:shadow-none">
                                <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2 print:border-slate-200">
                                    <h4 className="text-sm font-bold text-vestra-gold uppercase flex items-center gap-2 print:text-black">
                                        <span className="text-lg">✦</span> Investment Analysis
                                    </h4>
                                    <button 
                                        type="button"
                                        onClick={handleRunAnalysis}
                                        disabled={loadingAi}
                                        className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-white font-medium transition-colors no-print"
                                    >
                                        {loadingAi ? 'Analyzing...' : 'Refresh AI Analysis'}
                                    </button>
                                </div>
                                
                                {aiAnalysis ? (
                                    <div className="prose prose-sm max-w-none text-slate-300 print:text-black print:text-xs print:leading-relaxed">
                                        <pre className="whitespace-pre-wrap font-sans leading-relaxed">{aiAnalysis}</pre>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-500 py-8 print:text-slate-400">
                                        <FileText size={40} className="mb-3 opacity-20" />
                                        <p className="text-sm">Click "Refresh AI Analysis" to generate an investment summary.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 5. Full Market Report (Bottom) */}
                        {reportContent && (
                            <div className="mt-8 border-t border-slate-800 pt-8 print:border-slate-300 print:break-inside-avoid">
                                <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-2 print:text-black">
                                    <FileText size={20} className="text-vestra-gold print:text-black"/> 
                                    Market Valuation Report
                                </h4>
                                {/* Applied print:bg-white, print:border-2, print:border-slate-300, print:text-black */}
                                <div className="prose prose-invert prose-headings:text-vestra-gold prose-p:text-slate-300 max-w-none bg-slate-900/50 p-6 rounded-lg border border-slate-800/50 print:bg-white print:text-black print:border-2 print:border-slate-300 print:rounded-lg print:text-xs print:shadow-none">
                                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-300 print:text-black">
                                        {reportContent}
                                    </pre>
                                </div>
                            </div>
                        )}
                        
                        {/* Footer for Print */}
                        <div className="hidden print:block pt-8 mt-8 border-t border-slate-300 text-center">
                            <p className="text-xs text-slate-500 uppercase tracking-widest">Generated by Sabia Investments Properties Inc.</p>
                            <p className="text-[10px] text-slate-600 mt-1">{new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
           </div>
       )}
    </div>
  );
};

export default Financials;