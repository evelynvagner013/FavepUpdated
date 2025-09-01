import { Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UsuarioService } from './usuario.service';
import { PropriedadeService } from './propriedade.service';
import { ProducaoService } from './producao.service';
import { MovimentacaoService } from './movimentacao.service';
import { AuthService } from './auth.service';
// CORREÇÃO: Importa 'Financeiro' em vez de 'Movimentacao'
import { Usuario, Propriedade, Producao, Financeiro } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class DashboardDataService {

  constructor(
    private usuarioService: UsuarioService,
    private propriedadeService: PropriedadeService,
    private producaoService: ProducaoService,
    private movimentacaoService: MovimentacaoService,
    private authService: AuthService
  ) { }

  carregarDadosDashboard(): Observable<{
    perfil: Usuario | null;
    propriedades: Propriedade[];
    producoes: Producao[];
    // CORREÇÃO: O tipo de retorno agora é 'Financeiro[]'
    movimentacoes: Financeiro[];
  }> {
    const perfilObservable = of(this.authService.currentUserValue);

    return forkJoin({
      perfil: perfilObservable,
      propriedades: this.propriedadeService.getPropriedades(),
      producoes: this.producaoService.getProducoes(),
      movimentacoes: this.movimentacaoService.getMovimentacoes()
    }).pipe(
      catchError(error => {
        console.error('Erro ao carregar dados consolidados do dashboard:', error);
        return of({
          perfil: null,
          propriedades: [],
          producoes: [],
          movimentacoes: []
        });
      })
    );
  }
}
