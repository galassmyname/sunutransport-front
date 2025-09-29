import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ConfigurationService } from './configuration.service';

export interface SearchResult {
  type: 'bus' | 'arret';
  id: string;
  name: string;
  details: string;
  distance?: number;
  data: any;
}

export interface SearchResponse {
  success: boolean;
  query: string;
  type: string;
  count: number;
  results: SearchResult[];
}

export interface NearbySearchResponse {
  success: boolean;
  center: { latitude: number; longitude: number };
  radius: number;
  count: number;
  results: SearchResult[];
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private apiUrl: string;

  constructor(
    private http: HttpClient,
    private config: ConfigurationService
  ) {
    this.apiUrl = `${this.config.apiUrl}/search`;
  }

  /**
   * Recherche globale (bus et arrêts)
   */
  globalSearch(query: string, type: 'all' | 'bus' | 'arret' = 'all', limit: number = 10): Observable<SearchResponse> {
    if (!query || query.trim().length < 2) {
      return of({
        success: true,
        query: query,
        type: type,
        count: 0,
        results: []
      });
    }

    const params = new HttpParams()
      .set('query', query.trim())
      .set('type', type)
      .set('limit', limit.toString());

    return this.http.get<SearchResponse>(this.apiUrl, { params }).pipe(
      catchError(err => {
        console.error('Erreur recherche globale:', err);
        return of({
          success: false,
          query: query,
          type: type,
          count: 0,
          results: []
        });
      })
    );
  }

  /**
   * Recherche de bus par ligne
   */
  searchBusByLigne(query: string): Observable<any> {
    const params = new HttpParams().set('query', query);
    
    return this.http.get<any>(`${this.apiUrl}/bus/ligne`, { params }).pipe(
      catchError(err => {
        console.error('Erreur recherche bus par ligne:', err);
        return of({
          success: false,
          count: 0,
          results: []
        });
      })
    );
  }

  /**
   * Obtenir des suggestions de recherche
   */
  getSearchSuggestions(query: string): Observable<{ suggestions: string[] }> {
    if (!query || query.length < 1) {
      return of({ suggestions: [] });
    }

    const params = new HttpParams().set('query', query);
    
    return this.http.get<{ suggestions: string[] }>(`${this.apiUrl}/suggestions`, { params }).pipe(
      catchError(err => {
        console.error('Erreur suggestions:', err);
        return of({ suggestions: [] });
      })
    );
  }

  /**
   * Recherche géographique (proximité)
   */
  searchNearby(
    latitude: number, 
    longitude: number, 
    radius: number = 1000, 
    type: 'all' | 'bus' | 'arret' = 'all'
  ): Observable<NearbySearchResponse> {
    const params = new HttpParams()
      .set('lat', latitude.toString())
      .set('lon', longitude.toString())
      .set('radius', radius.toString())
      .set('type', type);

    return this.http.get<NearbySearchResponse>(`${this.apiUrl}/nearby`, { params }).pipe(
      catchError(err => {
        console.error('Erreur recherche proximité:', err);
        return of({
          success: false,
          center: { latitude, longitude },
          radius,
          count: 0,
          results: []
        });
      })
    );
  }

  /**
   * Obtenir les lignes actives
   */
  getActiveLignes(): Observable<{ success: boolean; count: number; lignes: any[] }> {
    return this.http.get<{ success: boolean; count: number; lignes: any[] }>(`${this.apiUrl}/lignes/active`).pipe(
      catchError(err => {
        console.error('Erreur lignes actives:', err);
        return of({
          success: false,
          count: 0,
          lignes: []
        });
      })
    );
  }

  /**
   * Recherche avec debounce pour éviter trop d'appels API
   */
  debouncedSearch(query: string, type: 'all' | 'bus' | 'arret' = 'all'): Observable<SearchResponse> {
    return this.globalSearch(query, type).pipe(
      debounceTime(300),
      distinctUntilChanged()
    );
  }

  /**
   * Filtrer les résultats par distance
   */
  filterResultsByDistance(results: SearchResult[], maxDistance: number): SearchResult[] {
    return results.filter(result => 
      !result.distance || result.distance <= maxDistance
    );
  }

  /**
   * Trier les résultats par pertinence
   */
  sortResultsByRelevance(results: SearchResult[], query: string): SearchResult[] {
    const lowerQuery = query.toLowerCase();
    
    return results.sort((a, b) => {
      // Priorité aux correspondances exactes
      const aExact = a.name.toLowerCase().startsWith(lowerQuery);
      const bExact = b.name.toLowerCase().startsWith(lowerQuery);
      
      if (aExact !== bExact) {
        return bExact ? 1 : -1;
      }

      // Priorité aux bus par rapport aux arrêts
      if (a.type !== b.type) {
        return a.type === 'bus' ? -1 : 1;
      }

      // Si distance disponible, trier par distance
      if (a.distance && b.distance) {
        return a.distance - b.distance;
      }

      // Sinon, tri alphabétique
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Formater un résultat pour l'affichage
   */
  formatSearchResult(result: SearchResult): string {
    if (result.type === 'bus') {
      return `🚌 ${result.name}${result.distance ? ` (${result.distance}m)` : ''}`;
    } else {
      return `📍 ${result.name}${result.distance ? ` (${result.distance}m)` : ''}`;
    }
  }

  /**
   * Obtenir les coordonnées géographiques de l'utilisateur
   */
  getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Géolocalisation non supportée'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  /**
   * Recherche contextuelle basée sur la position
   */
  async contextualSearch(query: string, type: 'all' | 'bus' | 'arret' = 'all'): Promise<SearchResponse> {
    try {
      // Essayer d'abord une recherche standard
      const standardSearch = await this.globalSearch(query, type).toPromise();
      
      // Si peu de résultats, essayer une recherche géographique
      if (standardSearch && standardSearch.count < 3) {
        try {
          const position = await this.getCurrentPosition();
          const nearbySearch = await this.searchNearby(
            position.latitude, 
            position.longitude, 
            2000, // 2km de rayon
            type
          ).toPromise();
          
          if (nearbySearch && nearbySearch.results.length > 0) {
            // Combiner les résultats
            const combinedResults = [
              ...(standardSearch?.results || []),
              ...nearbySearch.results
            ];
            
            // Supprimer les doublons
            const uniqueResults = combinedResults.reduce((acc, current) => {
              const exists = acc.find(item => item.id === current.id && item.type === current.type);
              if (!exists) {
                acc.push(current);
              }
              return acc;
            }, [] as SearchResult[]);

            return {
              success: true,
              query: query,
              type: type,
              count: uniqueResults.length,
              results: this.sortResultsByRelevance(uniqueResults, query)
            };
          }
        } catch (geoError) {
          console.warn('Impossible d\'obtenir la position:', geoError);
        }
      }
      
      return standardSearch || {
        success: false,
        query: query,
        type: type,
        count: 0,
        results: []
      };
    } catch (error) {
      console.error('Erreur recherche contextuelle:', error);
      return {
        success: false,
        query: query,
        type: type,
        count: 0,
        results: []
      };
    }
  }
}