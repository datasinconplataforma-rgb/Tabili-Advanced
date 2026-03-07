import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useExternalCollection } from '@/hooks/useExternalCollection';
import { useCustomTables } from '@/hooks/useCustomTables';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, RefreshCw, ExternalLink, Globe, Users, Share2, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ExternalCollectionDialogProps {
  tableId: string | null;
  tableName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ExternalCollectionDialog({
  tableId,
  tableName,
  isOpen,
  onClose,
}: ExternalCollectionDialogProps) {
  const { settings, loading, enableCollection, updateSettings, regenerateToken, disableCollection, getPublicUrl } = useExternalCollection(tableId);
  const { tables } = useCustomTables();
  const { toast } = useToast();
  
  const [allowMultiple, setAllowMultiple] = useState(true);
  const [respondentLabel, setRespondentLabel] = useState('Email');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (settings) {
      setAllowMultiple(settings.allow_multiple_submissions);
      setRespondentLabel(settings.respondent_field_label);
    } else {
      setAllowMultiple(true);
      setRespondentLabel('Email');
    }
  }, [settings]);

  const handleEnable = async () => {
    await enableCollection({
      allowMultipleSubmissions: allowMultiple,
      respondentFieldLabel: respondentLabel.trim() || 'Email',
    });
  };

  const handleSaveSettings = async () => {
    await updateSettings({
      allow_multiple_submissions: allowMultiple,
      respondent_field_label: respondentLabel.trim() || 'Email',
    });
  };

  const handleDisable = async () => {
    if (confirm('Tem certeza que deseja desabilitar a coleta externa? O link público deixará de funcionar.')) {
      await disableCollection();
    }
  };

  const handleCopyLink = () => {
    const url = getPublicUrl();
    if (url) {
      navigator.clipboard.writeText(url);
      toast({
        title: 'Link copiado!',
        description: 'O link foi copiado para a área de transferência.',
      });
    }
  };

  const handleOpenLink = () => {
    const url = getPublicUrl();
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleNativeShare = async () => {
    const url = getPublicUrl();
    if (!url) return;
    
    const shareData = {
      title: `Formulário: ${tableName}`,
      text: `Preencha o formulário "${tableName}"`,
      url,
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(url);
        toast({
          title: 'Link copiado!',
          description: 'Compartilhe o link copiado via seu app favorito.',
        });
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Share error:', err);
      }
    }
  };

  // Get columns for the table to show preview
  const tableColumns = tables.find(t => t.id === tableId)?.columns || [];
  const sortedPreviewColumns = [...tableColumns]
    .filter(col => col.column_type !== 'formula')
    .sort((a, b) => a.column_order - b.column_order);

  const publicUrl = getPublicUrl();

  const getInputType = (columnType: string) => {
    switch (columnType) {
      case 'number': return 'number';
      case 'date': return 'date';
      case 'time': return 'time';
      default: return 'text';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Coleta Externa
          </DialogTitle>
          <DialogDescription>
            Configure a coleta de dados externos para a tabela "{tableName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {loading && !settings ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : settings ? (
            <>
              {/* Link público */}
              <div className="space-y-2">
                <Label>Link Público</Label>
                <div className="flex gap-2">
                  <Input 
                    value={publicUrl || ''} 
                    readOnly 
                    className="text-sm font-mono"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyLink} title="Copiar link">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleOpenLink} title="Abrir em nova aba">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs text-muted-foreground"
                    onClick={() => regenerateToken()}
                    disabled={loading}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Gerar novo link
                  </Button>
                </div>
              </div>

              {/* Share + Preview buttons */}
              <div className="flex gap-2">
                <Button onClick={handleNativeShare} variant="outline" className="flex-1">
                  <Share2 className="h-4 w-4 mr-2" />
                  Compartilhar
                </Button>
                <Button onClick={() => setShowPreview(!showPreview)} variant="outline" className="flex-1">
                  {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showPreview ? 'Ocultar Preview' : 'Visualizar Formulário'}
                </Button>
              </div>

              {/* Form Preview */}
              {showPreview && (
                <div className="border rounded-xl overflow-hidden bg-muted/30">
                  <div className="bg-muted/50 px-3 py-2 border-b">
                    <p className="text-xs font-medium text-muted-foreground">📱 Pré-visualização do formulário</p>
                  </div>
                  <div className="p-4">
                    <Card>
                      <CardHeader className="text-center pb-3">
                        <CardTitle className="text-lg">{tableName}</CardTitle>
                        <CardDescription className="text-xs">
                          Preencha os campos abaixo para enviar sua resposta
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Respondent field */}
                        <div className="space-y-1.5">
                          <Label className="text-xs flex items-center gap-1">
                            {respondentLabel || 'Email'}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input 
                            disabled 
                            placeholder={`Digite seu ${(respondentLabel || 'email').toLowerCase()}`}
                            className="h-8 text-xs"
                          />
                        </div>

                        {/* Dynamic fields */}
                        {sortedPreviewColumns.map((column) => (
                          <div key={column.id} className="space-y-1.5">
                            <Label className="text-xs">{column.display_name}</Label>
                            {column.column_type === 'list' && column.list_config?.items ? (
                              <Select disabled>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder={`Selecione ${column.display_name.toLowerCase()}`} />
                                </SelectTrigger>
                              </Select>
                            ) : (
                              <Input
                                disabled
                                type={getInputType(column.column_type)}
                                placeholder={column.display_name}
                                className="h-8 text-xs"
                              />
                            )}
                          </div>
                        ))}

                        <Button disabled className="w-full h-8 text-xs">
                          Enviar Resposta
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Campo de identificação */}
              <div className="space-y-2">
                <Label htmlFor="respondentLabel">Campo de Identificação do Respondente</Label>
                <Input
                  id="respondentLabel"
                  value={respondentLabel}
                  onChange={(e) => setRespondentLabel(e.target.value)}
                  placeholder="Ex: Email, Nome, CPF..."
                />
                <p className="text-xs text-muted-foreground">
                  Este campo será exibido no formulário para identificar quem está enviando os dados.
                </p>
              </div>

              {/* Permitir múltiplos envios */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Permitir múltiplos envios
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Se desabilitado, cada pessoa poderá enviar apenas uma vez.
                  </p>
                </div>
                <Switch
                  checked={allowMultiple}
                  onCheckedChange={setAllowMultiple}
                />
              </div>

              {/* Botões de ação */}
              <div className="flex gap-2">
                <Button onClick={handleSaveSettings} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar Alterações
                </Button>
                <Button variant="destructive" onClick={handleDisable} disabled={loading}>
                  Desabilitar Coleta
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center py-4 space-y-2">
                <Globe className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">
                  A coleta externa permite que pessoas preencham esta tabela através de um link público, sem precisar fazer login.
                </p>
              </div>

              {/* Campo de identificação */}
              <div className="space-y-2">
                <Label htmlFor="respondentLabelNew">Campo de Identificação do Respondente</Label>
                <Input
                  id="respondentLabelNew"
                  value={respondentLabel}
                  onChange={(e) => setRespondentLabel(e.target.value)}
                  placeholder="Ex: Email, Nome, CPF..."
                />
              </div>

              {/* Permitir múltiplos envios */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Permitir múltiplos envios
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Se desabilitado, cada pessoa poderá enviar apenas uma vez.
                  </p>
                </div>
                <Switch
                  checked={allowMultiple}
                  onCheckedChange={setAllowMultiple}
                />
              </div>

              <Button onClick={handleEnable} className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Globe className="h-4 w-4 mr-2" />
                Habilitar Coleta Externa
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
