import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ContractTemplatesService {
  
  constructor() { }
  
  /**
   * Restituisce il template di condizioni contrattuali in base al tipo selezionato
   * @param templateType - Tipo di contratto
   * @returns Template di termini e condizioni
   */
  getTemplateByType(templateType: string): string {
    switch (templateType) {
      case 'transitorio':
        return this.getTemplateTransitorio();
      case 'custom':
        return '';
      default:
        return '';
    }
  }
  
  /**
   * Template per contratto transitorio (L. 431/98, art. 5)
   */
  private getTemplateTransitorio(): string {
    return `CONDIZIONI GENERALI DI LOCAZIONE
(Contratto transitorio - L. 431/98, art. 5)

1. DURATA E TIPOLOGIA
Il presente contratto di locazione è stipulato per soddisfare esigenze transitorie del conduttore, ai sensi dell'art. 5, comma 1, della Legge n. 431/98, e ha durata di [durata] mesi, dal [data inizio] al [data fine]. Alla scadenza il contratto cesserà senza necessità di disdetta.

2. ESIGENZE TRANSITORIE
Le parti dichiarano che la presente locazione ha natura transitoria per la seguente motivazione documentata: [indicare l'esigenza transitoria: lavoro a tempo determinato, studio, cure mediche, attesa assegnazione abitazione, etc.].
A tal fine il conduttore allega la seguente documentazione comprovante la transitoria esigenza abitativa: [elenco documenti].

3. CANONE DI LOCAZIONE
Il canone di locazione è convenuto in € [importo] mensili, da corrispondersi anticipatamente entro il giorno [giorno] di ogni mese. Il conduttore non potrà per alcun motivo ritardare il pagamento del canone oltre i termini stabiliti.

4. DEPOSITO CAUZIONALE E SICUREZZE
A garanzia delle obbligazioni assunte con il presente contratto, il conduttore versa al locatore la somma di € [importo] pari a [numero] mensilità del canone, a titolo di deposito cauzionale, non imputabile in conto canoni e produttiva di interessi legali. Il deposito cauzionale sarà restituito al termine della locazione, previa verifica dello stato dell'unità immobiliare e dell'osservanza di ogni obbligazione contrattuale.

5. STATO DI CONSEGNA E RICONSEGNA DELL'IMMOBILE
Il conduttore riceve l'immobile nello stato in cui si trova al momento della consegna, come risulta dall'inventario allegato al presente contratto. Alla scadenza del contratto, il conduttore riconsegnerà l'immobile al locatore nello stato in cui gli è stato consegnato, salvo il normale deterioramento d'uso, pena il risarcimento del danno e la trattenuta del deposito cauzionale.

6. DESTINAZIONE E UTILIZZO DELL'IMMOBILE
L'immobile è destinato esclusivamente ad uso abitativo del conduttore e delle persone con lui conviventi. È fatto espresso divieto di sublocazione, anche parziale, e di comodato, né il conduttore può cedere il contratto senza il consenso scritto del locatore.

7. ONERI ACCESSORI
Sono a carico del conduttore le spese relative al servizio di pulizia, al funzionamento e all'ordinaria manutenzione dell'ascensore, alla fornitura dell'acqua, dell'energia elettrica, del riscaldamento e del condizionamento dell'aria, allo spurgo dei pozzi neri e delle latrine, nonché alle forniture degli altri servizi comuni secondo quanto previsto dalla Tabella oneri accessori allegata al D.M. 16/01/2017.

8. MANUTENZIONE E RIPARAZIONI
Il conduttore deve eseguire tutte le riparazioni conseguenti a danni provocati dalla sua negligenza nell'uso della cosa locata e delle apparecchiature ivi esistenti, nonché le piccole riparazioni di cui all'art. 1609 c.c. Per la disciplina delle riparazioni ordinarie e straordinarie si rinvia agli artt. 1576 e seguenti del Codice Civile.

9. MIGLIORAMENTI E ADDIZIONI
Il conduttore non può apportare alcuna modifica, innovazione, miglioria o addizione ai locali locati ed alla loro destinazione, senza il preventivo consenso scritto del locatore.

10. VISITA DELL'IMMOBILE
Il locatore si riserva il diritto di visitare o far visitare l'immobile, previo preavviso, durante l'ultimo mese di locazione, per le eventuali verifiche o per mostrarlo a nuovi potenziali conduttori.

11. RINNOVO O PROROGA
Alla scadenza, le parti possono stipulare un nuovo contratto transitorio solo qualora permangano i requisiti previsti dal presente articolo, altrimenti il nuovo contratto sarà regolato dalle disposizioni relative alle locazioni ordinarie.

12. IMPOSTE, TASSE E SPESE
La registrazione del contratto è a carico del locatore e del conduttore in parti uguali.

13. CLAUSOLE VESSATORIE
Ai sensi degli articoli 1341 e 1342 del Codice Civile, il conduttore dichiara di approvare specificamente le clausole: n. 2 (Esigenze Transitorie), n. 3 (Canone), n. 4 (Deposito Cauzionale), n. 5 (Stato di Consegna), n. 6 (Destinazione), n. 7 (Oneri Accessori), n. 8 (Manutenzione), n. 9 (Miglioramenti), n. 10 (Visita), n. 11 (Rinnovo).

14. RINVIO ALLE NORME DI LEGGE
Per quanto non previsto dal presente contratto, le parti fanno riferimento alle disposizioni del Codice Civile, alla Legge n. 392/1978, alla Legge n. 431/1998, ai decreti ministeriali attuativi e agli Accordi Territoriali.

15. FORO COMPETENTE
Per qualsiasi controversia derivante dal presente contratto sarà competente il Foro del luogo in cui si trova l'immobile locato.`;
  }
}