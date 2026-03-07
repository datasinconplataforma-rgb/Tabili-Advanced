import { useState } from 'react';
import { useTableShares, TableShare } from '@/hooks/useTableShares';
import { CustomTable } from '@/hooks/useCustomTables';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Trash2, Mail, Eye, Pencil, Users, ShieldCheck } from 'lucide-react';

type PermissionLevel = 'view' | 'edit' | 'admin';

interface ShareTableDialogProps {
  table: CustomTable | null;
  isOpen: boolean;
  onClose: () => void;
}

const permissionLabels: Record<PermissionLevel, string> = {
  view: 'Visualizador',
  edit: 'Editor',
  admin: 'Administrador',
};

export function ShareTableDialog({ table, isOpen, onClose }: ShareTableDialogProps) {
  const { shares, loading, shareTable, updateSharePermission, removeShare } = useTableShares(table?.id || null);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<PermissionLevel>('view');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleShare = async () => {
    if (!email.trim()) return;
    
    setIsSubmitting(true);
    const success = await shareTable(email.trim(), permission);
    if (success) {
      setEmail('');
      setPermission('view');
    }
    setIsSubmitting(false);
  };

  const handleRemove = async (shareId: string) => {
    if (confirm('Tem certeza que deseja remover este compartilhamento?')) {
      await removeShare(shareId);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && email.trim()) {
      handleShare();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Compartilhar Tabela
          </DialogTitle>
          <DialogDescription>
            Compartilhe "{table?.name}" com outros usuários por email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Share Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email do usuário</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="permission">Permissão</Label>
                <Select value={permission} onValueChange={(v) => setPermission(v as PermissionLevel)}>
                  <SelectTrigger id="permission">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Visualizador
                      </div>
                    </SelectItem>
                    <SelectItem value="edit">
                      <div className="flex items-center gap-2">
                        <Pencil className="h-4 w-4" />
                        Editor
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        Administrador
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleShare} disabled={!email.trim() || isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  <span className="ml-2">Compartilhar</span>
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1 p-3 rounded-md bg-muted/50">
              <p><strong>Visualizador:</strong> Apenas consulta</p>
              <p><strong>Editor:</strong> Inserir dados, consultar, relatórios</p>
              <p><strong>Administrador:</strong> Tudo, exceto excluir e transferir propriedade</p>
            </div>
          </div>

          {/* Existing Shares */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Compartilhado com</Label>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : shares.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Esta tabela ainda não foi compartilhada com ninguém.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {shares.map((share) => (
                  <ShareItem 
                    key={share.id} 
                    share={share} 
                    onUpdatePermission={updateSharePermission}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ShareItemProps {
  share: TableShare;
  onUpdatePermission: (shareId: string, permission: 'view' | 'edit') => Promise<boolean>;
  onRemove: (shareId: string) => void;
}

function ShareItem({ share, onUpdatePermission, onRemove }: ShareItemProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handlePermissionChange = async (newPermission: string) => {
    setIsUpdating(true);
    await onUpdatePermission(share.id, newPermission as 'view' | 'edit');
    setIsUpdating(false);
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{share.shared_with_email}</p>
        {!share.shared_with_user_id && (
          <Badge variant="outline" className="text-xs mt-0.5">Pendente</Badge>
        )}
      </div>
      <Select 
        value={share.permission} 
        onValueChange={handlePermissionChange}
        disabled={isUpdating}
      >
        <SelectTrigger className="w-32 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="view">Visualizador</SelectItem>
          <SelectItem value="edit">Editor</SelectItem>
          <SelectItem value="admin">Administrador</SelectItem>
        </SelectContent>
      </Select>
      <Button 
        variant="ghost" 
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        onClick={() => onRemove(share.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
