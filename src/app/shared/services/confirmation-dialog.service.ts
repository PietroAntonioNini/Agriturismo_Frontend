import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../components/confirmation-dialog/confirmation-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class ConfirmationDialogService {
  constructor(private dialog: MatDialog) {}

  confirm(title: string, message: string, options: Partial<ConfirmationDialogData> = {}): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title,
        message,
        cancelText: options.cancelText || 'Annulla',
        confirmText: options.confirmText || 'Conferma',
        submessage: options.submessage,
        highlightItem: options.highlightItem,
        cancelIcon: options.cancelIcon,
        confirmIcon: options.confirmIcon,
        dangerMode: options.dangerMode || false
      },
      disableClose: true,
      panelClass: 'confirmation-dialog-panel'
    });

    return dialogRef.afterClosed();
  }

  confirmDelete(itemType: string, itemName: string): Observable<boolean> {
    return this.confirm(
      `Elimina ${itemType}`,
      `Sei sicuro di voler eliminare ${itemType}?`,
      {
        highlightItem: itemName,
        submessage: 'Questa azione non può essere annullata.',
        confirmText: 'Elimina',
        confirmIcon: 'delete',
        dangerMode: true
      }
    );
  }
}