import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';

// TaigaUI Components
import { TuiButtonModule } from '@taiga-ui/core';
import { TuiInputModule } from '@taiga-ui/kit';

// PrimeNG Components - Notice the updated import paths for PrimeNG 19
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { TabViewModule } from 'primeng/tabview';

// Material Components
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

// Demo Components
import { TaigaDemoComponent } from '../taiga-demo/taiga-demo.component';

@Component({
  selector: 'app-ui-libraries-demo',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    // TaigaUI
    TuiButtonModule,
    TuiInputModule,
    // PrimeNG
    ButtonModule,
    InputTextModule,
    CardModule,
    TabViewModule,
    // Material
    MatCardModule,
    MatTabsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    // Demo
    TaigaDemoComponent
  ],
  template: `
    <div class="container">
      <h1>UI Libraries Demo</h1>
      
      <mat-card class="demo-section">
        <mat-card-content>
          <mat-tab-group>
            <mat-tab label="Material Design">
              <div class="tab-content">
                <h2>Material Design Components</h2>
                
                <div class="form-container">
                  <mat-form-field appearance="outline">
                    <mat-label>Enter your name</mat-label>
                    <input matInput [formControl]="materialName">
                  </mat-form-field>
                  
                  <button mat-raised-button color="primary" (click)="greetMaterial()">
                    Say Hello
                  </button>
                </div>
                
                <div *ngIf="materialGreeting" class="greeting-container">
                  <mat-card>
                    <mat-card-content>
                      {{ materialGreeting }}
                    </mat-card-content>
                  </mat-card>
                </div>
              </div>
            </mat-tab>
            
            <mat-tab label="PrimeNG">
              <div class="tab-content">
                <h2>PrimeNG Components</h2>
                
                <div class="p-card p-component">
                  <div class="p-card-body">
                    <div class="form-container">
                      <div class="p-field">
                        <label for="prime-name">Enter your name</label>
                        <input id="prime-name" type="text" pInputText [formControl]="primeNgName">
                      </div>
                      
                      <p-button label="Say Hello" icon="pi pi-check" (onClick)="greetPrimeNG()"></p-button>
                    </div>
                    
                    <div *ngIf="primeNgGreeting" class="greeting-container">
                      <div class="p-card">
                        <div class="p-card-body">
                          {{ primeNgGreeting }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </mat-tab>
            
            <mat-tab label="TaigaUI">
              <div class="tab-content">
                <app-taiga-demo></app-taiga-demo>
              </div>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .demo-section {
      margin-bottom: 20px;
    }
    
    .tab-content {
      padding: 20px;
    }
    
    .form-container {
      display: flex;
      flex-direction: column;
      gap: 15px;
      max-width: 400px;
      margin-bottom: 20px;
    }
    
    .greeting-container {
      margin-top: 20px;
    }
    
    /* PrimeNG styles */
    .p-card {
      padding: 1rem;
      margin-bottom: 1rem;
    }
    
    .p-field {
      margin-bottom: 1rem;
    }
    
    .p-field label {
      display: block;
      margin-bottom: 0.5rem;
    }
  `]
})
export class UiLibrariesDemoComponent {
  // Material form
  materialName = new FormControl('');
  materialGreeting = '';
  
  // PrimeNG form
  primeNgName = new FormControl('');
  primeNgGreeting = '';
  
  greetMaterial(): void {
    if (this.materialName.value) {
      this.materialGreeting = `Hello, ${this.materialName.value}! This greeting is from Material Design.`;
    }
  }
  
  greetPrimeNG(): void {
    if (this.primeNgName.value) {
      this.primeNgGreeting = `Hello, ${this.primeNgName.value}! This greeting is from PrimeNG.`;
    }
  }
}