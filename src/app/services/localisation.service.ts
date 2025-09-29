import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, ReplaySubject } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ConfigurationService } from './configuration.service';   


export interface LocalisationData {
  latitude: number;
  longitude: number;
  vitesse?: number;
  precision?: number;
  timestamp?: Date;
  bus?: any;
  arrivals?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class LocalisationService {
    private apiUrl: string;
  private socket$: WebSocketSubject<any> | null = null;
  private positionUpdates = new ReplaySubject<any>(5);
  private notificationUpdates = new ReplaySubject<any>(5);

  constructor(
    private http: HttpClient,
    private config: ConfigurationService
  ) {
    this.apiUrl = this.config.localisationUrl;
    this.connectWebSocket();
  }


    private connectWebSocket(): void {
    try {
      this.socket$ = webSocket(this.config.webSocketUrl);
      
      this.socket$.subscribe({
        next: (msg) => {
          if (msg.type === 'POSITION_UPDATE') {
            this.positionUpdates.next(msg);
          } else if (msg.type === 'ARRIVAL_NOTIFICATION') {
            this.notificationUpdates.next(msg);
          } else if (msg.type === 'BUS_ACTIVE' || msg.type === 'BUS_INACTIVE') {
            this.notificationUpdates.next({
              type: 'BUS_STATUS',
              data: {
                busId: msg.data.busId,
                ligne: msg.data.ligne,
                status: msg.type === 'BUS_ACTIVE' ? 'active' : 'inactive',
                message: msg.type === 'BUS_ACTIVE' 
                  ? `Bus ligne ${msg.data.ligne} est maintenant actif` 
                  : `Bus ligne ${msg.data.ligne} est maintenant inactif`
              }
            });
          }
        },
        error: (err) => {
          console.error('WebSocket error:', err);
          setTimeout(() => this.connectWebSocket(), 5000);
        },
        complete: () => {
          console.log('WebSocket connection closed');
          setTimeout(() => this.connectWebSocket(), 5000);
        }
      });
    } catch (err) {
      console.error('WebSocket connection error:', err);
      setTimeout(() => this.connectWebSocket(), 5000);
    }
  }

  getPositionUpdates(): Observable<any> {
    return this.positionUpdates.asObservable();
  }

  getNotificationUpdates(): Observable<any> {
    return this.notificationUpdates.asObservable();
  }

  // Récupérer les positions récentes (API publique)
  getRecentPositions(activeOnly: boolean = true): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/recent?active=${activeOnly}`);
  }

  // Enregistrer une position depuis l'app mobile (authentifiée)
  saveLocalisationFromMobile(data: {
    lat: number,
    lon: number,
    vitesse?: number,
    precision?: number
  }, token: string): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    return this.http.post<any>(`${this.apiUrl}/mobile`, data, { headers }).pipe(
      catchError(err => {
        console.error('Erreur enregistrement position:', err);
        return of({
          success: false,
          error: err.message,
          status: err.status
        });
      })
    );
  }

  // Obtenir l'ETA pour le chauffeur (authentifiée)
  getTempsArriveeForChauffeur(token: string): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    return this.http.get<any>(`${this.apiUrl}/eta/chauffeur`, { headers }).pipe(
      catchError(err => {
        console.error('Erreur ETA chauffeur:', err);
        return of({
          ligne: 'N/A',
          busActif: false,
          arret: 'Erreur de connexion',
          distance: 0,
          tempsArrivee: 0,
          vitesse: 30,
          error: err.message
        });
      })
    );
  }

  // Activer/Désactiver le service par le chauffeur (authentifiée)
  toggleServiceStatus(token: string): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    return this.http.post<any>(`${this.apiUrl}/toggle-service`, {}, { headers }).pipe(
      catchError(err => {
        console.error('Erreur toggle service:', err);
        return of({
          success: false,
          error: err.message,
          status: err.status
        });
      })
    );
  }

  // Obtenir le statut du chauffeur (authentifiée)
  getChauffeurStatus(token: string): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    return this.http.get<any>(`${this.apiUrl}/chauffeur/status`, { headers }).pipe(
      catchError(err => {
        console.error('Erreur statut chauffeur:', err);
        return of({
          error: err.message,
          status: err.status
        });
      })
    );
  }

  // Méthode pour les utilisateurs non chauffeurs (dépréciée mais maintenue)
  getTempsArrivee(busId: string): Observable<any> {
    console.warn('getTempsArrivee avec busId est déprécié. Utiliser getTempsArriveeForChauffeur avec token.');
    
    return this.http.get<any>(`${this.apiUrl}/temps-arrivee/${busId}?t=${Date.now()}`).pipe(
      catchError(err => {
        console.error('Erreur ETA:', err);
        return of({
          arret: 'Erreur de connexion',
          distance: 0,
          tempsArrivee: 0,
          vitesse: 30,
          message: `Erreur ${err.status}: ${err.message}`
        });
      })
    );
  }

  // Méthodes dépréciées maintenues pour la compatibilité
  savePosition(data: {
    busId: string,
    lat: number,
    lon: number,
    timestamp?: number,
    vitesse?: number,
    precision?: number
  }): Observable<any> {
    console.warn('savePosition est déprécié. Utiliser saveLocalisationFromMobile avec token.');
    return this.http.post<any>(this.apiUrl, data);
  }

  resetTrajectory(busId: string): Observable<any> {
    console.warn('resetTrajectory est déprécié.');
    return this.http.post<any>(`${this.apiUrl}/reset/${busId}`, {});
  }
}