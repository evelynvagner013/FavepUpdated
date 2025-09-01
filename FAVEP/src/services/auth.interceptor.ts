import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Interceptor para adicionar o token de autenticação JWT às requisições HTTP.
 * Ele verifica se há um token no localStorage e, se houver, o anexa
 * ao cabeçalho 'Authorization' como um token Bearer.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Tenta obter o token JWT do localStorage
  const token = localStorage.getItem('token');

  // Se um token existir, clona a requisição e adiciona o cabeçalho de Autorização
  if (token) {
    const cloned = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    // Continua com a requisição clonada
    return next(cloned);
  }

  // Se não houver token, continua com a requisição original
  return next(req);
};
