import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CustomTable } from '@/hooks/useCustomTables';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRightLeft, AlertTriangle } from 'lucide-react';

interface TransferOwnershipDialogProps {
  table: CustomTable | null;
  isOpen: boolean;
  onClose: () => void;
  onTransferred: () => void;
}

export function TransferOwnershipDialog({ table, isOpen, onClose, onTransferred }: TransferOwnershipDialogProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleTransfer = async () => {
    if (!table || !email.trim() || confirmText !== 'TRANSFERIR') return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc('transfer_table_ownership', {
        p_table_id: table.id,
        p_new_owner_email: email.trim(),
      });

      if (error) {
        toast({ title: 'Erro ao transferir', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Propriedade transferida!', description: `A tabela "${table.name}" agora pertence a ${email.trim()}. Você agora tem acesso de visualização.` });
        setEmail('');
        setConfirmText('');
        onClose();
        onTransferred();
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setEmail('');
      setConfirmText('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transferir Propriedade
          </DialogTitle>
          <DialogDescription>
            Transferir a propriedade de "{table?.name}" para outro usuário
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Ação irreversível</p>
              <p className="text-muted-foreground mt-1">
                Ao transferir, você perderá a propriedade e se tornará apenas <strong>visualizador</strong>. 
                O novo proprietário terá controle total sobre a tabela.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-email">Email do novo proprietário</Label>
            <Input
              id="transfer-email"
              type="email"
              placeholder="novo-proprietario@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-text">
              Digite <strong>TRANSFERIR</strong> para confirmar
            </Label>
            <Input
              id="confirm-text"
              placeholder="TRANSFERIR"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>

          <Button
            onClick={handleTransfer}
            disabled={!email.trim() || confirmText !== 'TRANSFERIR' || isSubmitting}
            variant="destructive"
            className="w-full"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRightLeft className="h-4 w-4 mr-2" />}
            Transferir Propriedade
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
