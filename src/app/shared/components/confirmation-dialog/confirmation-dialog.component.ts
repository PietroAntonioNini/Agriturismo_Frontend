import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { animate, state, style, transition, trigger } from '@angular/animations';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  submessage?: string;
  highlightItem?: string;
  cancelText: string;
  confirmText: string;
  cancelIcon?: string;
  confirmIcon?: string;
  dangerMode: boolean;
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss'],
  animations: [
    trigger('dialogAnimation', [
      state('void', style({
        transform: 'scale(0.95)',
        opacity: 0
      })),
      state('*', style({
        transform: 'scale(1)',
        opacity: 1
      })),
      transition('void => *', animate('250ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
      transition('* => void', animate('200ms cubic-bezier(0.4, 0.0, 0.2, 1)'))
    ]),
    trigger('buttonAnimation', [
      state('void', style({
        transform: 'translateY(10px)',
        opacity: 0
      })),
      state('in', style({
        transform: 'translateY(0)',
        opacity: 1
      })),
      transition('void => in', animate('300ms 150ms cubic-bezier(0.4, 0.0, 0.2, 1)'))
    ])
  ]
})
export class ConfirmationDialogComponent implements OnInit {
  state: string = 'in';
  isProcessing: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData
  ) {}

  ngOnInit(): void {
    // Imposta valori predefiniti se non sono forniti
    this.data = {
      ...{
        cancelText: 'Annulla',
        confirmText: 'Conferma',
        dangerMode: false
      },
      ...this.data
    };
    
    // Imposta le icone predefinite se non sono fornite
    if (this.data.dangerMode && !this.data.confirmIcon) {
      this.data.confirmIcon = 'delete';
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    if (this.data.dangerMode) {
      // Mostra lo spinner per un breve momento per operazioni pericolose
      this.isProcessing = true;
      
      setTimeout(() => {
        this.isProcessing = false;
        this.dialogRef.close(true);
      }, 500);
    } else {
      this.dialogRef.close(true);
    }
  }
}