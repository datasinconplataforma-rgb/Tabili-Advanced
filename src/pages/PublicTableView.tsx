import { useEffect, useState, useMemo } from 'react';
import { formatDisplayValue, formatCurrency } from '@/lib/formatters';
import { useParams } from 'react-router-dom';
import { usePublicViewData } from '@/hooks/usePublicViewData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Search, Database, Eye, AlertCircle, Lock } from 'lucide-react';

// Simple formula evaluation for public view
const evaluateFormula = (
  formulaConfig: Record<string, unknown> | null,
  rowData: Record<string, string>
): number | null => {
  if (!formulaConfig) return null;
  const { type, columns } = formulaConfig as { type: string; columns: string[] };
  if (!type || !columns || !Array.isArray(columns)) return null;
  const values = columns.map((colName) => {
    const num = parseFloat(rowData[colName]);
    return isNaN(num) ? 0 : num;
  });
  switch (type) {
    case 'sum': return values.reduce((acc, v) => acc + v, 0);
    case 'subtract': return values.reduce((acc, v, i) => (i === 0 ? v : acc - v));
    case 'multiply': return values.reduce((acc, v) => acc * v, 1);
    case 'divide': return values.reduce((acc, v, i) => (i === 0 ? v : v !== 0 ? acc / v : 0));
    case 'average': return values.length > 0 ? values.reduce((acc, v) => acc + v, 0) / values.length : 0;
    default: return null;
  }
};

const formatCellValue = (
  value: string | undefined, 
  columnType: string, 
  formulaConfig: Record<string, unknown> | null,
  rowData: Record<string, string>
): string => {
  if (columnType === 'formula' && formulaConfig) {
    const result = evaluateFormula(formulaConfig, rowData);
    if (result !== null) return formatCurrency(result);
    return '-';
  }
  if (!value) return '-';
  return formatDisplayValue(value, columnType) || '-';
};

export default function PublicTableView() {
  const { token } = useParams<{ token: string }>();
  const { viewData, loading, error, requiresPin, fetchViewByToken } = usePublicViewData();
  const [searchGlobal, setSearchGlobal] = useState('');
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinChecked, setPinChecked] = useState(false);

  useEffect(() => {
    if (token && !pinChecked) {
      // First call without PIN to check if PIN is required
      fetchViewByToken(token);
      setPinChecked(true);
    }
  }, [token, fetchViewByToken, pinChecked]);

  const handlePinSubmit = () => {
    if (pinValue.length !== 4) return;
    setPinError('');
    if (token) {
      fetchViewByToken(token, pinValue);
    }
  };

  // Show PIN error from API
  useEffect(() => {
    if (requiresPin && error && error !== 'pin_required') {
      setPinError(error);
    }
  }, [requiresPin, error]);

  const filteredData = useMemo(() => {
    if (!viewData?.data?.length) return [];
    if (!searchGlobal) return viewData.data;
    const searchLower = searchGlobal.toLowerCase();
    return viewData.data.filter((row) => 
      Object.values(row.data).some(
        (val) => String(val || '').toLowerCase().includes(searchLower)
      )
    );
  }, [viewData, searchGlobal]);

  // PIN required screen
  if (requiresPin && !viewData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-sm w-full mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Acesso Protegido</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Digite o PIN de 4 dígitos para acessar esta visualização.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <InputOTP
              maxLength={4}
              value={pinValue}
              onChange={(value) => {
                setPinValue(value);
                setPinError('');
              }}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
            {pinError && (
              <p className="text-sm text-destructive">{pinError}</p>
            )}
            <Button 
              onClick={handlePinSubmit} 
              disabled={pinValue.length !== 4 || loading}
              className="w-full"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Acessar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading && !viewData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error && !requiresPin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-lg font-semibold mb-2">Visualização Indisponível</h2>
            <p className="text-muted-foreground text-center">
              {error === 'Visualização não encontrada ou desabilitada' 
                ? 'Este link não é mais válido ou a visualização foi desabilitada pelo proprietário.'
                : error}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!viewData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">Nenhum dado encontrado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedColumns = [...viewData.columns].sort((a, b) => a.column_order - b.column_order);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">{viewData.table_name}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Visualização pública (somente leitura)
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 pb-4">
            <CardTitle className="text-lg">
              {filteredData.length} registro{filteredData.length !== 1 ? 's' : ''}
              {searchGlobal && ` (filtrado${filteredData.length !== 1 ? 's' : ''})`}
            </CardTitle>
            <div className="relative w-full sm:w-auto sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchGlobal}
                onChange={(e) => setSearchGlobal(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {viewData.data.length === 0 
                  ? 'Nenhum dado disponível nesta tabela.'
                  : 'Nenhum resultado encontrado com o filtro aplicado.'}
              </div>
            ) : (
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {sortedColumns.map((col) => (
                        <TableHead key={col.name} className="whitespace-nowrap">
                          {col.display_name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((row) => (
                      <TableRow key={row.id}>
                        {sortedColumns.map((col) => (
                          <TableCell key={col.name} className="whitespace-nowrap">
                            {formatCellValue(row.data[col.name], col.column_type, col.formula_config, row.data)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Esta é uma visualização somente leitura. Para editar os dados, acesse a plataforma.</p>
        </div>
      </main>
    </div>
  );
}
