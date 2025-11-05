// Conteúdo completo do arquivo: src/services/auth.service.ts
// MODIFICADO: Adicionado 'getPlanoAtivo()' e 'updateUser'

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Usuario, AuthResponse, PlanosMercadoPago } from '../models/api.models'; // Importado AuthResponse
import { environment } from '../environments/environment'; // Importando environment

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Usando a URL do environment
  private authUrl = `${environment.apiUrl}/auth`; 
  private isBrowser: boolean;

  private currentUserSubject: BehaviorSubject<Usuario | null>;
  public currentUser: Observable<Usuario | null>;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    // Tenta carregar o usuário do localStorage ao iniciar
    this.currentUserSubject = new BehaviorSubject<Usuario | null>(this.getUser());
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): Usuario | null {
    return this.currentUserSubject.value;
  }

  register(dadosUsuario: any): Observable<any> {
    return this.http.post(`${this.authUrl}/register`, dadosUsuario);
  }

  login(email: string, senha: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.authUrl}/login`, { email, senha }).pipe(
      tap(response => {
        if (response.token && response.user) {
          this.setToken(response.token);
          this.setUser(response.user); // Salva o usuário com os planos
        }
      })
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/forgot-password`, { email });
  }

  verifyEmailCode(email: string, code: string): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/verify-email-code`, { email, code });
  }

  resetPassword(token: string, senha: string, confirmarSenha: string): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/reset-password`, { token, senha, confirmarSenha });
  }

  // --- NOVO MÉTODO ---
  /**
   * Retorna o ID do plano ativo do usuário logado.
   * 'gratis' é o padrão se não houver plano "Pago/Ativo".
   */
  public getPlanoAtivo(): 'gratis' | 'base' | 'gold' {
    const usuario = this.currentUserValue; // Usa o BehaviorSubject

    if (usuario && usuario.planos && usuario.planos.length > 0) {
      // O backend já filtrou por 'Pago/Ativo'
      const planoAtivo = usuario.planos[0]; // Pega o mais recente

      if (planoAtivo) {
        const tipoNormalizado = planoAtivo.tipo.toLowerCase();
        if (tipoNormalizado.includes('gold')) {
          return 'gold';
        }
        if (tipoNormalizado.includes('base')) {
          return 'base';
        }
        // Se tiver um plano "Gratis" ou "Trial" registrado no DB
        if (tipoNormalizado.includes('gratis') || tipoNormalizado.includes('trial')) {
           // TODO: Adicionar lógica de expiração de 7 dias
          return 'gratis';
        }
      }
    }

    // Se não tem plano pago, é 'gratis' (ou trial expirado)
    return 'gratis';
  }

  // --- MÉTODOS AUXILIARES ---
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

  // --- NOVO MÉTODO AUXILIAR ---
  /**
   * Atualiza o usuário no localStorage e no BehaviorSubject.
   * Útil após um update de perfil, por exemplo.
   */
  public updateUser(usuario: Usuario): void {
    this.setUser(usuario);
  }
}