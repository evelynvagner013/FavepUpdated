// src/services/cep.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Interface para a resposta da API ViaCEP.
 */
export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string; // Cidade
  uf: string; // Estado
  erro?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CepService {

  private viaCepUrl = 'https://viacep.com.br/ws';

  constructor(private http: HttpClient) { }

  /**
   * Busca um CEP na API do ViaCEP.
   * @param cep O CEP a ser buscado (somente números)
   */
  buscarCep(cep: string): Observable<ViaCepResponse | null> {
    // Remove qualquer caractere não numérico
    const cepLimpo = cep.replace(/\D/g, '');

    // Verifica se o CEP tem 8 dígitos
    if (cepLimpo.length !== 8) {
      return of(null); // Retorna nulo se o CEP for inválido
    }

    // Faz a requisição GET
    return this.http.get<ViaCepResponse>(`${this.viaCepUrl}/${cepLimpo}/json/`).pipe(
      catchError(error => {
        console.error('Erro ao buscar CEP:', error);
        return of(null); // Retorna nulo em caso de erro
      })
    );
  }
}