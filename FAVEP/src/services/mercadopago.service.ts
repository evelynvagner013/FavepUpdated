import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment'; // Importando environment

@Injectable({
  providedIn: 'root'
})
export class MercadoPagoService {
  
  
   private baseUrl = 'http://localhost:5050/api/mercado-pago'; 

  constructor(private http: HttpClient) { }

  /**
   * Cria uma nova preferência de pagamento (Checkout Pro).
   * @param dadosPagamento Objeto contendo 'descricao' e 'valor'.
   * @returns Um Observable contendo a resposta da API (init_point).
   */
  createPreference(dadosPagamento: { descricao: string, valor: number }): Observable<any> {
    
    // O endpoint no backend chama-se 'create-preference'
    return this.http.post<any>(`${this.baseUrl}/create-preference`, dadosPagamento).pipe(
      catchError(error => {
        console.error('Erro ao criar a preferência no Mercado Pago:', error);
        throw error; // Lança o erro para ser tratado pelo componente.
      })
    );
  }
}