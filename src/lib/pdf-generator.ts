import jsPDF from 'jspdf';

// Type definitions for structured MPU data
export interface DelictData {
  number: string;
  type: string;
  year: string;
  whatHappened: string;
  whenHappened: string;
  whereHappened: string;
  fineOrPunishment: string;
  points: string;
}

export interface GeneralData {
  totalPoints: string;
  birthDate: string;
  fullName: string;
  address?: string;
  birthPlace?: string;
  caseNumbers?: string[];
  currentLicenseStatus?: string;
  additionalNotes?: string;
}

export interface ParsedMPUData {
  delicts: DelictData[];
  generalData: GeneralData;
  rawText: string;
}

// Function to parse the AI-extracted text into structured data
export function parseExtractedData(extractedText: string): ParsedMPUData {
  const delicts: DelictData[] = [];
  const generalData: GeneralData = {
    totalPoints: '',
    birthDate: '',
    fullName: ''
  };

  try {
    // Parse delicts - split into sections manually for better compatibility
    const delictSections = extractedText.split(/(?=\*\*Delict \d+:)/);
    const delictMatches = delictSections.filter(section => section.includes('**Delict'));
    
    if (delictMatches) {
      delictMatches.forEach((delictText, index) => {
        const delict: DelictData = {
          number: `${index + 1}`,
          type: '',
          year: '',
          whatHappened: '',
          whenHappened: '',
          whereHappened: '',
          fineOrPunishment: '',
          points: ''
        };

        // Extract delict header (type and year)
        const headerMatch = delictText.match(/\*\*Delict \d+:\s*(.*?)\s*\(\s*(\d{4})\s*\)\*\*/);
        if (headerMatch) {
          delict.type = headerMatch[1].trim();
          delict.year = headerMatch[2];
        }

        // Extract each field using safer regex patterns
        const whatMatch = delictText.match(/\*\*Wat is er gebeurd\?\*\*[\s\S]*?-\s*([\s\S]*?)(?=\*\*Wanneer|$)/);
        if (whatMatch) delict.whatHappened = whatMatch[1].trim();

        const whenMatch = delictText.match(/\*\*Wanneer is het gebeurd\?\*\*[\s\S]*?-\s*([\s\S]*?)(?=\*\*Waar|$)/);
        if (whenMatch) delict.whenHappened = whenMatch[1].trim();

        const whereMatch = delictText.match(/\*\*Waar is het gebeurd\?\*\*[\s\S]*?-\s*([\s\S]*?)(?=\*\*Wat is de boete|$)/);
        if (whereMatch) delict.whereHappened = whereMatch[1].trim();

        const fineMatch = delictText.match(/\*\*Wat is de boete en\/of straf\?\*\*[\s\S]*?-\s*([\s\S]*?)(?=\*\*Hoeveel punten|$)/);
        if (fineMatch) delict.fineOrPunishment = fineMatch[1].trim();

        const pointsMatch = delictText.match(/\*\*Hoeveel punten heeft dit delict opgeleverd\?\*\*[\s\S]*?-\s*([\s\S]*?)(?=---|$)/);
        if (pointsMatch) delict.points = pointsMatch[1].trim();

        delicts.push(delict);
      });
    }

    // Parse general data
    const generalMatch = extractedText.match(/\*\*Algemene Gegevens\*\*([\s\S]*?)(?=---|\*\*Delict|$)/);
    if (generalMatch) {
      const generalText = generalMatch[1];

      const pointsMatch = generalText.match(/\*\*Hoeveel punten heeft deze persoon op zijn rijbewijs\?\*\*[\s\S]*?-\s*([\s\S]*?)(?=\*\*|$)/);
      if (pointsMatch) generalData.totalPoints = pointsMatch[1].trim();

      const birthDateMatch = generalText.match(/\*\*Geboortedatum:\*\*[\s\S]*?-\s*([\s\S]*?)(?=\*\*|$)/);
      if (birthDateMatch) generalData.birthDate = birthDateMatch[1].trim();

      const nameMatch = generalText.match(/\*\*Voornaam en achternaam:\*\*[\s\S]*?-\s*([\s\S]*?)(?=\*\*|$)/);
      if (nameMatch) generalData.fullName = nameMatch[1].trim();

      // Extract additional fields
      const addressMatch = generalText.match(/\*\*Adres[\s\S]*?\*\*[\s\S]*?-\s*([\s\S]*?)(?=\*\*|$)/);
      if (addressMatch) generalData.address = addressMatch[1].trim();

      const birthPlaceMatch = generalText.match(/\*\*Geboorteplaats:\*\*[\s\S]*?-\s*([\s\S]*?)(?=\*\*|$)/);
      if (birthPlaceMatch) generalData.birthPlace = birthPlaceMatch[1].trim();

      const licenseMatch = generalText.match(/\*\*Huidige administratieve status rijbewijs[\s\S]*?\*\*[\s\S]*?-\s*([\s\S]*?)(?=\*\*|$)/);
      if (licenseMatch) generalData.currentLicenseStatus = licenseMatch[1].trim();
    }

  } catch (error) {
    console.error('Error parsing extracted data:', error);
  }

  return {
    delicts,
    generalData,
    rawText: extractedText
  };
}

// Function to generate professional PDF from parsed data
export function generateMPUReportPDF(data: ParsedMPUData, fileName: string = 'MPU_Report.pdf'): jsPDF {
  const doc = new jsPDF();
  let yPosition = 20;
  const margin = 20;
  const pageWidth = doc.internal.pageSize.width;
  const contentWidth = pageWidth - (2 * margin);

  // Helper function to add text with word wrap
  const addText = (text: string, x: number, y: number, options: any = {}) => {
    const fontSize = options.fontSize || 10;
    const maxWidth = options.maxWidth || contentWidth;
    const lineHeight = options.lineHeight || fontSize * 1.2;
    
    doc.setFontSize(fontSize);
    if (options.bold) doc.setFont('helvetica', 'bold');
    else doc.setFont('helvetica', 'normal');

    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string, index: number) => {
      doc.text(line, x, y + (index * lineHeight));
    });

    return y + (lines.length * lineHeight);
  };

  // Helper function to check if new page is needed
  const checkNewPage = (requiredHeight: number) => {
    if (yPosition + requiredHeight > doc.internal.pageSize.height - 20) {
      doc.addPage();
      yPosition = 20;
    }
  };

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('MPU DOCUMENT ANALYSIS REPORT', margin, yPosition);
  yPosition += 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString('de-DE')}`, margin, yPosition);
  yPosition += 20;

  // General Information Section
  checkNewPage(80);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ALGEMENE GEGEVENS', margin, yPosition);
  yPosition += 10;

  // Draw section divider
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 15;

  // General data fields
  const generalFields = [
    { label: 'Voornaam en achternaam:', value: data.generalData.fullName },
    { label: 'Geboortedatum:', value: data.generalData.birthDate },
    { label: 'Geboorteplaats:', value: data.generalData.birthPlace || 'Niet vermeld' },
    { label: 'Adres:', value: data.generalData.address || 'Niet vermeld' },
    { label: 'Huidige punten op rijbewijs:', value: data.generalData.totalPoints },
    { label: 'Status rijbewijs:', value: data.generalData.currentLicenseStatus || 'Niet vermeld' }
  ];

  generalFields.forEach(field => {
    checkNewPage(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    yPosition = addText(field.label, margin, yPosition, { fontSize: 11, bold: true });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    yPosition = addText(field.value, margin + 5, yPosition, { fontSize: 10 }) + 8;
  });

  yPosition += 10;

  // Delicts Section
  checkNewPage(60);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('OVERZICHT VAN DELICTEN', margin, yPosition);
  yPosition += 10;

  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 15;

  // Process each delict
  data.delicts.forEach((delict, index) => {
    checkNewPage(120);

    // Delict header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    yPosition = addText(`DELICT ${delict.number}: ${delict.type} (${delict.year})`, margin, yPosition, { 
      fontSize: 12, 
      bold: true 
    }) + 5;

    // Delict details
    const delictFields = [
      { label: 'Wat is er gebeurd?', value: delict.whatHappened },
      { label: 'Wanneer is het gebeurd?', value: delict.whenHappened },
      { label: 'Waar is het gebeurd?', value: delict.whereHappened },
      { label: 'Wat is de boete en/of straf?', value: delict.fineOrPunishment },
      { label: 'Hoeveel punten heeft dit delict opgeleverd?', value: delict.points }
    ];

    delictFields.forEach(field => {
      if (field.value) {
        checkNewPage(30);
        
        // Field label
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        yPosition = addText(`${field.label}`, margin + 5, yPosition, { 
          fontSize: 10, 
          bold: true 
        }) + 3;

        // Field value
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        yPosition = addText(field.value, margin + 10, yPosition, { 
          fontSize: 9,
          maxWidth: contentWidth - 10
        }) + 8;
      }
    });

    yPosition += 10;

    // Add divider between delicts
    if (index < data.delicts.length - 1) {
      checkNewPage(10);
      doc.setDrawColor(128, 128, 128);
      doc.setLineWidth(0.3);
      doc.line(margin + 20, yPosition, pageWidth - margin - 20, yPosition);
      yPosition += 15;
    }
  });

  // Footer on last page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text(`Seite ${i} von ${pageCount}`, pageWidth - margin - 20, doc.internal.pageSize.height - 10);
    doc.text('MPU Document Analysis Report', margin, doc.internal.pageSize.height - 10);
  }

  return doc;
}

// Function to download the PDF
export function downloadPDF(doc: jsPDF, fileName: string = 'MPU_Report.pdf') {
  doc.save(fileName);
}

// Complete function to process extracted text and generate PDF
export function generateAndDownloadMPUReport(extractedText: string, fileName?: string): void {
  try {
    // Parse the extracted data
    const parsedData = parseExtractedData(extractedText);
    
    // Generate PDF
    const doc = generateMPUReportPDF(parsedData, fileName);
    
    // Download PDF
    const downloadFileName = fileName || `MPU_Report_${parsedData.generalData.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    downloadPDF(doc, downloadFileName);
    
  } catch (error) {
    console.error('Error generating MPU report PDF:', error);
    throw new Error('Failed to generate PDF report');
  }
}