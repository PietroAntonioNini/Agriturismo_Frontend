import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkMode = new BehaviorSubject<boolean>(false);
  darkMode$ = this.darkMode.asObservable();
  private renderer: Renderer2;
  private darkThemeLink: HTMLLinkElement | null = null;

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    
    // Check if user has a preference saved
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
      this.darkMode.next(savedTheme === 'dark');
    } else {
      // Check for system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.darkMode.next(prefersDark);
    }
    
    // Apply the theme
    this.applyTheme();
    
    // Listen for changes in system preference
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem('theme')) {
        this.darkMode.next(e.matches);
        this.applyTheme();
      }
    });
  }

  toggleDarkMode(): void {
    this.darkMode.next(!this.darkMode.value);
    localStorage.setItem('theme', this.darkMode.value ? 'dark' : 'light');
    this.applyTheme();
  }
  
  getCurrentTheme(): string {
    return this.darkMode.value ? 'dark' : 'light';
  }

  isDarkMode(): boolean {
    return this.darkMode.value;
  }

  private applyTheme(): void {
    if (this.darkMode.value) {
      this.renderer.addClass(document.body, 'dark-theme');
      
      // Load PrimeNG dark theme dynamically - updated for PrimeNG 19
      this.loadPrimeNGDarkTheme();
    } else {
      this.renderer.removeClass(document.body, 'dark-theme');
      
      // Remove PrimeNG dark theme if it was added
      this.removePrimeNGDarkTheme();
    }
  }
  
  private loadPrimeNGDarkTheme(): void {
    // Only add the link if it doesn't already exist
    if (!this.darkThemeLink) {
      this.darkThemeLink = document.createElement('link');
      this.darkThemeLink.rel = 'stylesheet';
      // Updated path for PrimeNG 19
      this.darkThemeLink.href = 'node_modules/primeng/resources/themes/lara-dark-blue/theme.css';
      this.darkThemeLink.id = 'primeng-dark-theme';
      
      // Add the link to the head
      document.head.appendChild(this.darkThemeLink);
    }
  }
  
  private removePrimeNGDarkTheme(): void {
    // Remove the dark theme link if it exists
    if (this.darkThemeLink) {
      document.head.removeChild(this.darkThemeLink);
      this.darkThemeLink = null;
    }
  }
}