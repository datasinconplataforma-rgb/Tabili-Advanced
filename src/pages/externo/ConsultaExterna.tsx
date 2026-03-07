import { useState, useEffect } from 'react';
import { ModuleSidebarLayout, ModuleMenuItem } from '@/components/ModuleSidebarLayout';
import { useCustomTables } from '@/hooks/useCustomTables';
import { PublicViewDialog } from '@/components/PublicViewDialog';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Eye, Search, ExternalLink, Copy, Settings2, Loader2, Database, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const menuItems: ModuleMenuItem[] = [
  { id: "consulta-externa", label: "Consulta Externa", icon: Eye, href: "/consulta-externa" },
];

interface ViewSetting {
  id: string;
  table_id: string;
  is_enabled: boolean;
  public_token: string;
  visible_columns: string[];
  access_pin: string | null;
  created_at: string;
}

export default function ConsultaExterna() {
  const { tables, loading: tablesLoading } = useCustomTables();
  const [viewSettings, setViewSettings] = useState<ViewSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [configuringTable, setConfiguringTable] = useState<{ id: string; name: string; columns: any[] } | null>(null);
  const { toast } = useToast();

  const fetchAllViewSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('public_view_settings')
        .select('*');
      if (error) throw error;
      setViewSettings(data || []);
    } catch (err) {
      console.error('Error fetching view settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllViewSettings();
  }, []);

  const ownedTables = tables.filter(t => t.is_owner);

  const getViewSetting = (tableId: string) => viewSettings.find(v => v.table_id === tableId);

  const filteredTables = ownedTables.filter(t => 
    !searchFilter || t.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const enabledCount = ownedTables.filter(t => {
    const vs = getViewSetting(t.id);
    return vs?.is_enabled;
  }).length;

  const handleCopyLink = (token: string) => {
    const url = `https://www.tabili.com.br/visualizar/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copiado!' });
  };

  const handleOpenLink = (token: string) => {
    window.open(`https://www.tabili.com.br/visualizar/${token}`, '_blank');
  };

  return (
    <ModuleSidebarLayout moduleName="Consulta Externa" moduleIcon={Eye} menuItems={menuItems}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consulta Externa</h1>
          <p className="text-muted-foreground">Gerencie as visualizações públicas das suas tabelas</p>
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
              <p className="text-sm text-muted-foreground">Consultas ativas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-muted-foreground">{ownedTables.length - enabledCount}</div>
              <p className="text-sm text-muted-foreground">Sem consulta externa</p>
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
              const vs = getViewSetting(table.id);
              const isActive = vs?.is_enabled;

              return (
                <Card key={table.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Database className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle className="text-base">{table.name}</CardTitle>
                          <CardDescription>{table.columns.length} colunas</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <>
                            <Badge variant="default" className="gap-1">
                              <Eye className="h-3 w-3" /> Ativa
                            </Badge>
                            {vs?.access_pin && (
                              <Badge variant="outline" className="gap-1">
                                <Lock className="h-3 w-3" /> PIN
                              </Badge>
                            )}
                          </>
                        )}
                        {!isActive && (
                          <Badge variant="secondary">Inativa</Badge>
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
                        onClick={() => setConfiguringTable({
                          id: table.id,
                          name: table.name,
                          columns: table.columns.map(c => ({ name: c.name, display_name: c.display_name, column_type: c.column_type })),
                        })}
                      >
                        <Settings2 className="h-4 w-4" /> Configurar
                      </Button>
                      {isActive && vs && (
                        <>
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => handleCopyLink(vs.public_token)}>
                            <Copy className="h-4 w-4" /> Copiar Link
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => handleOpenLink(vs.public_token)}>
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
        <PublicViewDialog
          tableId={configuringTable.id}
          tableName={configuringTable.name}
          columns={configuringTable.columns}
          isOpen={!!configuringTable}
          onClose={() => {
            setConfiguringTable(null);
            fetchAllViewSettings();
          }}
        />
      )}
    </ModuleSidebarLayout>
  );
}
