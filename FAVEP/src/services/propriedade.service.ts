// propriedade.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Propriedade } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class PropriedadeService {
  private baseUrl = 'http://localhost:5050/property';

  constructor(private http: HttpClient) { }

  getPropriedades(): Observable<Propriedade[]> {
    return this.http.get<Propriedade[]>(`${this.baseUrl}/properties`).pipe(
      catchError(error => {
        console.error('Erro ao buscar propriedades:', error);
        return of([]);
      })
    );
  }

  adicionarPropriedade(prop: Omit<Propriedade, 'id' | 'usuarioId' | 'culturas'>): Observable<Propriedade> {
    return this.http.post<Propriedade>(`${this.baseUrl}/registerProp`, prop).pipe(
      catchError(error => {
        console.error('Erro ao adicionar propriedade:', error);
        throw error;
      })
    );
  }

  // CORREÇÃO: Usar o ID (string) para atualizar, não o nome.
  atualizarPropriedade(id: string, prop: Partial<Propriedade>): Observable<Propriedade> {
    return this.http.put<Propriedade>(`${this.baseUrl}/updateProp/${id}`, prop).pipe(
      catchError(error => {
        console.error('Erro ao atualizar propriedade:', error);
        throw error;
      })
    );
  }

  // CORREÇÃO: Usar o ID (string) para excluir, não o nome.
  excluirPropriedade(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/propDelete/${id}`).pipe(
      catchError(error => {
        console.error('Erro ao excluir propriedade:', error);
        throw error;
      })
    );
  }

  getPropriedadeById(id: string): Observable<Propriedade> {
    return this.http.get<Propriedade>(`${this.baseUrl}/propGetById/${id}`).pipe(
      catchError(error => {
        console.error('Erro ao buscar propriedade pelo ID:', error);
        throw error;
      })
    );
  }
}