// Planos front/services/mercadopago.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MercadoPagoService {
  // CORREÇÃO: Adicionado o prefixo /api que está no seu index.js
  private baseUrl = 'http://localhost:5050/api/mercado-pago';

  constructor(private http: HttpClient) { }

  /**
   * Cria uma nova preferência de pagamento (Checkout Pro).
   * @param tipoPlano O tipo de plano (ex: 'Mensal', 'Anual'), que será salvo como 'descricao' no backend.
   * @param valorPlano O valor do plano.
   * @returns Um Observable contendo a resposta da API, que inclui o link de pagamento (init_point).
   */
  criarAssinatura(tipoPlano: string, valorPlano: number): Observable<any> {

    // CORREÇÃO: O backend espera 'descricao', e não 'tipo'
    const dadosAssinatura = {
      descricao: tipoPlano, // Mapeado de 'tipoPlano' para 'descricao'
      valor: valorPlano
    };

    // CORREÇÃO: O endpoint no backend chama-se 'create-preference'
    return this.http.post<any>(`${this.baseUrl}/create-preference`, dadosAssinatura).pipe(
      catchError(error => {
        console.error('Erro ao criar a preferência no Mercado Pago:', error);
        throw error; // Lança o erro para ser tratado pelo componente que chamou o método.
      })
    );
  }
}
