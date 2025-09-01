import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ContatoService {
  private apiUrl = `${environment.apiUrl}/contato`;

  constructor(private http: HttpClient) { }

  enviarMensagem(data: { nome: string, email: string, mensagem: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/contact`, data);
  }
}