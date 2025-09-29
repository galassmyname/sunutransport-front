import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ConfigurationService } from './configuration.service';

interface User {
  id: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  role: 'admin' | 'chauffeur' | 'voyageur';
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
    private apiUrl: string;

  private tokenSubject = new BehaviorSubject<string | null>(localStorage.getItem('token'));
  private loggedIn = new BehaviorSubject<boolean>(this.hasToken());

  isLoggedIn$ = this.loggedIn.asObservable();

  constructor(private http: HttpClient,
    private config: ConfigurationService
  ) {
    this.apiUrl = this.config.authUrl;
  }

  // Connexion d'un utilisateur
  login(email: string, motDePasse: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { 
      identifier: email, 
      credential: motDePasse 
    }).pipe(
      tap(response => {
        if (response.token) {
          localStorage.setItem('token', response.token);
          this.tokenSubject.next(response.token);
          this.setLoggedIn(true);
        }
      })
    );
  }

  // Vérifier si un token est présent dans le localStorage
  private hasToken(): boolean {
    return !!localStorage.getItem('token');
  }

  // Mettre à jour l'état de connexion
  setLoggedIn(value: boolean): void {
    this.loggedIn.next(value);
  }

  // Déconnexion
  logout(): void {
    localStorage.removeItem('token');
    this.tokenSubject.next(null);
    this.setLoggedIn(false);
  }

  // Vérifier si l'utilisateur est connecté
  isLoggedIn(): boolean {
    const token = this.tokenSubject.value;
    if (!token) return false;
    return !this.isTokenExpired(token);
  }

  // Récupérer le rôle de l'utilisateur connecté
  getUserRole(): string | null {
    const token = this.tokenSubject.value;
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role;
    } catch {
      this.logout();
      return null;
    }
  }

  // Récupérer les informations de l'utilisateur connecté
  getCurrentUser(): User | null {
    const token = this.tokenSubject.value;
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.id,
        nom: payload.nom,
        prenom: payload.prenom,
        email: payload.email,
        telephone: payload.telephone,
        role: payload.role
      };
    } catch (error) {
      console.error('Erreur décodage token:', error);
      this.logout();
      return null;
    }
  }

  // Récupérer l'ID de l'utilisateur connecté
  getCurrentUserId(): string | null {
    const currentUser = this.getCurrentUser();
    return currentUser?.id || null;
  }

  // Vérifier si le token est expiré
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Si pas d'expiration définie, le token n'expire jamais
      if (!payload.exp) return false;
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  // Récupérer le token
  getToken(): string | null {
    return this.tokenSubject.value;
  }

  // Récupérer tous les utilisateurs (admin seulement)
  getUsers(): Observable<any[]> {
    const token = this.getToken();
    return this.http.get<any[]>(`${this.apiUrl}/users`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  // Supprimer un utilisateur par ID
  deleteUser(id: string): Observable<any> {
    const token = this.getToken();
    return this.http.delete<any>(`${this.apiUrl}/user/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  // Vérifier le token côté serveur
  verifyToken(): Observable<any> {
    const token = this.getToken();
    return this.http.get<any>(`${this.apiUrl}/verify-token`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  // Déconnexion avec invalidation côté serveur
  logoutWithServer(): Observable<any> {
    const token = this.getToken();
    return this.http.post<any>(`${this.apiUrl}/logout`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).pipe(
      tap(() => {
        this.logout(); // Nettoyer côté client aussi
      })
    );
  }
}