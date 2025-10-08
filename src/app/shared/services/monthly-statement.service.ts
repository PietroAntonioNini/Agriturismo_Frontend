import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';

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
}


