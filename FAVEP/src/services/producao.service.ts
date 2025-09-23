// producao.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Producao } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class ProducaoService {
  private baseUrl = 'http://localhost:5050/production';

  constructor(private http: HttpClient) { }

  getProducoes(): Observable<Producao[]> {
      return this.http.get<Producao[]>(`${this.baseUrl}/productions`).pipe(
        catchError(error => {
          console.error('Erro ao buscar produções:', error);
          return of([]);
        })
      );
    }
  
    adicionarProducao(prod: Omit<Producao, 'id' | 'propriedade'>): Observable<Producao> {
      return this.http.post<Producao>(`${this.baseUrl}/registerProduction`, prod);
    }
  
    atualizarProducao(id: number, prod: Partial<Producao>): Observable<Producao> {
      return this.http.put<Producao>(`${this.baseUrl}/updateProduction/${id}`, prod);
    }
  
    excluirProducao(id: number): Observable<any> {
      return this.http.delete(`${this.baseUrl}/productionDelete/${id}`);
    }
}