import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface AgentResponse {
  response: string;
}

@Injectable({
  providedIn: 'root'
})
export class AgentService {
  private apiUrl = `${environment.apiUrl}/api/agent`;

  constructor(private http: HttpClient) { }

  /**
   * Envia uma pergunta para a API do agente e retorna a resposta.
   * @param question A pergunta do usuário em formato de texto.
   */
  askQuestion(question: string): Observable<AgentResponse> {
    return this.http.post<AgentResponse>(`${this.apiUrl}/chat`, { question });
  }
}