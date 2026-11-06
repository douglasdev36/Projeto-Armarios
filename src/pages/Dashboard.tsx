import { useState } from "react";
import { Archive, Users, CheckCircle, Lock, Search, ShieldAlert, KeyRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppSidebar } from "@/components/AppSidebar";
import { StatCard } from "@/components/StatCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LockerBadge } from "@/components/LockerBadge";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PrimeiroAcessoModal } from "@/components/PrimeiroAcessoModal";

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [primeiroAcessoOpen, setPrimeiroAcessoOpen] = useState(false);
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: api.getDashboardStats,
  });

  const { data: alunos = [] } = useQuery({
    queryKey: ["alunos"],
    queryFn: api.getAlunos,
  });

  const filteredAlunos = alunos.filter(
    (aluno) =>
      aluno.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aluno.matricula.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Visão Geral do Sistema</h1>
            <p className="text-muted-foreground mt-1">
              Painel de consulta e estatísticas do gerenciamento de armários escolares.
            </p>
          </div>

          {/* Alerta de Primeiro Acesso com Credenciais Padrão */}
          {user?.email === "coordenador@escola.com" && (
            <div className="mb-8 p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">
                    Segurança: Você está utilizando a conta padrão de fábrica
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Recomendamos definir seu nome, seu e-mail institucional e uma senha segura exclusiva.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setPrimeiroAcessoOpen(true)}
                className="rounded-2xl shrink-0 gap-2 font-medium bg-amber-600 hover:bg-amber-700 text-white"
                size="sm"
              >
                <KeyRound className="h-4 w-4" />
                Personalizar Acesso
              </Button>
            </div>
          )}

          <PrimeiroAcessoModal open={primeiroAcessoOpen} onOpenChange={setPrimeiroAcessoOpen} />

          {/* Stats Grid - Read Only */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total de Armários"
              value={stats?.totalArmarios ?? 0}
              icon={Archive}
            />
            <StatCard
              title="Armários Livres"
              value={stats?.armariosDisponiveis ?? 0}
              icon={CheckCircle}
            />
            <StatCard
              title="Armários Ocupados"
              value={stats?.armariosOcupados ?? 0}
              icon={Lock}
            />
            <StatCard
              title="Total de Alunos"
              value={stats?.totalAlunos ?? 0}
              icon={Users}
            />
          </div>

          {/* Students Consultation Table */}
          <div className="bg-card rounded-2xl border border-border p-6 animate-fade-in shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">Consulta de Alunos & Armários</h2>
            </div>

            <div className="mb-6 relative max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou matrícula..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="table-header">Nome do Aluno</TableHead>
                    <TableHead className="table-header">Matrícula</TableHead>
                    <TableHead className="table-header">Turma</TableHead>
                    <TableHead className="table-header">Telefone</TableHead>
                    <TableHead className="table-header">E-mail</TableHead>
                    <TableHead className="table-header text-right">Armário Atual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlunos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        Nenhum aluno encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAlunos.map((aluno) => (
                      <TableRow key={aluno.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{aluno.nome}</TableCell>
                        <TableCell className="text-muted-foreground">{aluno.matricula}</TableCell>
                        <TableCell>{aluno.turma}</TableCell>
                        <TableCell className="text-muted-foreground">{aluno.telefone}</TableCell>
                        <TableCell className="text-muted-foreground">{aluno.email}</TableCell>
                        <TableCell className="text-right">
                          <LockerBadge locker={aluno.armario} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
