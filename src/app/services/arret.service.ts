import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigurationService } from './configuration.service';

export interface BusAssociation {
  busId: string;
  ordre: number;
  direction: 'aller' | 'retour';
}

export interface Arret {
  _id?: string;
  nom: string;
  latitude: number;
  longitude: number;
  busAssociations: BusAssociation[];
  lignes?: any[]; // Nouveau champ pour les informations enrichies
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface pour la réponse enrichie des arrêts par ligne
export interface ArretsByLigneResponse {
  ligne: string;
  busNom: string;
  direction: string;
  arrets: Arret[];
}

@Injectable({
  providedIn: 'root',
})
export class ArretService {
   private apiUrl: string;

  constructor(
    private http: HttpClient,
    private config: ConfigurationService
  ) {
        this.apiUrl = this.config.arretUrl;
  }

  // Récupérer tous les arrêts
  getArrets(): Observable<Arret[]> {
    return this.http.get<Arret[]>(this.apiUrl);
  }

  // NOUVELLE: Récupérer les arrêts avec informations de ligne enrichies
  getArretsWithLigneInfo(): Observable<Arret[]> {
    return this.http.get<Arret[]>(`${this.apiUrl}/with-ligne-info`);
  }

  // Récupérer un arrêt par ID
  getArretById(id: string): Observable<Arret> {
    return this.http.get<Arret>(`${this.apiUrl}/${id}`);
  }

  // Créer un nouvel arrêt
  createArret(arret: Partial<Arret>): Observable<Arret> {
    return this.http.post<Arret>(this.apiUrl, arret);
  }

  // Mettre à jour un arrêt
  updateArret(id: string, arret: Partial<Arret>): Observable<Arret> {
    return this.http.put<Arret>(`${this.apiUrl}/${id}`, arret);
  }

  // Supprimer un arrêt
  deleteArret(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  // Récupérer les arrêts d'un bus spécifique
  getArretsByBus(busId: string, direction: 'aller' | 'retour' = 'aller'): Observable<Arret[]> {
    return this.http.get<Arret[]>(`${this.apiUrl}/bus/${busId}?direction=${direction}`);
  }

  // NOUVELLE: Récupérer les arrêts par ligne de bus
  getArretsByLigne(ligne: string, direction: 'aller' | 'retour' = 'aller'): Observable<ArretsByLigneResponse> {
    return this.http.get<ArretsByLigneResponse>(`${this.apiUrl}/ligne/${ligne}?direction=${direction}`);
  }
}