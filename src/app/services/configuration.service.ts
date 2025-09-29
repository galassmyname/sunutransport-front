import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigurationService {
  // URL de base de l'API - Modifiez seulement ici pour changer toutes les URLs
  private apiBaseUrl = 'https://sunutransport-backend.onrender.com';
  
  // URLs Ngrok alternatives (commentées par défaut)
  // private apiBaseUrl = 'https://your-ngrok-url.ngrok.io';
  // private apiBaseUrl = 'https://your-custom-domain.com';

  // URLs des différentes API
  get apiUrl(): string {
    return `${this.apiBaseUrl}/api`;
  }

  get authUrl(): string {
    return `${this.apiUrl}/auth`;
  }

  get busUrl(): string {
    return `${this.apiUrl}/bus`;
  }

  get arretUrl(): string {
    return `${this.apiUrl}/arret`;
  }

  get localisationUrl(): string {
    return `${this.apiUrl}/localisation`;
  }

  get statsUrl(): string {
    return `${this.apiUrl}/stats`;
  }

  // WebSocket URL
  get webSocketUrl(): string {
    return this.apiBaseUrl.replace('http', 'ws');
  }

  constructor() { }
}