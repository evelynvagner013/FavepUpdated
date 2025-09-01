// movimentacao.service.ts (deve ser renomeado para financeiro.service.ts)

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Financeiro } from '../models/api.models'; // Corrigido para Financeiro

@Injectable({
  providedIn: 'root'
})
export class MovimentacaoService { // Recomenda-se renomear para FinanceiroService
  private baseUrl = 'http://localhost:5050/finance';

  constructor(private http: HttpClient) { }

  getMovimentacoes(): Observable<Financeiro[]> {
    return this.http.get<Financeiro[]>(`${this.baseUrl}/finances`).pipe(
      catchError(error => {
        console.error('Erro ao buscar movimentações financeiras:', error);
        return of([]);
      })
    );
  }

  adicionarMovimentacao(mov: Omit<Financeiro, 'id'>): Observable<Financeiro> {
    return this.http.post<Financeiro>(`${this.baseUrl}/registerFinance`, mov);
  }

  atualizarMovimentacao(id: number, mov: Partial<Financeiro>): Observable<Financeiro> {
    return this.http.put<Financeiro>(`${this.baseUrl}/financeUpdate/${id}`, mov);
  }

 
}