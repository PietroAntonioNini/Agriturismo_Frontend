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
      case '4+4':
        return this.getTemplate4plus4();
      case '3+2':
        return this.getTemplate3plus2();
      case 'transitorio':
        return this.getTemplateTransitorio();
      case 'studenti':
        return this.getTemplateStudenti();
      case 'custom':
        return '';
      default:
        return '';
    }
  }
  
  /**
   * Template per contratto 4+4 (L. 431/98, art. 2, comma 1)
   */
  private getTemplate4plus4(): string {
    return `CONDIZIONI GENERALI DI LOCAZIONE
(Contratto 4+4 - L. 431/98, art. 2, comma 1)

1. DURATA E RINNOVO
Il presente contratto ha durata di quattro anni, rinnovabile per ulteriori quattro anni salvo disdetta motivata del locatore secondo quanto previsto dalla L. 431/1998, art. 3. La disdetta deve essere comunicata mediante lettera raccomandata A.R. o PEC almeno sei mesi prima della scadenza.

2. DESTINAZIONE E UTILIZZO DELL'IMMOBILE
L'immobile è destinato esclusivamente ad uso abitativo del conduttore e delle persone con lui conviventi. È fatto espresso divieto di sublocazione, anche parziale, e di comodato, né il conduttore può cedere il contratto senza il consenso scritto del locatore.

3. CANONE E AGGIORNAMENTI
Il canone di locazione è convenuto in € [importo] mensili, da corrispondersi anticipatamente entro il giorno [giorno] di ogni mese. Il canone sarà aggiornato ogni anno nella misura del 75% della variazione dell'indice ISTAT dei prezzi al consumo per le famiglie di operai e impiegati verificatasi nell'anno precedente.

4. DEPOSITO CAUZIONALE
A garanzia delle obbligazioni assunte con il presente contratto, il conduttore versa al locatore la somma di € [importo] a titolo di deposito cauzionale, non imputabile in conto canoni e produttiva di interessi legali che saranno corrisposti al conduttore alla fine di ogni anno. Il deposito cauzionale sarà restituito al termine della locazione, previa verifica dello stato dell'unità immobiliare e dell'osservanza di ogni obbligazione contrattuale.

5. ONERI ACCESSORI
Sono a carico del conduttore le spese relative al servizio di pulizia, al funzionamento e all'ordinaria manutenzione dell'ascensore, alla fornitura dell'acqua, dell'energia elettrica, del riscaldamento e del condizionamento dell'aria, allo spurgo dei pozzi neri e delle latrine, nonché alle forniture degli altri servizi comuni.

6. MANUTENZIONE E RIPARAZIONI
Il conduttore deve eseguire tutte le riparazioni conseguenti a danni provocati dalla sua negligenza nell'uso della cosa locata e delle apparecchiature ivi esistenti, nonché le piccole riparazioni di cui all'art. 1609 c.c. Per la disciplina delle riparazioni ordinarie e straordinarie si rinvia agli artt. 1576 e seguenti del Codice Civile.

7. MIGLIORAMENTI E ADDIZIONI
Il conduttore non può apportare alcuna modifica, innovazione, miglioria o addizione ai locali locati ed alla loro destinazione, senza il preventivo consenso scritto del locatore.

8. RICONSEGNA DELL'IMMOBILE
Alla scadenza del contratto, il conduttore riconsegnerà l'immobile al locatore nello stato in cui gli è stato consegnato, salvo il normale deterioramento d'uso, pena il risarcimento del danno.

9. VISITA DELL'IMMOBILE
Il locatore si riserva il diritto di visitare o far visitare l'immobile, previo preavviso, durante l'ultimo mese di locazione, per le eventuali verifiche o per mostrarlo a nuovi potenziali conduttori.

10. IMPOSTE, TASSE E SPESE
La registrazione del contratto è a carico del locatore e del conduttore in parti uguali.

11. RINVIO ALLE NORME DI LEGGE
Per quanto non previsto dal presente contratto, le parti fanno riferimento alle disposizioni del Codice Civile, alla Legge n. 392/1978, alla Legge n. 431/1998 e alle norme vigenti in materia di locazioni di immobili urbani.`;
  }
  
  /**
   * Template per contratto 3+2 a canone concordato (L. 431/98, art. 2, comma 3)
   */
  private getTemplate3plus2(): string {
    return `CONDIZIONI GENERALI DI LOCAZIONE
(Contratto a canone concordato 3+2 - L. 431/98, art. 2, comma 3)

1. DURATA E RINNOVO
Il presente contratto è stipulato per la durata di anni tre, con decorrenza dal [data inizio] al [data fine], e si rinnoverà automaticamente per ulteriori due anni in assenza di comunicazione di disdetta da inviare mediante lettera raccomandata A.R. o PEC almeno sei mesi prima della scadenza, secondo quanto previsto dall'art. 2 comma 5 della Legge 431/98.

2. CANONE CONCORDATO
Il canone annuo di locazione è convenuto in € [importo], determinato secondo gli Accordi Territoriali sottoscritti in data [data] tra le organizzazioni della proprietà edilizia e le organizzazioni dei conduttori per il Comune di [Comune], ai sensi dell'art. 2, comma 3, della Legge 431/98. Tale canone si corrisponderà in n. 12 rate mensili anticipate di € [importo mensile] ciascuna, entro il giorno [giorno] di ogni mese.

3. AGEVOLAZIONI FISCALI
Le parti danno atto che per il presente contratto si applicano le agevolazioni fiscali previste dalla normativa vigente per i contratti a canone concordato (cedolare secca al 10%, riduzione IMU, detrazione IRPEF per il conduttore).

4. ATTESTAZIONE DI RISPONDENZA
Ai sensi del D.M. 16/01/2017, le parti acquisiscono l'attestazione di rispondenza ex D.M. 16/01/2017, rilasciata da [organizzazione firmataria], che conferma la rispondenza del contenuto economico e normativo del contratto agli Accordi Territoriali.

5. DESTINAZIONE E UTILIZZO DELL'IMMOBILE
L'immobile è destinato esclusivamente ad uso abitativo del conduttore e delle persone con lui conviventi. È fatto espresso divieto di sublocazione, anche parziale, e di comodato, né il conduttore può cedere il contratto senza il consenso scritto del locatore.

6. DEPOSITO CAUZIONALE
A garanzia delle obbligazioni assunte con il presente contratto, il conduttore versa al locatore la somma di € [importo] pari a [numero] mensilità del canone, a titolo di deposito cauzionale, non imputabile in conto canoni e produttiva di interessi legali che saranno corrisposti al conduttore alla fine di ogni anno. Il deposito cauzionale sarà restituito al termine della locazione, previa verifica dello stato dell'unità immobiliare e dell'osservanza di ogni obbligazione contrattuale.

7. ONERI ACCESSORI
Sono a carico del conduttore le spese relative al servizio di pulizia, al funzionamento e all'ordinaria manutenzione dell'ascensore, alla fornitura dell'acqua, dell'energia elettrica, del riscaldamento e del condizionamento dell'aria, allo spurgo dei pozzi neri e delle latrine, nonché alle forniture degli altri servizi comuni secondo quanto previsto dalla Tabella oneri accessori allegata al D.M. 16/01/2017.

8. MANUTENZIONE E RIPARAZIONI
Il conduttore deve eseguire tutte le riparazioni conseguenti a danni provocati dalla sua negligenza nell'uso della cosa locata e delle apparecchiature ivi esistenti, nonché le piccole riparazioni di cui all'art. 1609 c.c. Per la disciplina delle riparazioni ordinarie e straordinarie si rinvia agli artt. 1576 e seguenti del Codice Civile.

9. MIGLIORAMENTI E ADDIZIONI
Il conduttore non può apportare alcuna modifica, innovazione, miglioria o addizione ai locali locati ed alla loro destinazione, senza il preventivo consenso scritto del locatore.

10. RICONSEGNA DELL'IMMOBILE
Alla scadenza del contratto, il conduttore riconsegnerà l'immobile al locatore nello stato in cui gli è stato consegnato, salvo il normale deterioramento d'uso, pena il risarcimento del danno.

11. CONCILIAZIONE STRAGIUDIZIALE
Per qualunque controversia dovesse sorgere in merito all'interpretazione ed esecuzione del presente contratto, le parti fanno ricorso alla procedura di conciliazione prevista dagli Accordi Territoriali.

12. RINVIO ALLE NORME DI LEGGE
Per quanto non previsto dal presente contratto, le parti fanno riferimento alle disposizioni del Codice Civile, alla Legge n. 392/1978, alla Legge n. 431/1998, ai decreti ministeriali attuativi e agli Accordi Territoriali.`;
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

4. ATTESTAZIONE DI RISPONDENZA
Ai sensi del D.M. 16/01/2017, le parti acquisiscono l'attestazione di rispondenza ex D.M. 16/01/2017, rilasciata da [organizzazione firmataria], che conferma la rispondenza del contenuto economico e normativo del contratto agli Accordi Territoriali.

5. DESTINAZIONE E UTILIZZO DELL'IMMOBILE
L'immobile è destinato esclusivamente ad uso abitativo del conduttore e delle persone con lui conviventi. È fatto espresso divieto di sublocazione, anche parziale, e di comodato, né il conduttore può cedere il contratto senza il consenso scritto del locatore.

6. DEPOSITO CAUZIONALE
A garanzia delle obbligazioni assunte con il presente contratto, il conduttore versa al locatore la somma di € [importo] pari a [numero] mensilità del canone, a titolo di deposito cauzionale, non imputabile in conto canoni e produttiva di interessi legali. Il deposito cauzionale sarà restituito al termine della locazione, previa verifica dello stato dell'unità immobiliare e dell'osservanza di ogni obbligazione contrattuale.

7. ONERI ACCESSORI
Sono a carico del conduttore le spese relative al servizio di pulizia, al funzionamento e all'ordinaria manutenzione dell'ascensore, alla fornitura dell'acqua, dell'energia elettrica, del riscaldamento e del condizionamento dell'aria, allo spurgo dei pozzi neri e delle latrine, nonché alle forniture degli altri servizi comuni secondo quanto previsto dalla Tabella oneri accessori allegata al D.M. 16/01/2017.

8. MANUTENZIONE E RIPARAZIONI
Il conduttore deve eseguire tutte le riparazioni conseguenti a danni provocati dalla sua negligenza nell'uso della cosa locata e delle apparecchiature ivi esistenti, nonché le piccole riparazioni di cui all'art. 1609 c.c.

9. RINNOVO O PROROGA
Alla scadenza, le parti possono stipulare un nuovo contratto transitorio solo qualora permangano i requisiti previsti dal presente articolo, altrimenti il nuovo contratto sarà regolato dalle disposizioni relative alle locazioni ordinarie.

10. RICONSEGNA DELL'IMMOBILE
Alla scadenza del contratto, il conduttore riconsegnerà l'immobile al locatore nello stato in cui gli è stato consegnato, salvo il normale deterioramento d'uso, pena il risarcimento del danno.

11. IMPOSTE, TASSE E SPESE
La registrazione del contratto è a carico del locatore e del conduttore in parti uguali.

12. RINVIO ALLE NORME DI LEGGE
Per quanto non previsto dal presente contratto, le parti fanno riferimento alle disposizioni del Codice Civile, alla Legge n. 392/1978, alla Legge n. 431/1998, ai decreti ministeriali attuativi e agli Accordi Territoriali.`;
  }
  
  /**
   * Template per contratto per studenti universitari
   */
  private getTemplateStudenti(): string {
    return `CONDIZIONI GENERALI DI LOCAZIONE
(Contratto per studenti universitari - L. 431/98, art. 5, commi 2 e 3)

1. DURATA E TIPOLOGIA
Il presente contratto di locazione è stipulato per soddisfare le esigenze abitative di studenti universitari, ai sensi dell'art. 5, commi 2 e 3, della Legge n. 431/98, e ha durata di [durata] mesi, dal [data inizio] al [data fine], rinnovabile automaticamente per pari durata in assenza di disdetta da comunicarsi almeno tre mesi prima della scadenza.

2. REQUISITI STUDENTE
Il conduttore dichiara di essere iscritto presso [nome università/istituto], facoltà di [nome facoltà], corso di [nome corso], come da documentazione allegata.

3. CANONE DI LOCAZIONE
Il canone di locazione è convenuto in € [importo] mensili, da corrispondersi anticipatamente entro il giorno [giorno] di ogni mese.

4. ATTESTAZIONE DI RISPONDENZA
Ai sensi del D.M. 16/01/2017, le parti acquisiscono l'attestazione di rispondenza ex D.M. 16/01/2017, rilasciata da [organizzazione firmataria], che conferma la rispondenza del contenuto economico e normativo del contratto agli Accordi Territoriali.

5. DESTINAZIONE E UTILIZZO DELL'IMMOBILE
L'immobile è destinato esclusivamente ad uso abitativo del conduttore e degli altri studenti eventualmente indicati nel contratto. È fatto espresso divieto di sublocazione, anche parziale, e di comodato, né il conduttore può cedere il contratto senza il consenso scritto del locatore.

6. DEPOSITO CAUZIONALE
A garanzia delle obbligazioni assunte con il presente contratto, il conduttore versa al locatore la somma di € [importo] pari a [numero] mensilità del canone, a titolo di deposito cauzionale, non imputabile in conto canoni e produttiva di interessi legali. Il deposito cauzionale sarà restituito al termine della locazione, previa verifica dello stato dell'unità immobiliare e dell'osservanza di ogni obbligazione contrattuale.

7. ONERI ACCESSORI
Sono a carico del conduttore le spese relative al servizio di pulizia, al funzionamento e all'ordinaria manutenzione dell'ascensore, alla fornitura dell'acqua, dell'energia elettrica, del riscaldamento e del condizionamento dell'aria, allo spurgo dei pozzi neri e delle latrine, nonché alle forniture degli altri servizi comuni secondo quanto previsto dalla Tabella oneri accessori allegata al D.M. 16/01/2017.

8. MANUTENZIONE E RIPARAZIONI
Il conduttore deve eseguire tutte le riparazioni conseguenti a danni provocati dalla sua negligenza nell'uso della cosa locata e delle apparecchiature ivi esistenti, nonché le piccole riparazioni di cui all'art. 1609 c.c.

9. RECESSO DEL CONDUTTORE
Il conduttore ha facoltà di recedere anticipatamente per gravi motivi dal contratto, previo preavviso da recapitarsi mediante lettera raccomandata A.R. o PEC almeno tre mesi prima. In caso di recesso anticipato per:
- Trasferimento della sede universitaria
- Conclusione del corso di studi
- Gravi motivi familiari
il preavviso è ridotto a un mese.

10. RICONSEGNA DELL'IMMOBILE
Alla scadenza del contratto, il conduttore riconsegnerà l'immobile al locatore nello stato in cui gli è stato consegnato, salvo il normale deterioramento d'uso, pena il risarcimento del danno.

11. ARREDAMENTO E DOTAZIONI
L'unità immobiliare è dotata di arredamento e delle seguenti dotazioni: [elenco arredi e dotazioni]. L'inventario dettagliato è allegato al presente contratto.

12. RINVIO ALLE NORME DI LEGGE
Per quanto non previsto dal presente contratto, le parti fanno riferimento alle disposizioni del Codice Civile, alla Legge n. 392/1978, alla Legge n. 431/1998, ai decreti ministeriali attuativi e agli Accordi Territoriali.`;
  }
}