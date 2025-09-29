import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { ConfigurationService } from './configuration.service';     

@Injectable({
  providedIn: 'root',
})
export class AddUserService {
    private apiUrl: string;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private config: ConfigurationService
  ) {
    this.apiUrl = this.config.authUrl;
  }

  addUser(userData: {
    nom: string,
    prenom: string,
    email: string,
    role: 'voyageur' | 'chauffeur' | 'admin',
    pinCode?: string,
    motDePasse?: string
  }): Observable<{ message: string, user: any }> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });

    const payload = {
      nom: userData.nom,
      prenom: userData.prenom,
      email: userData.email,
      role: userData.role,
      ...(userData.role === 'voyageur' 
          ? { pinCode: userData.pinCode }
          : { motDePasse: userData.motDePasse })
    };

    return this.http.post<{ message: string, user: any }>(
      `${this.apiUrl}/add-user`,
      payload,
      { headers }
    );
  }

  checkEmailExists(email: string): Observable<{ exists: boolean }> {
    return this.http.get<{ exists: boolean }>(
      `${this.apiUrl}/check-email/${email}`
    );
  }
}