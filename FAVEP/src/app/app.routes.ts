import { Routes } from '@angular/router';

// Componentes das páginas
import { HomeComponent } from '../Pages/home/home.component';
import { AssinaturaComponent } from '../Pages/assinatura/assinatura/assinatura.component';
import { ContatoComponent } from '../Pages/contato/contato.component';
import { ParceirosComponent } from '../Pages/parceiros/parceiros.component';
import { EstatisticaComponent } from '../Pages/estatistica/estatistica.component';
import { RelatorioComponent } from '../Pages/relatorio/relatorio/relatorio.component';
import { GerenciamentoComponent } from '../Pages/gerenciamento/gerenciamento.component';
import { UsuarioComponent } from '../Pages/Auth/usuario/usuario.component';

// --- ATUALIZAÇÃO ---
// 1. Importe o PasswordComponent
import { PasswordComponent } from '../Pages/password/password.component';

// Guarda de rota
import { AuthGuard } from '../services/auth.guard';

export const routes: Routes = [
    // Rotas públicas
    { path: '', component: HomeComponent },
    { path: 'home', component: HomeComponent },
    { path: 'assinatura', component: AssinaturaComponent },
    { path: 'contato', component: ContatoComponent },
    { path: 'parceiros', component: ParceirosComponent },
    { path: 'auth/verify-email', component: PasswordComponent },
    { path: 'auth/reset-password', component: PasswordComponent },
    { path: 'estatistica', component: EstatisticaComponent, canActivate: [AuthGuard] },
    { path: 'relatorio', component: RelatorioComponent, canActivate: [AuthGuard] },
    { path: 'gerenciamento', component: GerenciamentoComponent, canActivate: [AuthGuard] },
    { path: 'usuario', component: UsuarioComponent, canActivate: [AuthGuard] },
];