import { useState } from "react";
import { Archive, Users, CheckCircle, Lock, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppSidebar } from "@/components/AppSidebar";
import { StatCard } from "@/components/StatCard";
import { Input } from "@/components/ui/input";
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

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState("");

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
