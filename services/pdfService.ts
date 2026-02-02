import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFOptions {
  filename: string;
  elementId: string;
  title?: string;
}

/**
 * Generates a PDF from an HTML element
 */
export const generatePDFFromElement = async (options: PDFOptions): Promise<Blob | null> => {
  try {
    const element = document.getElementById(options.elementId);
    if (!element) {
      console.error(`Element with ID ${options.elementId} not found`);
      return null;
    }

    // Show loading state
    const originalDisplay = element.style.display;
    element.style.display = 'block';

    // Generate canvas from element
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight
    });

    // Restore original display
    element.style.display = originalDisplay;

    // Create PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 10;

    // Add title if provided
    if (options.title) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(options.title, pdfWidth / 2, 10, { align: 'center' });
    }

    // Add image to PDF
    pdf.addImage(imgData, 'PNG', imgX, imgY + (options.title ? 10 : 0), imgWidth * ratio, imgHeight * ratio);

    // Return as blob
    return pdf.output('blob');

  } catch (error) {
    console.error('Error generating PDF:', error);
    return null;
  }
};

/**
 * Downloads a PDF file
 */
export const downloadPDF = async (options: PDFOptions): Promise<boolean> => {
  try {
    const blob = await generatePDFFromElement(options);
    if (!blob) return false;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = options.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Error downloading PDF:', error);
    return false;
  }
};

/**
 * Creates a text-based PDF for financial analysis
 */
export const createFinancialAnalysisPDF = async (property: any, metrics: any, aiAnalysis: string, reportContent: string): Promise<Blob | null> => {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let yPosition = 20;
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 7;

    // Helper function to add text with page break
    const addText = (text: string, fontSize: number = 12, fontStyle: string = 'normal') => {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', fontStyle);
      const lines = pdf.splitTextToSize(text, pdf.internal.pageSize.getWidth() - 2 * margin);
      
      lines.forEach((line: string) => {
        pdf.text(line, margin, yPosition);
        yPosition += lineHeight;
      });
      
      yPosition += 3; // Add spacing after paragraphs
    };

    // Title
    addText('ROI Investment Analysis Report', 18, 'bold');
    yPosition += 5;

    // Property Information
    addText('Property Information', 14, 'bold');
    addText(`Address: ${property.address}`);
    addText(`${property.city}, ${property.state} ${property.zip}`);
    addText(`Property Type: ${property.type}`);
    yPosition += 5;

    // Financial Metrics
    if (metrics) {
      addText('Financial Metrics', 14, 'bold');
      addText(`Purchase Price: $${metrics.totalInvestment?.toLocaleString() || property.purchasePrice?.toLocaleString()}`);
      addText(`Estimated Renovation: $${(metrics.actualWorkCost || property.estimatedRepairCost)?.toLocaleString()}`);
      addText(`After Repair Value: $${property.afterRepairValue?.toLocaleString()}`);
      addText(`Projected Monthly Rent: $${metrics.estimatedMonthlyRent?.toLocaleString()}`);
      addText(`Annual Income: $${metrics.annualIncome?.toLocaleString()}`);
      addText(`Annual Expenses: $${metrics.annualExpenses?.toLocaleString()}`);
      addText(`Net Operating Income: $${metrics.noi?.toLocaleString()}`);
      addText(`Cap Rate: ${metrics.capRate}%`);
      addText(`Cash on Cash Return: ${metrics.cashOnCash}%`);
      yPosition += 5;
    }

    // AI Analysis
    if (aiAnalysis) {
      addText('AI Investment Analysis', 14, 'bold');
      addText(aiAnalysis);
      yPosition += 5;
    }

    // Market Valuation Report
    if (reportContent) {
      addText('Market Valuation Report', 14, 'bold');
      addText(reportContent);
      yPosition += 5;
    }

    // Footer
    addText('---', 12, 'normal');
    addText('Generated by Sabia Investments Properties Inc.');
    addText(`Date: ${new Date().toLocaleDateString()}`);

    return pdf.output('blob');

  } catch (error) {
    console.error('Error creating financial analysis PDF:', error);
    return null;
  }
};
