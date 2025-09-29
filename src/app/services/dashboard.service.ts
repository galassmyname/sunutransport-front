import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigurationService } from './configuration.service';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
 private apiUrl: string;

  constructor(
    private http: HttpClient,
    private config: ConfigurationService
  ) {
    this.apiUrl = this.config.statsUrl;
  }

  // Récupérer les statistiques globales
  getStats(): Observable<any> {
   
    return this.http.get<any>(this.apiUrl);
  }
}