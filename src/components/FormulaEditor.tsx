import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calculator, Plus, Table2, Hash, X, FunctionSquare, Calendar, Type, ArrowLeftRight, Search, Filter, Sigma, Sparkles } from 'lucide-react';
import { CustomTable } from '@/hooks/useCustomTables';

export interface FormulaConfig {
  expression: string;
  references: FormulaReference[];
}

export interface FormulaReference {
  alias: string;
  tableId: string;
  columnName: string;
  tableName?: string;
  columnDisplayName?: string;
}

const OPERATORS = [
  { value: '+', label: 'Soma (+)' },
  { value: '-', label: 'SubtraÃƒÂ§ÃƒÂ£o (-)' },
  { value: '*', label: 'MultiplicaÃƒÂ§ÃƒÂ£o (Ãƒâ€”)' },
  { value: '/', label: 'DivisÃƒÂ£o (ÃƒÂ·)' },
  { value: '(', label: 'Abre parÃƒÂªntese' },
  { value: ')', label: 'Fecha parÃƒÂªntese' },
  { value: ',', label: 'Separador (,)' },
];

const LOGIC_OPERATORS = [
  { value: '>', label: 'Maior que' },
  { value: '<', label: 'Menor que' },
  { value: '>=', label: 'Maior ou igual' },
  { value: '<=', label: 'Menor ou igual' },
  { value: '==', label: 'Igual (==)' },
  { value: '!=', label: 'Diferente (!=)' },
];

const BASIC_FUNCTIONS = {
  MATH: {
    label: 'MatemÃƒÂ¡tica BÃƒÂ¡sica',
    icon: Calculator,
    items: [
      { name: 'SOMA', snippet: 'SOMA([A], [B])', description: 'Soma valores', example: 'SOMA([A], [B], 10)' },
      { name: 'MEDIA', snippet: 'MEDIA([A], [B])', description: 'MÃƒÂ©dia aritmÃƒÂ©tica', example: 'MEDIA([A], [B])' },
      { name: 'ARRED', snippet: 'ARRED([A], 2)', description: 'Arredonda nÃƒÂºmero', example: 'ARRED([A], 2)' },
    ]
  },
  LOGIC: {
    label: 'LÃƒÂ³gica BÃƒÂ¡sica',
    icon: ArrowLeftRight,
    items: [
      { name: 'SE', snippet: 'SE([A] > 10, "Sim", "NÃƒÂ£o")', description: 'Condicional SE', example: 'SE([A] > 0, [A], 0)' },
    ]
  },
  TEXT: {
    label: 'Texto BÃƒÂ¡sico',
    icon: Type,
    items: [
      { name: 'CONCAT', snippet: 'CONCAT([A], " ", [B])', description: 'Junta textos', example: 'CONCAT("R$ ", [A])' },
    ]
  },
  DATE: {
    label: 'Data BÃƒÂ¡sica',
    icon: Calendar,
    items: [
      { name: 'HOJE', snippet: 'HOJE()', description: 'Data atual', example: 'HOJE()' },
      { name: 'DIAS', snippet: 'DIAS([Fim], [Inicio])', description: 'DiferenÃƒÂ§a em dias', example: 'DIAS([DataFim], [DataInicio])' },
    ]
  }
};

const ADVANCED_FUNCTIONS = {
  MATH: {
    label: 'MatemÃƒÂ¡tica AvanÃƒÂ§ada',
    icon: Calculator,
    items: [
      { name: 'MAX', snippet: 'MAX([A], [B])', description: 'Maior valor', example: 'MAX([A], [B], [C])' },
      { name: 'MIN', snippet: 'MIN([A], [B])', description: 'Menor valor', example: 'MIN([A], [B])' },
      { name: 'ABS', snippet: 'ABS([A])', description: 'Valor absoluto', example: 'ABS([A])' },
      { name: 'POTENCIA', snippet: 'POTENCIA([A], 2)', description: 'PotÃƒÂªncia (n^m)', example: 'POTENCIA([A], 2)' },
      { name: 'RAIZ', snippet: 'RAIZ([A])', description: 'Raiz quadrada', example: 'RAIZ([A])' },
      { name: 'MOD', snippet: 'MOD([A], 2)', description: 'Resto da divisÃƒÂ£o', example: 'MOD([A], 2)' },
    ]
  },
  LOGIC: {
    label: 'LÃƒÂ³gica AvanÃƒÂ§ada',
    icon: ArrowLeftRight,
    items: [
      { name: 'E', snippet: 'E([A] > 0, [B] < 10)', description: 'E lÃƒÂ³gico (AND)', example: 'E([A] > 0, [B] > 0)' },
      { name: 'OU', snippet: 'OU([A] > 0, [B] > 0)', description: 'OU lÃƒÂ³gico (OR)', example: 'OU([A] > 0, [B] > 0)' },
      { name: 'SEERRO', snippet: 'SEERRO([A] / [B], 0)', description: 'Retorna valor se erro', example: 'SEERRO([A] / [B], 0)' },
    ]
  },
  TEXT: {
    label: 'Texto AvanÃƒÂ§ado',
    icon: Type,
    items: [
      { name: 'MAIUSCULA', snippet: 'MAIUSCULA([A])', description: 'Texto em maiÃƒÂºsculas', example: 'MAIUSCULA([Nome])' },
      { name: 'MINUSCULA', snippet: 'MINUSCULA([A])', description: 'Texto em minÃƒÂºsculas', example: 'MINUSCULA([Nome])' },
      { name: 'ESQUERDA', snippet: 'ESQUERDA([A], 3)', description: 'N caracteres da esquerda', example: 'ESQUERDA([Codigo], 3)' },
      { name: 'DIREITA', snippet: 'DIREITA([A], 2)', description: 'N caracteres da direita', example: 'DIREITA([Codigo], 2)' },
      { name: 'TAMANHO', snippet: 'TAMANHO([A])', description: 'Quantidade de caracteres', example: 'TAMANHO([Nome])' },
      { name: 'SUBSTITUIR', snippet: 'SUBSTITUIR([A], "antigo", "novo")', description: 'Substitui texto', example: 'SUBSTITUIR([A], ",", ".")' },
    ]
  },
  DATE: {
    label: 'Data AvanÃƒÂ§ada',
    icon: Calendar,
    items: [
      { name: 'ANO', snippet: 'ANO([A])', description: 'Extrai o ano', example: 'ANO([Data])' },
      { name: 'MES', snippet: 'MES([A])', description: 'Extrai o mÃƒÂªs (1-12)', example: 'MES([Data])' },
      { name: 'DIA', snippet: 'DIA([A])', description: 'Extrai o dia', example: 'DIA([Data])' },
      { name: 'DIASUTEIS', snippet: 'DIASUTEIS([Inicio], [Fim])', description: 'Dias ÃƒÂºteis entre datas', example: 'DIASUTEIS([Inicio], [Fim])' },
    ]
  },
  LOOKUP: {
    label: 'Consulta (PROCV)',
    icon: Search,
    items: [
      { name: 'PROCV', snippet: 'PROCV([Valor], [Tabela], [Coluna])', description: 'Busca valor em tabela', example: 'PROCV([Codigo], "tabela_id", "nome")' },
      { name: 'INDICE', snippet: 'INDICE([Array], [Posicao])', description: 'Valor por ÃƒÂ­ndice', example: 'INDICE([A], 1)' },
    ]
  },
  AGGREGATE: {
    label: 'AgregaÃƒÂ§ÃƒÂ£o',
    icon: Sigma,
    items: [
      { name: 'CONT.SE', snippet: 'CONT.SE([A], ">0")', description: 'Conta se condiÃƒÂ§ÃƒÂ£o', example: 'CONT.SE([Status], "Ativo")' },
      { name: 'SOMASE', snippet: 'SOMASE([A], [B], ">0")', description: 'Soma se condiÃƒÂ§ÃƒÂ£o', example: 'SOMASE([Valor], [Status], "Pago")' },
      { name: 'MEDIASE', snippet: 'MEDIASE([A], [B], "Sim")', description: 'MÃƒÂ©dia se condiÃƒÂ§ÃƒÂ£o', example: 'MEDIASE([Nota], [Aprovado], "Sim")' },
    ]
  }
};

interface FormulaEditorProps {
  tables: CustomTable[];
  currentTableId?: string;
  value: FormulaConfig | null;
  onChange: (config: FormulaConfig) => void;
}

export function FormulaEditor({ tables, currentTableId, value, onChange }: FormulaEditorProps) {
  const [expression, setExpression] = useState(value?.expression || '');
  const [references, setReferences] = useState<FormulaReference[]>(value?.references || []);
  const [selectedTable, setSelectedTable] = useState<string>(currentTableId || '');
  const [isAddingRef, setIsAddingRef] = useState(false);
  const [functionLevel, setFunctionLevel] = useState<'basic' | 'advanced'>('basic');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    onChange({ expression, references });
    validateExpression();
  }, [expression, references]);

  const validateExpression = () => {
    if (!expression.trim()) {
      setValidationError(null);
      return;
    }

    const openParens = (expression.match(/\(/g) || []).length;
    const closeParens = (expression.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      setValidationError('ParÃƒÂªnteses nÃƒÂ£o balanceados');
      return;
    }

    setValidationError(null);
  };

  const getNextAlias = () => {
    const usedAliases = references.map(r => r.alias);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const letter of alphabet) {
      if (!usedAliases.includes(letter)) return letter;
    }
    return `VAR${references.length + 1}`;
  };

  const handleAddReference = (tableId: string, columnName: string) => {
    const table = tables.find(t => t.id === tableId);
    const column = table?.columns.find(c => c.name === columnName);
    
    if (!table || !column) return;

    const existing = references.find(r => r.tableId === tableId && r.columnName === columnName);
    if (existing) {
      insertInExpression(`[${existing.alias}]`);
      setIsAddingRef(false);
      return;
    }

    const newRef: FormulaReference = {
      alias: getNextAlias(),
      tableId,
      columnName,
      tableName: table.name,
      columnDisplayName: column.display_name,
    };

    setReferences([...references, newRef]);
    insertInExpression(`[${newRef.alias}]`);
    setIsAddingRef(false);
  };

  const handleRemoveReference = (alias: string) => {
    setReferences(references.filter(r => r.alias !== alias));
    setExpression(expression.replace(new RegExp(`\\[${alias}\\]`, 'gi'), ''));
  };

  const insertInExpression = (text: string) => {
    const input = document.getElementById('formula-input') as HTMLTextAreaElement;
    if (input) {
      const start = input.selectionStart || expression.length;
      const end = input.selectionEnd || expression.length;
      const newExpression = expression.substring(0, start) + text + expression.substring(end);
      setExpression(newExpression);
      
      setTimeout(() => {
        input.focus();
        const newPos = start + text.length;
        const parenIndex = text.indexOf('(');
        if (parenIndex > -1 && text.endsWith(')')) {
          const commaIndex = text.indexOf(',');
          if (commaIndex > -1) {
            input.setSelectionRange(start + parenIndex + 1, start + parenIndex + 1);
          } else {
            input.setSelectionRange(start + text.length - 1, start + text.length - 1);
          }
        } else {
          input.setSelectionRange(newPos, newPos);
        }
      }, 0);
    } else {
      setExpression(prev => prev + text);
    }
  };

  const selectedTableData = tables.find(t => t.id === selectedTable);
  const availableColumns = selectedTableData?.columns || [];
  const currentFunctions = functionLevel === 'basic' ? BASIC_FUNCTIONS : ADVANCED_FUNCTIONS;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Reference Management */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Colunas (VariÃƒÂ¡veis)</Label>
            <Popover open={isAddingRef} onOpenChange={setIsAddingRef}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 h-7 text-xs">
                  <Plus className="h-3 w-3" />
                  Adicionar
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" align="start">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tabela</Label>
                    <Select value={selectedTable} onValueChange={setSelectedTable}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tables.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            <div className="flex items-center gap-2">
                              <Table2 className="h-3 w-3" />
                              {t.name}
                              {t.id === currentTableId && (
                                <Badge variant="secondary" className="text-[10px] px-1">atual</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTable && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Colunas DisponÃƒÂ­veis</Label>
                      <ScrollArea className="h-48 border rounded-md p-1">
                        <div className="space-y-1">
                          {availableColumns.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-2 px-2">
                              Nenhuma coluna encontrada
                            </p>
                          ) : (
                            availableColumns.map(col => (
                              <Button
                                key={col.id}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start h-8 text-xs font-normal"
                                onClick={() => handleAddReference(selectedTable, col.name)}
                              >
                                <Hash className="h-3 w-3 mr-2 text-muted-foreground" />
                                <span className="truncate">{col.display_name}</span>
                                <span className="ml-auto text-[10px] text-muted-foreground opacity-70 capitalize">
                                  {col.column_type}
                                </span>
                              </Button>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <ScrollArea className="h-[120px] border rounded-md bg-muted/20 p-2">
            {references.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {references.map(ref => (
                  <Badge 
                    key={ref.alias} 
                    variant="secondary" 
                    className="gap-1 pr-1 cursor-pointer hover:bg-secondary/80 bg-background shadow-sm border"
                    onClick={() => insertInExpression(`[${ref.alias}]`)}
                    title={`Clique para inserir: ${ref.tableName}.${ref.columnDisplayName}`}
                  >
                    <span className="font-mono font-bold text-primary">[{ref.alias}]</span>
                    <span className="text-muted-foreground max-w-[80px] truncate">
                      {ref.columnDisplayName}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1 hover:bg-destructive/10 hover:text-destructive rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveReference(ref.alias);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground text-center px-4">
                <p>VocÃƒÂª pode adicionar colunas acima</p>
                <p className="mt-1 opacity-75">Ou digitar direto: <span className="font-mono">[qt] * [valor]</span></p>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Column: Functions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">FunÃƒÂ§ÃƒÂµes</Label>
            <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
              <Button
                variant={functionLevel === 'basic' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => setFunctionLevel('basic')}
              >
                <Calculator className="h-3 w-3 mr-1" />
                BÃƒÂ¡sico
              </Button>
              <Button
                variant={functionLevel === 'advanced' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => setFunctionLevel('advanced')}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                AvanÃƒÂ§ado
              </Button>
            </div>
          </div>
          
          <Tabs defaultValue={Object.keys(currentFunctions)[0]} className="w-full">
            <TabsList className="w-full grid h-8" style={{ gridTemplateColumns: `repeat(${Object.keys(currentFunctions).length}, 1fr)` }}>
              {Object.entries(currentFunctions).map(([key, category]) => {
                const Icon = category.icon;
                return (
                  <TabsTrigger key={key} value={key} className="text-xs px-0.5 py-1">
                    <Icon className="h-3 w-3" />
                  </TabsTrigger>
                );
              })}
            </TabsList>
            
            {Object.entries(currentFunctions).map(([key, category]) => (
              <TabsContent key={key} value={key} className="mt-2">
                <ScrollArea className="h-[120px] border rounded-md p-1">
                  <div className="grid grid-cols-1 gap-1">
                    {category.items.map(func => (
                      <Button
                        key={func.name}
                        variant="ghost"
                        size="sm"
                        className="justify-start h-8 text-xs font-normal"
                        onClick={() => insertInExpression(func.snippet)}
                        title={`${func.description}\nExemplo: ${func.example}`}
                      >
                        <span className="font-mono font-bold text-primary w-16">{func.name}</span>
                        <span className="text-muted-foreground truncate">{func.description}</span>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>

      {/* Operators Toolbar */}
      <div className="space-y-2 pt-2 border-t">
        <div className="flex flex-wrap gap-1">
          {OPERATORS.map(op => (
            <Button
              key={op.value}
              variant="secondary"
              size="sm"
              className="h-7 min-w-[28px] p-1 font-mono text-xs"
              onClick={() => insertInExpression(` ${op.value} `)}
              title={op.label}
            >
              {op.value}
            </Button>
          ))}
          <div className="w-px h-6 bg-border mx-1" />
          {LOGIC_OPERATORS.map(op => (
            <Button
              key={op.value}
              variant="secondary"
              size="sm"
              className="h-7 min-w-[28px] p-1 font-mono text-xs"
              onClick={() => insertInExpression(` ${op.value} `)}
              title={op.label}
            >
              {op.value}
            </Button>
          ))}
        </div>
      </div>

      {/* Expression input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">FÃƒÂ³rmula</Label>
          {validationError && (
            <span className="text-[10px] text-destructive flex items-center gap-1">
              <X className="h-3 w-3" />
              {validationError}
            </span>
          )}
        </div>
        <div className="relative">
          <FunctionSquare className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <textarea
            id="formula-input"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder={functionLevel === 'basic' 
              ? 'Ex: SOMA([A], [B]) * 0.1' 
              : 'Ex: SEERRO(PROCV([Cod], "tabela", "Nome"), "NÃƒÂ£o encontrado")'}
            className={`flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono resize-none ${
              validationError ? 'border-destructive focus-visible:ring-destructive' : 'border-input'
            }`}
          />
          <div className="absolute right-2 top-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setExpression('')}
              title="Limpar"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Preview */}
      {expression && references.length > 0 && (
        <div className="p-2 bg-muted/50 rounded-md">
          <p className="text-[10px] text-muted-foreground mb-1">VisualizaÃƒÂ§ÃƒÂ£o (com referÃƒÂªncias mapeadas):</p>
          <p className="font-mono text-[10px] break-all text-muted-foreground">
            {references.reduce((exp, ref) => 
              exp.replace(
                new RegExp(`\\[${ref.alias}\\]`, 'gi'), 
                `{${ref.columnDisplayName}}`
              ), 
              expression
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// Helper function to safely convert values for formulas
export function safeParseValue(value: any): number | string | Date {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value;
  
  const strValue = String(value).trim();
  if (strValue === '') return 0;
  
  if (strValue.includes(',') && /\d+,\d+/.test(strValue)) {
    const cleanValue = strValue.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleanValue);
    if (!isNaN(num)) return num;
  } else {
    const cleanValue = strValue.replace(/[R$\s]/g, '').replace(/,/g, ''); 
    const num = parseFloat(cleanValue);
    if (!isNaN(num)) return num;
  }
  
  return strValue;
}

// Helper function to evaluate a formula with given data
export function evaluateFormula(
  config: FormulaConfig,
  currentRowData: Record<string, string>,
  allTablesData?: Record<string, Record<string, string>[]>
): number | string | null {
  if (!config || !config.expression || config.expression.trim() === '' || !config.references) return null;

  try {
    const parseNum = (v: any): number => {
      const parsed = safeParseValue(v);
      return typeof parsed === 'number' ? parsed : 0;
    };

    const parseDate = (v: any): Date | null => {
      if (v instanceof Date) return v;
      if (!v) return null;
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    };

    // 1. Prepare Context with Helper Functions
    const context: Record<string, any> = {
      SOMA: (...args: any[]) => {
        const flatArgs = args.flat();
        return flatArgs.reduce((a, b) => a + parseNum(b), 0);
      },
      MEDIA: (...args: any[]) => {
        const flatArgs = args.flat().map(parseNum).filter(n => n !== 0 || args.length > 0);
        const sum = flatArgs.reduce((a, b) => a + b, 0);
        return flatArgs.length ? sum / flatArgs.length : 0;
      },
      MAX: (...args: any[]) => {
        const flatArgs = args.flat().map(parseNum).filter(n => !isNaN(n));
        return flatArgs.length ? Math.max(...flatArgs) : 0;
      },
      MIN: (...args: any[]) => {
        const flatArgs = args.flat().map(parseNum).filter(n => !isNaN(n));
        return flatArgs.length ? Math.min(...flatArgs) : 0;
      },
      ABS: (val: any) => Math.abs(parseNum(val)),
      ARRED: (num: any, digits: number = 0) => {
        const n = parseNum(num);
        const factor = Math.pow(10, digits);
        return Math.round(n * factor) / factor;
      },
      POTENCIA: (base: any, exp: any) => Math.pow(parseNum(base), parseNum(exp)),
      RAIZ: (num: any) => {
        const n = parseNum(num);
        return n >= 0 ? Math.sqrt(n) : null;
      },
      MOD: (num: any, divisor: any) => {
        const n = parseNum(num);
        const d = parseNum(divisor);
        return d !== 0 ? n % d : null;
      },
      SE: (condition: any, trueVal: any, falseVal: any) => condition ? trueVal : falseVal,
      E: (...args: any[]) => args.every(Boolean),
      OU: (...args: any[]) => args.some(Boolean),
      SEERRO: (value: any, fallback: any) => {
        try {
          const result = typeof value === 'function' ? value() : value;
          return result !== null && result !== undefined && !isNaN(result) ? result : fallback;
        } catch {
          return fallback;
        }
      },
      CONCAT: (...args: any[]) => args.flat().map(String).join(''),
      MAIUSCULA: (text: any) => String(text || '').toUpperCase(),
      MINUSCULA: (text: any) => String(text || '').toLowerCase(),
      ESQUERDA: (text: any, n: any) => String(text || '').substring(0, Math.max(0, parseNum(n))),
      DIREITA: (text: any, n: any) => {
        const s = String(text || '');
        return s.substring(Math.max(0, s.length - parseNum(n)));
      },
      TAMANHO: (text: any) => String(text || '').length,
      SUBSTITUIR: (text: any, oldStr: any, newStr: any) => String(text || '').split(String(oldStr || '')).join(String(newStr || '')),
      HOJE: () => new Date(),
      AGORA: () => new Date(),
      DIAS: (date1: any, date2: any) => {
        const d1 = parseDate(date1);
        const d2 = parseDate(date2);
        if (!d1 || !d2) return 0;
        return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      },
      DIASUTEIS: (start: any, end: any) => {
        const d1 = parseDate(start);
        const d2 = parseDate(end);
        if (!d1 || !d2) return 0;
        let count = 0;
        const cur = new Date(d1);
        while (cur <= d2) {
          const day = cur.getDay();
          if (day !== 0 && day !== 6) count++;
          cur.setDate(cur.getDate() + 1);
        }
        return count;
      },
      ANO: (date: any) => parseDate(date)?.getFullYear() || 0,
      MES: (date: any) => (parseDate(date)?.getMonth() || -1) + 1,
      DIA: (date: any) => parseDate(date)?.getDate() || 0,
      PROCV: (lookupValue: any, tableId: string, targetColumn: string) => {
        if (!allTablesData || !tableId || !targetColumn) return null;
        const tableData = allTablesData[tableId];
        if (!tableData || !Array.isArray(tableData)) return null;
        const found = tableData.find(row => {
          const firstKey = Object.keys(row)[0];
          return row[firstKey] === String(lookupValue);
        });
        return found ? found[targetColumn] : null;
      },
      INDICE: (array: any, index: any) => {
        if (!Array.isArray(array)) return null;
        const idx = parseNum(index) - 1;
        return idx >= 0 && idx < array.length ? array[idx] : null;
      },
      CONT: (...args: any[]) => {
        const flatArgs = args.flat();
        return flatArgs.filter(v => v !== null && v !== undefined && String(v).trim() !== '').length;
      },
      CONT_SE: (range: any, criteria: any) => {
        const arr = Array.isArray(range) ? range : [range];
        const crit = String(criteria);
        if (crit.startsWith('>=')) {
          const val = parseNum(crit.substring(2));
          return arr.filter(v => parseNum(v) >= val).length;
        } else if (crit.startsWith('<=')) {
          const val = parseNum(crit.substring(2));
          return arr.filter(v => parseNum(v) <= val).length;
        } else if (crit.startsWith('>')) {
          const val = parseNum(crit.substring(1));
          return arr.filter(v => parseNum(v) > val).length;
        } else if (crit.startsWith('<')) {
          const val = parseNum(crit.substring(1));
          return arr.filter(v => parseNum(v) < val).length;
        } else if (crit.startsWith('<>') || crit.startsWith('!=')) {
          const val = crit.substring(crit.startsWith('<>') ? 2 : 2);
          return arr.filter(v => String(v) !== val).length;
        }
        return arr.filter(v => String(v) === crit).length;
      },
      SOMASE: (sumRange: any, criteriaRange: any, criteria: any) => {
        const sumArr = Array.isArray(sumRange) ? sumRange : [sumRange];
        const critArr = Array.isArray(criteriaRange) ? criteriaRange : [criteriaRange];
        const crit = String(criteria);
        let total = 0;
        for (let i = 0; i < Math.min(sumArr.length, critArr.length); i++) {
          const matches = (() => {
            const val = String(critArr[i]);
            if (crit.startsWith('>=')) return parseNum(val) >= parseNum(crit.substring(2));
            if (crit.startsWith('<=')) return parseNum(val) <= parseNum(crit.substring(2));
            if (crit.startsWith('>')) return parseNum(val) > parseNum(crit.substring(1));
            if (crit.startsWith('<')) return parseNum(val) < parseNum(crit.substring(1));
            if (crit.startsWith('<>') || crit.startsWith('!=')) return val !== crit.substring(2);
            return val === crit;
          })();
          if (matches) total += parseNum(sumArr[i]);
        }
        return total;
      },
      MEDIASE: (avgRange: any, criteriaRange: any, criteria: any) => {
        const avgArr = Array.isArray(avgRange) ? avgRange : [avgRange];
        const critArr = Array.isArray(criteriaRange) ? criteriaRange : [criteriaRange];
        const crit = String(criteria);
        let total = 0;
        let count = 0;
        for (let i = 0; i < Math.min(avgArr.length, critArr.length); i++) {
          const matches = (() => {
            const val = String(critArr[i]);
            if (crit.startsWith('>=')) return parseNum(val) >= parseNum(crit.substring(2));
            if (crit.startsWith('<=')) return parseNum(val) <= parseNum(crit.substring(2));
            if (crit.startsWith('>')) return parseNum(val) > parseNum(crit.substring(1));
            if (crit.startsWith('<')) return parseNum(val) < parseNum(crit.substring(1));
            if (crit.startsWith('<>') || crit.startsWith('!=')) return val !== crit.substring(2);
            return val === crit;
          })();
          if (matches) {
            total += parseNum(avgArr[i]);
            count++;
          }
        }
        return count > 0 ? total / count : 0;
      },
    };

    const vars: Record<string, any> = {};
    
    for (const ref of (config.references || [])) {
      let rawValue: any = '';
      // Check if this column exists in the current row (same-table reference)
      if (ref.columnName in currentRowData || currentRowData[ref.columnName] !== undefined) {
        rawValue = currentRowData[ref.columnName] ?? '';
      } else if (allTablesData && allTablesData[ref.tableId]) {
        // Cross-table reference: get all values from referenced table
        const rows = allTablesData[ref.tableId];
        rawValue = rows.map(r => r[ref.columnName]);
      }
      vars[ref.alias] = Array.isArray(rawValue) ? rawValue.map(v => safeParseValue(v)) : safeParseValue(rawValue);
    }

    let jsExpression = config.expression;

    // Remove referÃƒÂªncias invÃƒÂ¡lidas com ponto como CONT.SE para CONT_SE antes do eval
    jsExpression = jsExpression.replace(/CONT\.SE/gi, 'CONT_SE');
    jsExpression = jsExpression.replace(/(\d),(\d)/g, '$1.$2');
    jsExpression = jsExpression.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
    jsExpression = jsExpression.replace(/\]\s*x\s*\[/gi, '] * [');
    jsExpression = jsExpression.replace(/\s+x\s+/gi, ' * ');

    const sortedAliases = (config.references || []).map(r => r.alias).sort((a, b) => b.length - a.length);
    for (const alias of sortedAliases) {
       jsExpression = jsExpression.replace(new RegExp(`\\[${alias}\\]`, 'gi'), `vars['${alias}']`);
    }
    
    jsExpression = jsExpression.replace(/\[(.*?)]|\{(.*?)\}/g, (match, innerSquare, innerCurly) => {
        const rawText = (innerSquare || innerCurly || '').trim();
        const cleanText = rawText.toLowerCase();
        const normalizedText = rawText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

        const rowKey = Object.keys(currentRowData).find(k =>
            k.toLowerCase() === cleanText ||
            k.toLowerCase() === normalizedText ||
            k === rawText
        );

        if (rowKey) {
            const dynamicAlias = 'DYN_' + rowKey;
            vars[dynamicAlias] = safeParseValue(currentRowData[rowKey]);
            return `vars['${dynamicAlias}']`;
        }
        return '0'; 
    });

    const funcKeys = Object.keys(context);
    const funcValues = Object.values(context);
    
    // Evitar duplicidade de nomes de funÃƒÂ§ÃƒÂµes ("E" minÃƒÂºsculo vira "e", mas capitalizado fica "E" de novo gerando conflito)
    const uniqueKeys = new Set<string>();
    const finalFuncKeys: string[] = [];
    const finalFuncValues: any[] = [];

    const addFunc = (key: string, val: any) => {
      if (!uniqueKeys.has(key)) {
        uniqueKeys.add(key);
        finalFuncKeys.push(key);
        finalFuncValues.push(val);
      }
    };

    funcKeys.forEach((key, index) => {
      addFunc(key, funcValues[index]);
      addFunc(key.toLowerCase(), funcValues[index]);
      addFunc(key.charAt(0).toUpperCase() + key.slice(1).toLowerCase(), funcValues[index]);
    });
    
    const evaluator = new Function(
      'vars',
      ...finalFuncKeys,
      `"use strict"; return (${jsExpression});`
    );
    
    const result = evaluator(vars, ...finalFuncValues);
    
    if (typeof result === 'number') {
      return isFinite(result) ? result : 0;
    }
    if (result instanceof Date) {
      return result.toISOString().split('T')[0];
    }
    if (typeof result === 'function' || (typeof result === 'object' && result !== null)) {
      return null;
    }
    
    return result;

  } catch (error: any) {
    console.error('Formula evaluation error:', error, 'Expression:', config.expression);
    return `Erro na fÃƒÂ³rmula! (${error.message})`;
  }
};