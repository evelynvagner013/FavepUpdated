import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface AgentResponse {
  response: string;
}

// Interface para o formato do histórico
export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
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
   * @param history O histórico da conversa no formato da API Gemini.
   */
  askQuestion(question: string, history: GeminiMessage[]): Observable<AgentResponse> {
    return this.http.post<AgentResponse>(`${this.apiUrl}/chat`, { question, history });
  }
}