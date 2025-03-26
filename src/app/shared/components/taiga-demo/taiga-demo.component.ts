import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

// Taiga UI modules
import { TuiButtonModule } from '@taiga-ui/core';
import { TuiInputModule, TuiCheckboxModule } from '@taiga-ui/kit';

@Component({
  selector: 'app-taiga-demo',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiButtonModule,
    TuiInputModule,
    TuiCheckboxModule
  ],
  template: `
    <div class="demo-container">
      <h2>TaigaUI Components Demo</h2>
      
      <div class="demo-form" [formGroup]="testForm">
        <div class="tui-form__row">
          <tui-input formControlName="name">
            Name
            <input tuiTextfield type="text" />
          </tui-input>
        </div>
        
        <div class="tui-form__row">
          <tui-checkbox formControlName="subscribe">
            Subscribe to newsletter
          </tui-checkbox>
        </div>
        
        <div class="tui-form__buttons">
          <button
            tuiButton
            type="button"
            appearance="primary"
            (click)="onSubmit()"
          >
            Submit
          </button>
        </div>
      </div>
      
      <div *ngIf="submitted" class="tui-form__row">
        <div class="tui-island">
          <p><strong>Form Values:</strong></p>
          <pre>{{ formValues }}</pre>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .demo-container {
      padding: 1rem;
      max-width: 600px;
      margin: 0 auto;
    }
    
    .demo-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    
    .tui-form__buttons {
      display: flex;
      justify-content: flex-end;
    }
    
    .tui-island {
      background: var(--tui-base-02);
      padding: 1rem;
      border-radius: var(--tui-radius-m);
    }
    
    pre {
      margin: 0;
    }
  `]
})
export class TaigaDemoComponent {
  testForm = new FormGroup({
    name: new FormControl(''),
    subscribe: new FormControl(false)
  });
  
  submitted = false;
  formValues = '';
  
  onSubmit(): void {
    this.submitted = true;
    this.formValues = JSON.stringify(this.testForm.value, null, 2);
  }
}