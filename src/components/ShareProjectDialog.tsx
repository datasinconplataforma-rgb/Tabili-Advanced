import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { TableProject } from '@/hooks/useTableProjects';
import { CustomTable } from '@/hooks/useCustomTables';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Trash2, Mail, Users, FolderOpen, Table2 } from 'lucide-react';

interface ShareProjectDialogProps {
  project: TableProject | null;
  tables: CustomTable[];
  isOpen: boolean;
  onClose: () => void;
}

interface ExistingShare {
  id: string;
  table_id: string;
  shared_with_email: string;
  permission: string;
  table_name?: string;
}

export function ShareProjectDialog({ project, tables, isOpen, onClose }: ShareProjectDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingShares, setExistingShares] = useState<ExistingShare[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);

  // Reset state when dialog opens/project changes
  useEffect(() => {
    if (isOpen && project) {
      setEmail('');
      setSelectedTableIds(new Set(tables.map(t => t.id)));
      fetchExistingShares();
    }
  }, [isOpen, project?.id]);

  const fetchExistingShares = async () => {
    if (!user || !tables.length) return;

    setLoadingShares(true);
    const tableIds = tables.map(t => t.id);
    const { data, error } = await supabase
      .from('table_shares')
      .select('*')
      .in('table_id', tableIds)
      .eq('owner_id', user.id)
      .order('shared_with_email');

    if (!error && data) {
      setExistingShares(data.map(share => ({
        ...share,
        table_name: tables.find(t => t.id === share.table_id)?.name || 'Desconhecida',
      })));
    }
    setLoadingShares(false);
  };

  const toggleTable = (tableId: string) => {
    setSelectedTableIds(prev => {
      const next = new Set(prev);
      if (next.has(tableId)) next.delete(tableId);
      else next.add(tableId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedTableIds.size === tables.length) {
      setSelectedTableIds(new Set());
    } else {
      setSelectedTableIds(new Set(tables.map(t => t.id)));
    }
  };

  const handleShare = async () => {
    if (!email.trim() || selectedTableIds.size === 0 || !user) return;

    const targetEmail = email.trim().toLowerCase();

    if (targetEmail === user.email?.toLowerCase()) {
      toast({ title: 'Erro', description: 'Você não pode compartilhar consigo mesmo.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Filter out tables already shared with this email
      const alreadySharedTableIds = new Set(
        existingShares
          .filter(s => s.shared_with_email === targetEmail)
          .map(s => s.table_id)
      );

      const tablesToShare = [...selectedTableIds].filter(id => !alreadySharedTableIds.has(id));

      if (tablesToShare.length === 0) {
        toast({ title: 'Já compartilhado', description: 'Todas as tabelas selecionadas já estão compartilhadas com este email.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      const inserts = tablesToShare.map(tableId => ({
        table_id: tableId,
        owner_id: user.id,
        shared_with_email: targetEmail,
        permission: 'view',
      }));

      const { error } = await supabase.from('table_shares').insert(inserts);

      if (error) {
        toast({ title: 'Erro ao compartilhar', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Projeto compartilhado!', description: `${tablesToShare.length} tabela(s) compartilhada(s) com ${targetEmail}` });
        setEmail('');
        await fetchExistingShares();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    const { error } = await supabase.from('table_shares').delete().eq('id', shareId);
    if (error) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Compartilhamento removido!' });
      setExistingShares(prev => prev.filter(s => s.id !== shareId));
    }
  };

  // Group existing shares by email
  const sharesByEmail = existingShares.reduce<Record<string, ExistingShare[]>>((acc, share) => {
    if (!acc[share.shared_with_email]) acc[share.shared_with_email] = [];
    acc[share.shared_with_email].push(share);
    return acc;
  }, {});

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Compartilhar Projeto
          </DialogTitle>
          <DialogDescription>
            Compartilhe tabelas do projeto "{project?.name}" com outro usuário (somente visualização)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Email input */}
          <div className="space-y-2">
            <Label htmlFor="share-email">Email do usuário</Label>
            <Input
              id="share-email"
              type="email"
              placeholder="usuario@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleShare()}
            />
          </div>

          {/* Table checkboxes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Tabelas a compartilhar</Label>
              <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs h-7">
                {selectedTableIds.size === tables.length ? 'Desmarcar todas' : 'Selecionar todas'}
              </Button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
              {tables.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">Nenhuma tabela neste projeto</p>
              ) : (
                tables.map((table) => (
                  <label key={table.id} className="flex items-center gap-3 py-1 cursor-pointer hover:bg-muted/50 rounded px-1">
                    <Checkbox
                      checked={selectedTableIds.has(table.id)}
                      onCheckedChange={() => toggleTable(table.id)}
                    />
                    <Table2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{table.name}</span>
                    <Badge variant="secondary" className="text-xs ml-auto shrink-0">
                      {table.columns.length} col
                    </Badge>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Share button */}
          <Button
            onClick={handleShare}
            disabled={!email.trim() || selectedTableIds.size === 0 || isSubmitting}
            className="w-full gap-2"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Compartilhar ({selectedTableIds.size} tabela{selectedTableIds.size !== 1 ? 's' : ''})
          </Button>

          {/* Existing shares */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-muted-foreground">Compartilhamentos existentes</Label>
            {loadingShares ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : Object.keys(sharesByEmail).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                Nenhum compartilhamento neste projeto
              </p>
            ) : (
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {Object.entries(sharesByEmail).map(([shareEmail, shares]) => (
                  <div key={shareEmail} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium truncate">{shareEmail}</span>
                      <Badge variant="outline" className="text-xs ml-auto shrink-0">
                        {shares.length} tabela{shares.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="space-y-1 pl-6">
                      {shares.map((share) => (
                        <div key={share.id} className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground truncate">{share.table_name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveShare(share.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

