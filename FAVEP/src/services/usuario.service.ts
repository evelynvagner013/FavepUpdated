import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Usuario } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private baseUrl = 'http://localhost:5050/auth';

  constructor(private http: HttpClient) { }
  atualizarPerfilUsuario(dados: Partial<Usuario>): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.baseUrl}/update`, dados).pipe(
      catchError(error => {
        console.error('Erro ao atualizar perfil:', error);
        throw error;
      })
    );
  }
}