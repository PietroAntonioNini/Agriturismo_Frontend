import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

// Taiga UI
import { 
  TuiRootModule,
  TuiDialogModule, 
  TuiAlertModule, 
  TUI_SANITIZER
} from '@taiga-ui/core';

// Fix for DOMPurify issue - use Angular's built-in DomSanitizer instead
import { DomSanitizer } from '@angular/platform-browser';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
    
    // Import Taiga UI modules
    importProvidersFrom(
      TuiRootModule,
      TuiDialogModule,
      TuiAlertModule
    ),
    
    // Use Angular's built-in DomSanitizer for Taiga UI
    {
      provide: TUI_SANITIZER,
      useExisting: DomSanitizer
    }
  ]
};