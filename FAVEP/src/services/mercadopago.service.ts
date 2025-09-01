// mercado-pago.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MercadoPagoService {
  private baseUrl = 'http://localhost:5050/mercado-pago';

  constructor(private http: HttpClient) { }

  /**
   * Cria uma nova assinatura de plano via Mercado Pago.
   * @param tipoPlano O tipo de plano (ex: 'Mensal', 'Anual').
   * @param valorPlano O valor do plano.
   * @returns Um Observable contendo a resposta da API, que inclui o link de pagamento (init_point).
   */
  criarAssinatura(tipoPlano: string, valorPlano: number): Observable<any> {
    const dadosAssinatura = {
      tipo: tipoPlano,
      valor: valorPlano
    };

    return this.http.post<any>(`${this.baseUrl}/create-subscription`, dadosAssinatura).pipe(
      catchError(error => {
        console.error('Erro ao criar a assinatura no Mercado Pago:', error);
        throw error; // Lança o erro para ser tratado pelo componente que chamou o método.
      })
    );
  }
}