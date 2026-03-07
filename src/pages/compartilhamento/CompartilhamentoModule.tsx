import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ModuleSidebarLayout, ModuleMenuItem } from '@/components/ModuleSidebarLayout';
import { useCustomTables } from '@/hooks/useCustomTables';
import { SharingManagementTab } from '@/components/administrador/SharingManagementTab';
import { PublicViewDialog } from '@/components/PublicViewDialog';
import { ExternalCollectionDialog } from '@/components/ExternalCollectionDialog';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Share2, Eye, Globe, Search, ExternalLink, Copy, Settings2, Loader2, Database, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const menuItems: ModuleMenuItem[] = [
  { id: "compartilhamento", label: "Compartilhamento", icon: Share2, href: "/compartilhamento" },
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

interface CollectionSetting {
  id: string;
  table_id: string;
  is_enabled: boolean;
  public_token: string;
  allow_multiple_submissions: boolean;
  respondent_field_label: string;
}

export default function CompartilhamentoModule() {
  const location = useLocation();
  const { tables, loading: tablesLoading } = useCustomTables();
  const [viewSettings, setViewSettings] = useState<ViewSetting[]>([]);
  const [collectionSettings, setCollectionSettings] = useState<CollectionSetting[]>([]);
  const [loadingViews, setLoadingViews] = useState(true);
  const [loadingForms, setLoadingForms] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [configuringView, setConfiguringView] = useState<{ id: string; name: string; columns: any[] } | null>(null);
  const [configuringForm, setConfiguringForm] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  const fetchViewSettings = async () => {
    setLoadingViews(true);
    try {
      const { data, error } = await supabase.from('public_view_settings').select('*');
      if (error) throw error;
      setViewSettings(data || []);
    } catch (err) {
      console.error('Error fetching view settings:', err);
    } finally {
      setLoadingViews(false);
    }
  };

  const fetchCollectionSettings = async () => {
    setLoadingForms(true);
    try {
      const { data, error } = await supabase.from('external_collection_settings').select('*');
      if (error) throw error;
      setCollectionSettings(data || []);
    } catch (err) {
      console.error('Error fetching collection settings:', err);
    } finally {
      setLoadingForms(false);
    }
  };

  useEffect(() => {
    fetchViewSettings();
    fetchCollectionSettings();
  }, []);

  // Handle incoming state from CreateFormWizard
  useEffect(() => {
    const state = location.state as { openFormForTable?: string; tableName?: string } | null;
    if (state?.openFormForTable && !tablesLoading) {
      const table = tables.find(t => t.id === state.openFormForTable);
      const name = table?.name || state.tableName || '';
      if (name) {
        setConfiguringForm({ id: state.openFormForTable, name });
      }
      // Clear state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state, tablesLoading, tables]);

  const ownedTables = tables.filter(t => t.is_owner);
  const getViewSetting = (tableId: string) => viewSettings.find(v => v.table_id === tableId);
  const getCollectionSetting = (tableId: string) => collectionSettings.find(c => c.table_id === tableId);

  const filteredTables = ownedTables.filter(t =>
    !searchFilter || t.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleCopyViewLink = (token: string) => {
    navigator.clipboard.writeText(`https://www.tabili.com.br/visualizar/${token}`);
    toast({ title: 'Link copiado!' });
  };

  const handleCopyFormLink = (token: string) => {
    navigator.clipboard.writeText(`https://www.tabili.com.br/formulario/${token}`);
    toast({ title: 'Link copiado!' });
  };

  const viewEnabledCount = ownedTables.filter(t => getViewSetting(t.id)?.is_enabled).length;
  const formEnabledCount = ownedTables.filter(t => getCollectionSetting(t.id)?.is_enabled).length;

  return (
    <ModuleSidebarLayout moduleName="Compartilhamento" moduleIcon={Share2} menuItems={menuItems}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compartilhamento</h1>
          <p className="text-muted-foreground">Gerencie permissões, consultas externas e formulários públicos</p>
        </div>

        <Tabs defaultValue="compartilhamentos" className="w-full">
          <TabsList>
            <TabsTrigger value="compartilhamentos" className="gap-1.5">
              <Share2 className="h-4 w-4" />
              Compartilhamentos
            </TabsTrigger>
            <TabsTrigger value="consulta-externa" className="gap-1.5">
              <Eye className="h-4 w-4" />
              Consulta Externa
            </TabsTrigger>
            <TabsTrigger value="formulario-externo" className="gap-1.5">
              <Globe className="h-4 w-4" />
              Formulário Externo
            </TabsTrigger>
          </TabsList>

          {/* Tab: Compartilhamentos */}
          <TabsContent value="compartilhamentos">
            <SharingManagementTab />
          </TabsContent>

          {/* Tab: Consulta Externa */}
          <TabsContent value="consulta-externa" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{ownedTables.length}</div>
                  <p className="text-sm text-muted-foreground">Tabelas próprias</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-primary">{viewEnabledCount}</div>
                  <p className="text-sm text-muted-foreground">Consultas ativas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-muted-foreground">{ownedTables.length - viewEnabledCount}</div>
                  <p className="text-sm text-muted-foreground">Sem consulta externa</p>
                </CardContent>
              </Card>
            </div>

            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Filtrar tabelas..." value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} className="pl-9" />
            </div>

            {tablesLoading || loadingViews ? (
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
                                <Badge variant="default" className="gap-1"><Eye className="h-3 w-3" /> Ativa</Badge>
                                {vs?.access_pin && <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> PIN</Badge>}
                              </>
                            )}
                            {!isActive && <Badge variant="secondary">Inativa</Badge>}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => setConfiguringView({
                            id: table.id,
                            name: table.name,
                            columns: table.columns.map(c => ({ name: c.name, display_name: c.display_name, column_type: c.column_type })),
                          })}>
                            <Settings2 className="h-4 w-4" /> Configurar
                          </Button>
                          {isActive && vs && (
                            <>
                              <Button variant="outline" size="sm" className="gap-1" onClick={() => handleCopyViewLink(vs.public_token)}>
                                <Copy className="h-4 w-4" /> Copiar Link
                              </Button>
                              <Button variant="outline" size="sm" className="gap-1" onClick={() => window.open(`https://www.tabili.com.br/visualizar/${vs.public_token}`, '_blank')}>
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
          </TabsContent>

          {/* Tab: Formulário Externo */}
          <TabsContent value="formulario-externo" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{ownedTables.length}</div>
                  <p className="text-sm text-muted-foreground">Tabelas próprias</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-primary">{formEnabledCount}</div>
                  <p className="text-sm text-muted-foreground">Formulários ativos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-muted-foreground">{ownedTables.length - formEnabledCount}</div>
                  <p className="text-sm text-muted-foreground">Sem formulário externo</p>
                </CardContent>
              </Card>
            </div>

            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Filtrar tabelas..." value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} className="pl-9" />
            </div>

            {tablesLoading || loadingForms ? (
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
                  const cs = getCollectionSetting(table.id);
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
                              <Badge variant="default" className="gap-1"><Globe className="h-3 w-3" /> Ativo</Badge>
                            ) : (
                              <Badge variant="secondary">Inativo</Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => setConfiguringForm({ id: table.id, name: table.name })}>
                            <Settings2 className="h-4 w-4" /> Configurar
                          </Button>
                          {isActive && cs && (
                            <>
                              <Button variant="outline" size="sm" className="gap-1" onClick={() => handleCopyFormLink(cs.public_token)}>
                                <Copy className="h-4 w-4" /> Copiar Link
                              </Button>
                              <Button variant="outline" size="sm" className="gap-1" onClick={() => window.open(`https://www.tabili.com.br/formulario/${cs.public_token}`, '_blank')}>
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
          </TabsContent>
        </Tabs>
      </div>

      {configuringView && (
        <PublicViewDialog
          tableId={configuringView.id}
          tableName={configuringView.name}
          columns={configuringView.columns}
          isOpen={!!configuringView}
          onClose={() => { setConfiguringView(null); fetchViewSettings(); }}
        />
      )}

      {configuringForm && (
        <ExternalCollectionDialog
          tableId={configuringForm.id}
          tableName={configuringForm.name}
          isOpen={!!configuringForm}
          onClose={() => { setConfiguringForm(null); fetchCollectionSettings(); }}
        />
      )}
    </ModuleSidebarLayout>
  );
}
