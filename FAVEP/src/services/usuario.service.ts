import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
// 1. Importar o AuthResponse (assumindo que está em api.models)
import { Usuario, AuthResponse } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private baseUrl = 'http://localhost:5050/auth'; // Certifique-se que esta URL está correta (ou vem do environment)

  constructor(private http: HttpClient) { }

  // 2. Mudar o tipo de retorno de Observable<Usuario> para Observable<AuthResponse>
  atualizarPerfilUsuario(dados: Partial<Usuario>): Observable<AuthResponse> {
    // 3. Mudar o tipo da requisição de http.put<Usuario> para http.put<AuthResponse>
    return this.http.put<AuthResponse>(`${this.baseUrl}/update`, dados).pipe(
      catchError(error => {
        console.error('Erro ao atualizar perfil:', error);
        throw error;
      })
    );
  }
}
