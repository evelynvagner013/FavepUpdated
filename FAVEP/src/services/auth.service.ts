import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { Usuario, AuthResponse, PlanosMercadoPago } from '../models/api.models';
import { environment } from '../environments/environment';
import { UsuarioService } from './usuario.service';

export type TipoPlano = 'base' | 'gold';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authUrl = `${environment.apiUrl}/auth`;
  private isBrowser: boolean;

  private currentUserSubject: BehaviorSubject<Usuario | null>;
  public currentUser: Observable<Usuario | null>;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private usuarioService: UsuarioService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
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
          this.setUser(response.user);
        }
      })
    );
  }

  completeSubUserProfile(data: any): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/complete-sub-user-profile`, data);
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/forgot-password`, { email });
  }

  verifyEmailCode(email: string, code: string): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/verify-email-code`, { email, code });
  }

  verifyNewEmail(code: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.authUrl}/verify-new-email`, { code });
  }

  resetPassword(token: string, senha: string, confirmarSenha: string): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/reset-password`, { token, senha, confirmarSenha });
  }

  preRegisterSubUser(email: string, cargo: string, propriedades: string[] = []): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/pre-register-sub-user`, { email, cargo, propriedades });
  }

  getSubUsers(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.authUrl}/sub-users`);
  }

  updateSubUser(id: string, data: { cargo: string, propriedades: string[] }): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.authUrl}/sub-users/${id}`, data);
  }

  iniciarChangePassword2FA(payload: any): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/iniciar-change-password-2fa`, payload);
  }

  finalizarChangePassword2FA(payload: any): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/finalizar-change-password-2fa`, payload);
  }

  private isPlanoAtivo(plano: PlanosMercadoPago): boolean {
    return plano.status === 'Pago/Ativo' || plano.status === 'Trial';
  }

  public getPlanoAtivo(): TipoPlano | null {
    const usuario = this.currentUserValue;

    if (usuario && usuario.planos && usuario.planos.length > 0) {
      if (usuario.planos.some(p => p.tipo.toLowerCase().includes('gold') && this.isPlanoAtivo(p))) {
        return 'gold';
      }
      if (usuario.planos.some(p => p.tipo.toLowerCase().includes('base') && this.isPlanoAtivo(p))) {
        return 'base';
      }
    }
    return null;
  }

  public temPlanoSuficiente(planoRequerido: TipoPlano): boolean {
    const planoUsuario = this.getPlanoAtivo();

    if (planoUsuario === 'gold') {
      return true;
    }

    if (planoUsuario === 'base') {
      return planoRequerido === 'base';
    }

    return false;
  }

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

  public updateUser(usuario: Usuario): void {
    this.setUser(usuario);
  }

  public refreshUserData(): Observable<Usuario | null> {
    if (!this.isLoggedIn()) {
      return of(null);
    }

    return this.usuarioService.atualizarPerfilUsuario({}).pipe(
      map((response: AuthResponse) => {
        if (response.user && response.token) {
          this.setToken(response.token);
          this.setUser(response.user);
          return response.user;
        }
        return null;
      }),
      catchError(err => {
        console.error("Falha ao atualizar dados do usuário", err);
        return of(this.currentUserValue);
      })
    );
  }
}
