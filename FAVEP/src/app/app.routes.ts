import { Routes } from '@angular/router';

import { HomeComponent } from '../Pages/home/home.component';
import { AssinaturaComponent } from '../Pages/assinatura/assinatura/assinatura.component';
import { ContatoComponent } from '../Pages/contato/contato.component';
import { ParceirosComponent } from '../Pages/parceiros/parceiros.component';
import { EstatisticaComponent } from '../Pages/estatistica/estatistica.component';
import { RelatorioComponent } from '../Pages/relatorio/relatorio/relatorio.component';
import { GerenciamentoComponent } from '../Pages/gerenciamento/gerenciamento.component';
import { UsuarioComponent } from '../Pages/Auth/usuario/usuario.component';

import { PasswordComponent } from '../Pages/password/password.component';

import { AuthGuard } from '../services/auth.guard';
import { PlanoAssinaturaComponent } from '../Pages/plano-assinatura/plano-assinatura.component';
import { AdicionarUsuarioComponent } from '../Pages/adicionar-usuario/adicionar-usuario.component';
import { MenuLateralComponent } from '../Pages/menu-lateral/menu-lateral.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'home', component: HomeComponent },
    { path: 'assinatura', component: AssinaturaComponent },
    { path: 'contato', component: ContatoComponent },
    { path: 'parceiros', component: ParceirosComponent },
    { path: 'auth/verify-email', component: PasswordComponent },
    { path: 'auth/reset-password', component: PasswordComponent },
    { path: 'plano-assinatura', component: PlanoAssinaturaComponent },
    { path: 'estatistica', component: EstatisticaComponent, canActivate: [AuthGuard], data: { planoRequerido: 'base' }} ,
    { path: 'relatorio', component: RelatorioComponent, canActivate: [AuthGuard], data: { planoRequerido: 'base' }},
    { path: 'gerenciamento', component: GerenciamentoComponent, canActivate: [AuthGuard], data: { planoRequerido: 'base' } },
    { path: 'usuario', component: UsuarioComponent, canActivate: [AuthGuard] },
    { path: 'adicionar-usuario', component: AdicionarUsuarioComponent },
    { path: 'menuLateral', component: MenuLateralComponent}
];
