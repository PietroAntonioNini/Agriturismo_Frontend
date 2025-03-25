import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmationDialogComponent } from '../components/confirmation-dialog/confirmation-dialog.component';

export interface ConfirmationDialogData {
  title?: string;
  message: string;
  submessage: string;
  cancelText?: string;
  confirmText?: string;
  dangerMode?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmationDialogService {
  constructor(private dialog: MatDialog) {}

  /**
   * Apre un dialogo di conferma
   * @param data Dati per il dialogo (messaggio, titolo, testi pulsanti)
   * @returns Observable che emette true se l'utente conferma, altrimenti undefined
   */
  confirm(data: ConfirmationDialogData): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: data.title || 'Conferma',
        message: data.message,
        submessage: data.submessage,
        cancelText: data.cancelText || 'Annulla',
        confirmText: data.confirmText || 'Conferma',
        dangerMode: data.dangerMode !== undefined ? data.dangerMode : true
      },
      disableClose: true,
    });

    return dialogRef.afterClosed();
  }

  /**
   * Metodo di scorciatoia per dialoghi di conferma eliminazione
   * @param entityName Nome dell'entità da eliminare (es. "inquilino", "contratto")
   * @param name Nome specifico dell'elemento (es. "Mario Rossi")
   * @returns Observable che emette true se l'utente conferma, altrimenti undefined
   */
  confirmDelete(entityName: string, name: string): Observable<boolean> {
    return this.confirm({
      title: `Elimina ${entityName}`,
      message: `Eliminare <strong>${name}</strong>?`,
      submessage: `Questa azione non può essere annullata.`,
      cancelText: 'Annulla',
      confirmText: 'Elimina',
      dangerMode: true
    });
  }
}