import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-document-preview-tooltip',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './document-preview-tooltip.component.html',
  styleUrls: ['./document-preview-tooltip.component.scss']
})
export class DocumentPreviewTooltipComponent {
  @Input() documentFront: string | null = null;
  @Input() documentBack: string | null = null;
  @Input() documentFrontPath: string | null = null;
  @Input() documentBackPath: string | null = null;
  @Output() onImageClick = new EventEmitter<string>();

  onPreviewClick(imagePath: string | null): void {
    if (imagePath) {
      this.onImageClick.emit(imagePath);
    }
  }
}