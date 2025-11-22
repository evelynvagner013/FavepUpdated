// [Arquivo: services/auth.interceptor.ts]

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core'; // Importe PLATFORM_ID
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { isPlatformBrowser } from '@angular/common'; // Importe isPlatformBrowser

/**
 * Interceptor que:
 * 1. Adiciona o token de autenticação JWT às requisições (IDA).
 * 2. Captura erros 401 (Token Expirado) e desloga o usuário (VOLTA).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const authService = inject(AuthService);
  const router = inject(Router);

  // Injeta o ID da plataforma para saber se estamos no servidor ou no navegador
  const platformId = inject(PLATFORM_ID);

  let token: string | null = null;

  // VERIFICAÇÃO CRUCIAL: Só acessa o localStorage se estivermos no navegador
  if (isPlatformBrowser(platformId)) {
    token = localStorage.getItem('token');
  }

  let clonedReq = req;

  // Se um token existir, clona a requisição e adiciona o cabeçalho
  if (token) {
    clonedReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  return next(clonedReq).pipe(
    catchError((error: any) => {

      if (error instanceof HttpErrorResponse && error.status === 401) {

        console.warn('Interceptor: Token expirado ou inválido (Erro 401). Deslogando...');

        // É seguro chamar logout aqui, mas verifique se o AuthService também protege o uso do localStorage
        authService.logout();

        router.navigate(['/home']);
      }

      return throwError(() => error);
    })
  );
};
