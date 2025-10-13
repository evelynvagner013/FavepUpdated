import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface WeatherData {
  temperatura: number;
  sensacaoTermica: number;
  descricao: string;
  icone: string;
  cidade: string;
}

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private apiUrl = '/api/clima';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  getWeather(lat?: number, lon?: number, cidade?: string): Observable<WeatherData> {
    const token = this.authService.getToken();
    if (!token) {
      return new Observable(observer => {
        observer.error('Usuário não autenticado para buscar o clima.');
      });
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const params: any = {};

    if (lat && lon) {
      params.lat = lat.toString();
      params.lon = lon.toString();
    }

    if (cidade) {
      params.cidade = cidade;
    }

    return this.http.get<WeatherData>(this.apiUrl, { headers, params });
  }
}
