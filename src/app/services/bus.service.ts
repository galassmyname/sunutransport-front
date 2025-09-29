import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigurationService } from './configuration.service';

export interface Bus {
  _id: string;
  nom: string;
  ligne: string; // Nouveau champ ligne
  matricule: string;
  chauffeurId?: any; // Peut être un ID ou un objet peuplé
  actif: boolean;
  derniereMiseAJour?: Date; // Nouveau champ
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root',
})
export class BusService {
 private apiUrl: string;

  constructor(
    private http: HttpClient,
    private config: ConfigurationService
  ) {
    this.apiUrl = this.config.busUrl;
  }


  // Récupérer tous les bus avec tri optionnel
  getBuses(sortBy: string = 'ligne', order: string = 'asc'): Observable<Bus[]> {
    return this.http.get<Bus[]>(`${this.apiUrl}?sortBy=${sortBy}&order=${order}`);
  }

  getBusById(id: string): Observable<Bus> {
    return this.http.get<Bus>(`${this.apiUrl}/${id}`);
  }

  // NOUVELLE: Obtenir un bus par ligne
  getBusByLigne(ligne: string): Observable<Bus> {
    return this.http.get<Bus>(`${this.apiUrl}/ligne/${ligne}`);
  }

  // NOUVELLE: Obtenir le bus d'un chauffeur
  getBusByChauffeurId(chauffeurId: string): Observable<Bus> {
    return this.http.get<Bus>(`${this.apiUrl}/chauffeur/${chauffeurId}`);
  }

  // NOUVELLE: Obtenir les lignes actives
  getLignesActives(): Observable<Bus[]> {
    return this.http.get<Bus[]>(`${this.apiUrl}/actives`);
  }

  // NOUVELLE: Rechercher des bus par ligne
  searchBusByLigne(query: string): Observable<Bus[]> {
    return this.http.get<Bus[]>(`${this.apiUrl}/search?query=${query}`);
  }

  createBus(bus: { 
    nom: string; 
    ligne: string; // Nouveau champ requis
    matricule: string; 
    chauffeurId?: string 
  }): Observable<Bus> {
    return this.http.post<Bus>(this.apiUrl, bus);
  }

  updateBus(id: string, bus: Partial<Bus>): Observable<Bus> {
    return this.http.put<Bus>(`${this.apiUrl}/${id}`, bus);
  }

  deleteBus(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}