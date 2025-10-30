// Conteúdo completo do arquivo: src/services/auth.service.ts

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Usuario } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authUrl = 'http://localhost:5050/auth'; // Seu URL
  private isBrowser: boolean;

  private currentUserSubject: BehaviorSubject<Usuario | null>;
  public currentUser: Observable<Usuario | null>;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.currentUserSubject = new BehaviorSubject<Usuario | null>(this.getUser());
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): Usuario | null {
    return this.currentUserSubject.value;
  }

  // --- MODIFICADO ---
  // Apenas o 'dadosUsuario' agora deve conter a senha
  register(dadosUsuario: any): Observable<any> {
    return this.http.post(`${this.authUrl}/register`, dadosUsuario);
  }

  // --- SEM MUDANÇAS ---
  login(email: string, senha: string): Observable<any> {
    return this.http.post<{ token: string; user: Usuario }>(`${this.authUrl}/login`, { email, senha }).pipe(
      tap(response => {
        if (response.token && response.user) {
          this.setToken(response.token);
          this.setUser(response.user);
        }
      })
    );
  }

  // --- SEM MUDANÇAS ---
  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/forgot-password`, { email });
  }

  // --- NOVO MÉTODO ---
  /**
   * Envia o e-mail e o código de 6 dígitos para verificação.
   */
  verifyEmailCode(email: string, code: string): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/verify-email-code`, { email, code });
  }

  // --- MÉTODO ANTIGO (Não é mais usado pelo fluxo de registro) ---
  verifyAndSetPassword(token: string, senha: string, confirmarSenha: string): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/verify-and-set-password`, { token, senha, confirmarSenha });
  }
  
  // --- SEM MUDANÇAS ---
  resetPassword(token: string, senha: string, confirmarSenha: string): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/reset-password`, { token, senha, confirmarSenha });
  }

  // --- MÉTODOS AUXILIARES (sem alteração) ---
  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      this.currentUserSubject.next(null);
    }
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  setToken(token: string): void {
    if (this.isBrowser) localStorage.setItem('token', token);
  }

  getToken(): string | null {
    return this.isBrowser ? localStorage.getItem('token') : null;
  }

  setUser(usuario: Usuario): void {
    if (this.isBrowser) {
      localStorage.setItem('user', JSON.stringify(usuario));
      this.currentUserSubject.next(usuario);
    }
  }

  getUser(): Usuario | null {
    if (this.isBrowser) {
      const json = localStorage.getItem('user');
      return json ? JSON.parse(json) : null;
    }
    return null;
  }
}