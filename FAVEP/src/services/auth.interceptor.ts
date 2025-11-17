// [Arquivo: services/auth.interceptor.ts]

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service'; // Importamos o AuthService

/**
 * Interceptor que:
 * 1. Adiciona o token de autenticação JWT às requisições (IDA).
 * 2. Captura erros 401 (Token Expirado) e desloga o usuário (VOLTA).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  
  // Injetar os serviços que precisamos (AuthService e Router)
  const authService = inject(AuthService);
  const router = inject(Router);

  // Pega o token do localStorage (como no seu arquivo original)
  const token = localStorage.getItem('token');
  let clonedReq = req;

  // Se um token existir, clona a requisição e adiciona o cabeçalho
  if (token) {
    clonedReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  // ---- AQUI ESTÁ A MODIFICAÇÃO ----
  // Continuamos a requisição, mas agora usamos o .pipe() para observar a resposta
  return next(clonedReq).pipe(
    catchError((error: any) => {
      
      // Verificamos se é um erro HTTP e se o status é 401 (Não Autorizado)
      if (error instanceof HttpErrorResponse && error.status === 401) {
        
        console.warn('Interceptor: Token expirado ou inválido (Erro 401). Deslogando...');
        
        // Usamos o seu AuthService para deslogar
        authService.logout();
        
        // Navegamos para a 'home'. Se o AuthGuard estiver lá,
        // ele tentará verificar o login (que falhará) e mostrará o modal.
        router.navigate(['/home']); 
      }
      
      // Relança o erro para que outros tratadores (como o .subscribe no seu service) possam vê-lo
      return throwError(() => error);
    })
  );
};