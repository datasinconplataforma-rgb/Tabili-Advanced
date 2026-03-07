import { useState, useEffect } from 'react';
import { ModuleSidebarLayout, ModuleMenuItem } from '@/components/ModuleSidebarLayout';
import { useCustomTables } from '@/hooks/useCustomTables';
import { ExternalCollectionDialog } from '@/components/ExternalCollectionDialog';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Globe, Search, ExternalLink, Copy, Settings2, Loader2, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const menuItems: ModuleMenuItem[] = [
  { id: "formulario-externo", label: "Formulário Externo", icon: Globe, href: "/formulario-externo" },
];

interface CollectionSetting {
  id: string;
  table_id: string;
  is_enabled: boolean;
  public_token: string;
  allow_multiple_submissions: boolean;
  respondent_field_label: string;
}

export default function FormularioExterno() {
  const { tables, loading: tablesLoading } = useCustomTables();
  const [collectionSettings, setCollectionSettings] = useState<CollectionSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [configuringTable, setConfiguringTable] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('external_collection_settings')
        .select('*');
      if (error) throw error;
      setCollectionSettings(data || []);
    } catch (err) {
      console.error('Error fetching collection settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSettings();
  }, []);

  const ownedTables = tables.filter(t => t.is_owner);

  const getSetting = (tableId: string) => collectionSettings.find(c => c.table_id === tableId);

  const filteredTables = ownedTables.filter(t => 
    !searchFilter || t.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const enabledCount = ownedTables.filter(t => {
    const cs = getSetting(t.id);
    return cs?.is_enabled;
  }).length;

  const handleCopyLink = (token: string) => {
    const url = `https://www.tabili.com.br/formulario/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copiado!' });
  };

  const handleOpenLink = (token: string) => {
    window.open(`https://www.tabili.com.br/formulario/${token}`, '_blank');
  };

  return (
    <ModuleSidebarLayout moduleName="Formulário Externo" moduleIcon={Globe} menuItems={menuItems}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Formulário Externo</h1>
          <p className="text-muted-foreground">Gerencie os formulários públicos de coleta de dados</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{ownedTables.length}</div>
              <p className="text-sm text-muted-foreground">Tabelas próprias</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">{enabledCount}</div>
              <p className="text-sm text-muted-foreground">Formulários ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-muted-foreground">{ownedTables.length - enabledCount}</div>
              <p className="text-sm text-muted-foreground">Sem formulário externo</p>
            </CardContent>
          </Card>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar tabelas..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9"
          />
        </div>

        {tablesLoading || loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTables.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Database className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                {searchFilter ? 'Nenhuma tabela encontrada.' : 'Nenhuma tabela própria encontrada.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTables.map((table) => {
              const cs = getSetting(table.id);
              const isActive = cs?.is_enabled;

              return (
                <Card key={table.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Database className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle className="text-base">{table.name}</CardTitle>
                          <CardDescription>
                            {table.columns.length} colunas
                            {cs && isActive && (
                              <span className="ml-2">
                                · {cs.allow_multiple_submissions ? 'Múltiplos envios' : 'Envio único'}
                                · Identificação: {cs.respondent_field_label}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isActive ? (
                          <Badge variant="default" className="gap-1">
                            <Globe className="h-3 w-3" /> Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => setConfiguringTable({ id: table.id, name: table.name })}
                      >
                        <Settings2 className="h-4 w-4" /> Configurar
                      </Button>
                      {isActive && cs && (
                        <>
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => handleCopyLink(cs.public_token)}>
                            <Copy className="h-4 w-4" /> Copiar Link
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => handleOpenLink(cs.public_token)}>
                            <ExternalLink className="h-4 w-4" /> Abrir
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {configuringTable && (
        <ExternalCollectionDialog
          tableId={configuringTable.id}
          tableName={configuringTable.name}
          isOpen={!!configuringTable}
          onClose={() => {
            setConfiguringTable(null);
            fetchAllSettings();
          }}
        />
      )}
    </ModuleSidebarLayout>
  );
}
