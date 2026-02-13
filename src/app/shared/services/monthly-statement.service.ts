import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { Invoice } from '../models/invoice.model';

export interface StatementUtilityRow {
  label: 'GAS' | 'LUCE' | 'ACQUA' | 'LAVANDERIA';
  type: 'gas' | 'electricity' | 'water' | 'laundry';
  unit: string;
  previous: number | null;
  current: number | null;
  consumption: number;
  unitCost: number;
  amount: number;
}

@Injectable({ providedIn: 'root' })
export class MonthlyStatementService {
  generatePdf(data: {
    apartmentName: string;
    apartmentId: number;
    month: number;
    year: number;
    rows: StatementUtilityRow[];
    rent: number;
    tari: number;
    meterFee: number;
  }): void {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 48;
    let y = margin;

    const monthNames = ['GENNAIO','FEBBRAIO','MARZO','APRILE','MAGGIO','GIUGNO','LUGLIO','AGOSTO','SETTEMBRE','OTTOBRE','NOVEMBRE','DICEMBRE'];
    const title = 'PROSPETTO SPESE MENSILE';
    doc.setFont('helvetica','bold'); doc.setFontSize(18);
    doc.text(title, 300, y, { align: 'center' }); y += 26;

    doc.setFontSize(12); doc.setFont('helvetica','normal');
    doc.text(`${data.apartmentName}`, margin, y); y += 20;
    doc.text(`Mese di ${monthNames[data.month-1]} ${data.year}`, margin, y); y += 16;

    y += 16; doc.setDrawColor(200); doc.line(margin, y, 595 - margin, y); y += 20;

    doc.setFont('helvetica','bold');
    doc.text('DETTAGLIO CONSUMI', margin, y);
    const headers = ['CONSUMO/COSTO','IMPORTO'];
    doc.text(headers[0], 330, y);
    doc.text(headers[1], 500, y, { align: 'right' });
    y += 16; doc.setDrawColor(230); doc.line(margin, y, 595 - margin, y); y += 14;

    const money = (n: number) => `${n.toFixed(2).replace('.',',')} €`;
    const printRow = (label: string, prev: string, curr: string, cons: string, unitCost: string, amount: string) => {
      doc.setFont('helvetica','bold'); doc.text(label, margin, y);
      doc.setFont('helvetica','normal');
      doc.text(prev, margin + 80, y);
      doc.text(curr, margin + 160, y);
      doc.text(`${cons}  x  ${unitCost}`, 330, y);
      doc.text(amount, 500, y, { align: 'right' });
      y += 22;
    };

    doc.setFont('helvetica','normal');
    doc.text('A=Attuale  P=Precedente', margin, y); y += 20;

    data.rows.forEach(r => {
      const cons = (r.consumption ?? ((r.current ?? 0) - (r.previous ?? 0))) || 0;
      const amount = cons * (r.unitCost || 0);
      printRow(
        r.label,
        `A ${r.current ?? '-'}   P ${r.previous ?? '-'}`,
        '',
        `${cons} ${r.unit}`,
        `${(r.unitCost || 0).toFixed(2).replace('.', ',')} €/ ${r.unit}`,
        money(amount)
      );
    });

    printRow('AFFITTO', '', '', '', '', money(data.rent || 0));
    y += 8; doc.setDrawColor(230); doc.line(margin, y, 595 - margin, y); y += 18;

    doc.setFont('helvetica','bold'); doc.text('COSTI FISSI', margin, y); y += 20;
    doc.setFont('helvetica','normal');
    printRow('TARI (N. Urbana)', '', '', '', '', money(data.tari || 0));
    printRow('Contatori', '', '', '', '', money(data.meterFee || 0));
    y += 8; doc.setDrawColor(230); doc.line(margin, y, 595 - margin, y); y += 18;

    const utilitiesTotal = data.rows.reduce((s, r) => {
      const cons = (r.consumption ?? ((r.current ?? 0) - (r.previous ?? 0))) || 0;
      return s + cons * (r.unitCost || 0);
    }, 0);
    const subtotalUtenze = utilitiesTotal + (data.meterFee || 0);
    const totale = subtotalUtenze + (data.tari || 0) + (data.rent || 0);

    doc.setDrawColor(0, 0, 0);
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(margin, y, 595 - margin*2, 70, 6, 6, 'FD');

    // Add a border line inside the box for better separation
    doc.setDrawColor(180, 180, 180);
    doc.line(300, y + 5, 300, y + 65);

    doc.setFont('helvetica','bold'); doc.setFontSize(12);
    doc.text('SUBTOTALE UTENZE', margin + 16, y + 22);
    doc.setFontSize(14);
    doc.text(money(subtotalUtenze), margin + 16, y + 45);

    doc.setFontSize(12);
    doc.text('TOTALE DA PAGARE', 595 - margin - 16, y + 22, { align: 'right' });
    doc.setFontSize(16);
    doc.text(money(totale), 595 - margin - 16, y + 48, { align: 'right' });
    y += 90;

    const due = new Date(data.year, data.month, 10);
    const dueLabel = due.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.setFont('helvetica','normal'); doc.setFontSize(12);
    doc.text(`Scadenza: ${dueLabel}`, 300, y + 10, { align: 'center' });

    const filename = `prospetto-${data.apartmentName}-${String(data.month).padStart(2,'0')}-${data.year}.pdf`.replace(/\s+/g,'_');
    doc.save(filename);
  }

  /**
   * Genera il PDF "Prospetto Spese Mensile" partendo dai dati di una fattura.
   * Parsifica le descrizioni degli item per estrarre letture, consumi e costi unitari.
   */
  generateFromInvoice(invoice: Invoice, tenantName: string, apartmentName: string): void {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pw = 595;
    const margin = 48;
    const tw = pw - 2 * margin; // 499
    let y = margin;

    const monthNames = [
      'GENNAIO','FEBBRAIO','MARZO','APRILE','MAGGIO','GIUGNO',
      'LUGLIO','AGOSTO','SETTEMBRE','OTTOBRE','NOVEMBRE','DICEMBRE'
    ];

    // --- Helpers di formattazione ---
    const money = (n: number): string => `${n.toFixed(2).replace('.', ',')} €`;
    const fmtReading = (n: number, unit: string): string => {
      const s = n % 1 === 0 ? n.toFixed(0) : n.toFixed(1).replace('.', ',');
      return `${s} ${unit}`;
    };
    const fmtUnitCost = (n: number, unit: string): string =>
      `${n.toFixed(2).replace('.', ',')} €/${unit}`;

    // --- Mapping tipo → label / unità ---
    const typeMap: Record<string, { label: string; unit: string }> = {
      electricity:        { label: 'LUCE',       unit: 'kWh' },
      gas:                { label: 'GAS',        unit: 'm³' },
      water:              { label: 'ACQUA',      unit: 'm³' },
      electricity_laundry:{ label: 'LAVANDERIA', unit: 'kWh' },
    };

    // --- Parsing items della fattura ---
    interface ParsedUtility {
      label: string;
      unit: string;
      previous: number | null;
      current: number | null;
      consumption: number;
      unitCost: number;
      amount: number;
    }

    const utilityItems: ParsedUtility[] = [];
    const otherItems: { description: string; amount: number }[] = [];
    let rent = 0;
    let tari = 0;
    let meterFee = 0;

    const readingRegex = /lettura\s+([\d.]+)\s*→\s*([\d.]+)\s*\(consumo\s+([\d.]+)\s*([^\s)]+)\s*[×x]\s*€([\d.,]+)\)/;

    for (const item of invoice.items) {
      if (item.type in typeMap) {
        const mapping = typeMap[item.type];
        const match = item.description.match(readingRegex);
        if (match) {
          utilityItems.push({
            label: mapping.label,
            unit: match[4] || mapping.unit,
            previous: parseFloat(match[1]),
            current: parseFloat(match[2]),
            consumption: parseFloat(match[3]),
            unitCost: parseFloat(match[5].replace(',', '.')),
            amount: item.amount,
          });
        } else {
          utilityItems.push({
            label: mapping.label,
            unit: mapping.unit,
            previous: null,
            current: null,
            consumption: 0,
            unitCost: 0,
            amount: item.amount,
          });
        }
      } else if (item.type === 'rent') {
        rent += item.amount;
      } else if (item.type === 'tari') {
        tari += item.amount;
      } else if (item.type === 'meter_fee') {
        meterFee += item.amount;
      } else {
        // entry, maintenance, other
        otherItems.push({ description: item.description, amount: item.amount });
      }
    }

    const hasConsumi = utilityItems.length > 0 || rent > 0;
    const hasFixedCosts = tari > 0 || meterFee > 0;
    const hasOtherItems = otherItems.length > 0;

    // ===================== HEADER =====================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text('PROSPETTO SPESE MENSILE', pw / 2, y, { align: 'center' });
    y += 32;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`${tenantName} - ${apartmentName}`, margin, y);
    y += 16;
    doc.setTextColor(80, 80, 80);
    doc.text(`Mese di ${monthNames[invoice.month - 1]} ${invoice.year}`, margin, y);
    y += 20;

    // Linea divisoria colorata
    doc.setDrawColor(30, 55, 90);
    doc.setLineWidth(2);
    doc.line(margin, y, pw - margin, y);
    y += 28;

    // ===================== DETTAGLIO CONSUMI (solo se ci sono utenze/affitto) =====================
    if (hasConsumi) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.text('DETTAGLIO CONSUMI', margin, y);
      y += 22;

      // Definizione colonne tabella (6 colonne)
      const colW = [75, 85, 85, 80, 85, 89]; // totale 499
      const colX: number[] = [margin];
      for (let i = 0; i < colW.length; i++) {
        colX.push(colX[i] + colW[i]);
      }

      const headerH = 36;
      const rowH = 32;
      const dataRowCount = utilityItems.length + (rent > 0 ? 1 : 0);
      const consumiTableH = headerH + dataRowCount * rowH;

      // 1) Sfondo header
      doc.setFillColor(245, 245, 248);
      doc.rect(margin, y, tw, headerH, 'F');

      // 2) Sfondo grigio celle vuote AFFITTO (colonne 1-4)
      if (rent > 0) {
        const affittoY = y + headerH + utilityItems.length * rowH;
        doc.setFillColor(238, 238, 240);
        doc.rect(colX[1], affittoY, colX[5] - colX[1], rowH, 'F');
      }

      // 3) Bordi tabella (dopo i fill)
      doc.setDrawColor(190, 190, 190);
      doc.setLineWidth(0.5);
      doc.rect(margin, y, tw, consumiTableH);
      for (let i = 1; i < colW.length; i++) {
        doc.line(colX[i], y, colX[i], y + consumiTableH);
      }
      doc.line(margin, y + headerH, margin + tw, y + headerH);

      // Testo header
      const headerLabels = [
        ['SERVIZIO'], ['LETTURA', 'PREC.'], ['LETTURA', 'ATT.'],
        ['CONSUMO'], ['COSTO', 'UNIT.'], ['IMPORTO'],
      ];
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(70, 70, 70);
      headerLabels.forEach((lines, i) => {
        const cx = colX[i] + colW[i] / 2;
        if (lines.length === 2) {
          doc.text(lines[0], cx, y + 14, { align: 'center' });
          doc.text(lines[1], cx, y + 24, { align: 'center' });
        } else {
          doc.text(lines[0], cx, y + 20, { align: 'center' });
        }
      });

      y += headerH;

      // Funzione riga consumi
      const drawConsRow = (
        label: string, prevStr: string, currStr: string,
        consStr: string, costStr: string, importoStr: string, isLast: boolean
      ) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
        doc.text(label, colX[0] + 8, y + 20);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(50, 50, 50);
        doc.text(prevStr, colX[1] + colW[1] / 2, y + 20, { align: 'center' });
        doc.text(currStr, colX[2] + colW[2] / 2, y + 20, { align: 'center' });
        doc.text(consStr, colX[3] + colW[3] / 2, y + 20, { align: 'center' });
        doc.text(costStr, colX[4] + colW[4] / 2, y + 20, { align: 'center' });
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(40, 55, 85);
        doc.text(importoStr, colX[5] + colW[5] - 8, y + 20, { align: 'right' });
        y += rowH;
        if (!isLast) {
          doc.setDrawColor(215, 215, 215); doc.setLineWidth(0.3);
          doc.line(margin, y, margin + tw, y);
        }
      };

      utilityItems.forEach((u) => {
        const prevStr = u.previous !== null ? fmtReading(u.previous, u.unit) : '—';
        const currStr = u.current !== null ? fmtReading(u.current, u.unit) : '—';
        const consStr = u.consumption ? fmtReading(u.consumption, u.unit) : '—';
        const costStr = u.unitCost ? fmtUnitCost(u.unitCost, u.unit) : '—';
        drawConsRow(u.label, prevStr, currStr, consStr, costStr, money(u.amount), false);
      });

      if (rent > 0) {
        drawConsRow('AFFITTO', '', '', '', '', money(rent), true);
      }

      y += 22;
    }

    // ===================== COSTI FISSI (solo se presenti) =====================
    if (hasFixedCosts) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.text('COSTI FISSI', margin, y);
      y += 18;

      const fixedCosts: { label: string; amount: number }[] = [];
      if (tari > 0) fixedCosts.push({ label: 'TARI (N. Urbana)', amount: tari });
      if (meterFee > 0) fixedCosts.push({ label: 'Contatori', amount: meterFee });

      const fixedRowH = 30;
      const fixedTableH = fixedCosts.length * fixedRowH;
      const fixedImportoW = 89;
      const fixedLabelW = tw - fixedImportoW;

      doc.setDrawColor(190, 190, 190);
      doc.setLineWidth(0.5);
      doc.rect(margin, y, tw, fixedTableH);
      doc.line(margin + fixedLabelW, y, margin + fixedLabelW, y + fixedTableH);

      fixedCosts.forEach((fc, idx) => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(0, 0, 0);
        doc.text(fc.label, margin + 10, y + 19);
        doc.setFont('helvetica', 'bold'); doc.setTextColor(40, 55, 85);
        doc.text(money(fc.amount), margin + tw - 10, y + 19, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        y += fixedRowH;
        if (idx < fixedCosts.length - 1) {
          doc.setDrawColor(215, 215, 215);
          doc.line(margin, y, margin + tw, y);
        }
      });

      y += 26;
    }

    // ===================== DETTAGLIO VOCI (per item generici: caparra, manutenzione, ecc.) =====================
    if (hasOtherItems) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.text('DETTAGLIO VOCI', margin, y);
      y += 22;

      const otherHeaderH = 32;
      const otherRowH = 30;
      const otherImportoW = 110;
      const otherDescW = tw - otherImportoW;
      const otherTableH = otherHeaderH + otherItems.length * otherRowH;

      // Sfondo header
      doc.setFillColor(245, 245, 248);
      doc.rect(margin, y, tw, otherHeaderH, 'F');

      // Bordi (dopo fill)
      doc.setDrawColor(190, 190, 190);
      doc.setLineWidth(0.5);
      doc.rect(margin, y, tw, otherTableH);
      doc.line(margin + otherDescW, y, margin + otherDescW, y + otherTableH);
      doc.line(margin, y + otherHeaderH, margin + tw, y + otherHeaderH);

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(70, 70, 70);
      doc.text('DESCRIZIONE', margin + otherDescW / 2, y + 20, { align: 'center' });
      doc.text('IMPORTO', margin + otherDescW + otherImportoW / 2, y + 20, { align: 'center' });
      y += otherHeaderH;

      // Righe
      otherItems.forEach((oi, idx) => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(0, 0, 0);
        doc.text(oi.description, margin + 10, y + 19);
        doc.setFont('helvetica', 'bold'); doc.setTextColor(40, 55, 85);
        doc.text(money(oi.amount), margin + tw - 10, y + 19, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        y += otherRowH;
        if (idx < otherItems.length - 1) {
          doc.setDrawColor(215, 215, 215); doc.setLineWidth(0.3);
          doc.line(margin, y, margin + tw, y);
        }
      });

      y += 22;
    }

    // ===================== BOX RIEPILOGO =====================
    const subtotalUtenze = utilityItems.reduce((sum, u) => sum + u.amount, 0);
    const totale = invoice.total;
    const boxH = 64;

    if (hasConsumi) {
      // Due box affiancati: subtotale utenze + totale
      const leftBoxW = Math.round(tw * 0.44);
      const rightBoxW = tw - leftBoxW;

      doc.setDrawColor(190, 190, 190);
      doc.setLineWidth(0.5);
      doc.rect(margin, y, leftBoxW, boxH);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(90, 90, 90);
      doc.text('SUBTOTALE UTENZE', margin + 14, y + 20);
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(money(subtotalUtenze), margin + 14, y + 46);

      doc.setFillColor(25, 35, 55);
      doc.setDrawColor(25, 35, 55);
      doc.rect(margin + leftBoxW, y, rightBoxW, boxH, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(180, 190, 210);
      doc.text('TOTALE DA PAGARE', margin + leftBoxW + 16, y + 20);
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.text(money(totale), margin + leftBoxW + 16, y + 48);
    } else {
      // Box singolo largo: solo totale da pagare
      doc.setFillColor(25, 35, 55);
      doc.setDrawColor(25, 35, 55);
      doc.rect(margin, y, tw, boxH, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(180, 190, 210);
      doc.text('TOTALE DA PAGARE', margin + 16, y + 20);
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text(money(totale), margin + 16, y + 48);
    }

    y += boxH + 28;

    // ===================== SCADENZA =====================
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    const dueDate = new Date(invoice.dueDate);
    const dueDateStr = dueDate.toLocaleDateString('it-IT', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    const prefix = 'Scadenza: ';
    doc.setFont('helvetica', 'normal');
    const prefixW = doc.getTextWidth(prefix);
    doc.setFont('helvetica', 'bold');
    const dateW = doc.getTextWidth(dueDateStr);
    const totalW = prefixW + dateW;
    const startX = (pw - totalW) / 2;
    doc.setFont('helvetica', 'normal');
    doc.text(prefix, startX, y);
    doc.setFont('helvetica', 'bold');
    doc.text(dueDateStr, startX + prefixW, y);

    // ===================== SALVA =====================
    const filename = `prospetto-${apartmentName}-${String(invoice.month).padStart(2, '0')}-${invoice.year}.pdf`.replace(/\s+/g, '_');
    doc.save(filename);
  }
}


