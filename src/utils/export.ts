import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { Product, Activity } from '../types';
import { formatDate, formatWeekYear } from './timeline';

/**
 * Exporterar produkt till PDF
 */
export function exportProductToPDF(product: Product): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = margin;

  // Header
  doc.setFontSize(20);
  doc.text('Produktlanseringsplan', margin, yPos);
  yPos += 15;

  // Produktinfo
  doc.setFontSize(14);
  doc.text(`Produkt: ${product.name}`, margin, yPos);
  yPos += 8;
  doc.setFontSize(12);
  doc.text(`GTIN: ${product.gtin}`, margin, yPos);
  yPos += 8;
  doc.text(`Lanseringsvecka: ${formatWeekYear(product.launchYear, product.launchWeek)}`, margin, yPos);
  yPos += 8;
  if (product.retailers && product.retailers.length > 0) {
    doc.text(`Kedjor: ${product.retailers.map(r => r.retailer).join(', ')}`, margin, yPos);
    yPos += 8;
    product.retailers.forEach((r) => {
      doc.text(`${r.retailer}: V${r.launchWeeks.sort((a, b) => a - b).join(', V')}`, margin + 5, yPos);
      yPos += 6;
    });
  }
  yPos += 5;

  // Aktiviteter
  doc.setFontSize(14);
  doc.text('Aktiviteter', margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  product.activities
    .sort((a, b) => a.deadlineWeek - b.deadlineWeek)
    .forEach((activity) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = margin;
      }

      const statusText = {
        not_started: 'Ej påbörjad',
        in_progress: 'Pågående',
        completed: 'Klart',
      }[activity.status];

      doc.setFontSize(11);
      doc.text(activity.name, margin, yPos);
      yPos += 6;
      doc.setFontSize(9);
      doc.text(`Deadline: ${formatDate(activity.deadline)} (${formatWeekYear(activity.deadline.getFullYear(), activity.deadlineWeek)})`, margin + 5, yPos);
      yPos += 5;
      doc.text(`Status: ${statusText}`, margin + 5, yPos);
      if (activity.assigneeName) {
        yPos += 5;
        doc.text(`Ansvarig: ${activity.assigneeName}`, margin + 5, yPos);
      }
      yPos += 8;
    });

  doc.save(`${product.name}-lanseringsplan.pdf`);
}

/**
 * Exporterar alla produkter till Excel
 */
export function exportProductsToExcel(products: Product[]): void {
  const workbook = XLSX.utils.book_new();

  // Sammanfattning
  const summaryData = products.map((p) => ({
    Produkt: p.name,
    GTIN: p.gtin,
    'Lanseringsvecka': `${formatWeekYear(p.launchYear, p.launchWeek)}`,
    Kedjor: p.retailers && p.retailers.length > 0 ? p.retailers.map(r => r.retailer).join(', ') : '',
    Status: {
      draft: 'Utkast',
      active: 'Aktiv',
      completed: 'Klart',
      cancelled: 'Inställd',
    }[p.status],
    'Antal aktiviteter': p.activities.length,
    'Klara aktiviteter': p.activities.filter((a) => a.status === 'completed').length,
  }));

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Sammanfattning');

  // Detaljerad vy per produkt
  products.forEach((product) => {
    const activityData = product.activities.map((a) => ({
      Aktivitet: a.name,
      Kategori: a.category,
      Deadline: formatDate(a.deadline),
      Vecka: formatWeekYear(a.deadline.getFullYear(), a.deadlineWeek),
      Status: {
        not_started: 'Ej påbörjad',
        in_progress: 'Pågående',
        completed: 'Klart',
      }[a.status],
      Ansvarig: a.assigneeName || '',
      Kommentarer: a.comments.length,
    }));

    const activitySheet = XLSX.utils.json_to_sheet(activityData);
    XLSX.utils.book_append_sheet(workbook, activitySheet, product.name.substring(0, 31));
  });

  XLSX.writeFile(workbook, 'produktlanseringar.xlsx');
}

/**
 * Genererar Outlook-kalenderfil (.ics)
 */
export function exportActivityToICS(activity: Activity, product: Product): string {
  const formatICSDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Launch Planner//Nordic FMCG//EN',
    'BEGIN:VEVENT',
    `UID:${activity.id}@launch-planner`,
    `DTSTART:${formatICSDate(activity.deadline)}`,
    `DTEND:${formatICSDate(new Date(activity.deadline.getTime() + 3600000))}`,
    `SUMMARY:${activity.name} - ${product.name}`,
    `DESCRIPTION:${activity.description}\\nProdukt: ${product.name}\\nGTIN: ${product.gtin}`,
    `LOCATION:${product.retailer || 'Dagligvaruhandel'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return icsContent;
}

