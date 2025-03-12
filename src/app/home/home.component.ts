import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
      <h1 style="color: #3f51b5;">Benvenuto in Agriturismo Manager</h1>
      <p>Questa è l'applicazione per la gestione dell'agriturismo.</p>
      
      <div style="margin-top: 30px; padding: 20px; background-color: #f5f5f5; border-radius: 8px; max-width: 600px; margin-left: auto; margin-right: auto;">
        <h2>Funzionalità Principali</h2>
        <ul style="text-align: left; list-style-type: none; padding: 0;">
          <li style="margin-bottom: 10px;">✅ Gestione inquilini</li>
          <li style="margin-bottom: 10px;">✅ Gestione appartamenti</li>
          <li style="margin-bottom: 10px;">✅ Gestione contratti</li>
          <li style="margin-bottom: 10px;">✅ Fatturazione e pagamenti</li>
        </ul>
      </div>
    </div>
  `,
  styles: []
})
export class HomeComponent {

} 