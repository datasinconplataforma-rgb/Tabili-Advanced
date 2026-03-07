import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Calculator, List } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { evaluateFormula } from '@/components/FormulaEditor';
import { useTableSuggestions } from '@/hooks/useAutocompleteSuggestions';

import type { CustomColumn } from '@/hooks/useCustomTables';

type Column = CustomColumn;

interface BulkRow {
  tempId: string;
  data: Record<string, string>;
}

interface CellPosition {
  row: number;
  col: number;
}

interface BulkEntrySpreadsheetProps {
  columns: Column[];
  rows: BulkRow[];
  onRowsChange: (rows: BulkRow[]) => void;
  onRemoveRow: (tempId: string) => void;
  allTablesData?: Record<string, Record<string, string>[]>;
}

// Internal component to handle reference options fetching
function ReferenceCellEditor({ 
  value, 
  onChange, 
  targetTableId, 
  targetColumnName 
}: { 
  value: string, 
  onChange: (val: string) => void, 
  targetTableId: string, 
  targetColumnName: string 
}) {
  const { getFieldValues } = useTableSuggestions(targetTableId);
  const options = getFieldValues(targetColumnName);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 border-0 shadow-none focus:ring-0 min-w-[100px]">
        <SelectValue placeholder="Selecione..." />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function BulkEntrySpreadsheet({
  columns,
  rows,
  onRowsChange,
  onRemoveRow,
  allTablesData,
}: BulkEntrySpreadsheetProps) {
  const [selectedCells, setSelectedCells] = useState<CellPosition[]>([]);
  const [selectionStart, setSelectionStart] = useState<CellPosition | null>(null);
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  const [editValue, setEditValue] = useState('');
  const [copiedData, setCopiedData] = useState<string[][] | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const getCellKey = (row: number, col: number) => `${row}-${col}`;

  const isCellSelected = (row: number, col: number) =>
    selectedCells.some((c) => c.row === row && c.col === col);

  const getSelectionRange = (start: CellPosition, end: CellPosition): CellPosition[] => {
    const cells: CellPosition[] = [];
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        cells.push({ row: r, col: c });
      }
    }
    return cells;
  };

  const handleCellClick = (row: number, col: number, e: React.MouseEvent) => {
    if (e.shiftKey && selectionStart) {
      // Shift+Click: select range
      const range = getSelectionRange(selectionStart, { row, col });
      setSelectedCells(range);
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl+Click: toggle cell selection
      const isSelected = isCellSelected(row, col);
      if (isSelected) {
        setSelectedCells((prev) => prev.filter((c) => !(c.row === row && c.col === col)));
      } else {
        setSelectedCells((prev) => [...prev, { row, col }]);
      }
      setSelectionStart({ row, col });
    } else {
      // Normal click: select single cell
      setSelectedCells([{ row, col }]);
      setSelectionStart({ row, col });
    }
    setEditingCell(null);
  };

  const handleCellDoubleClick = (row: number, col: number) => {
    const column = columns[col];
    // Don't allow editing formula columns
    if (column?.column_type === 'formula') return;
    
    const colName = column?.name;
    if (colName && rows[row]) {
      setEditingCell({ row, col });
      setEditValue(rows[row].data[colName] || '');
      setSelectedCells([{ row, col }]);
      setSelectionStart({ row, col });
    }
  };

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    
    const colName = columns[editingCell.col]?.name;
    if (colName && rows[editingCell.row]) {
      const newRows = [...rows];
      newRows[editingCell.row] = {
        ...newRows[editingCell.row],
        data: { ...newRows[editingCell.row].data, [colName]: editValue },
      };
      onRowsChange(newRows);
    }
    setEditingCell(null);
  }, [editingCell, editValue, columns, rows, onRowsChange]);

  const moveSelection = useCallback(
    (deltaRow: number, deltaCol: number, startEditing = false) => {
      if (selectedCells.length === 0) return;

      const current = selectedCells[selectedCells.length - 1];
      let newRow = current.row + deltaRow;
      let newCol = current.col + deltaCol;

      // Wrap columns
      if (newCol < 0) {
        newCol = columns.length - 1;
        newRow = Math.max(0, newRow - 1);
      } else if (newCol >= columns.length) {
        newCol = 0;
        newRow = Math.min(rows.length - 1, newRow + 1);
      }

      // Clamp rows
      newRow = Math.max(0, Math.min(rows.length - 1, newRow));

      const newPos = { row: newRow, col: newCol };
      setSelectedCells([newPos]);
      setSelectionStart(newPos);

      if (startEditing && rows[newRow]) {
        const colName = columns[newCol]?.name;
        setEditingCell(newPos);
        setEditValue(rows[newRow].data[colName] || '');
      }
    },
    [selectedCells, columns, rows]
  );

  const handleCopy = useCallback(() => {
    if (selectedCells.length === 0) return;

    const minRow = Math.min(...selectedCells.map((c) => c.row));
    const maxRow = Math.max(...selectedCells.map((c) => c.row));
    const minCol = Math.min(...selectedCells.map((c) => c.col));
    const maxCol = Math.max(...selectedCells.map((c) => c.col));

    const data: string[][] = [];
    for (let r = minRow; r <= maxRow; r++) {
      const rowData: string[] = [];
      for (let c = minCol; c <= maxCol; c++) {
        const colName = columns[c]?.name;
        const value = colName && rows[r] ? rows[r].data[colName] || '' : '';
        rowData.push(value);
      }
      data.push(rowData);
    }

    setCopiedData(data);

    // Also copy to clipboard as tab-separated
    const clipboardText = data.map((row) => row.join('\t')).join('\n');
    navigator.clipboard.writeText(clipboardText).catch(() => {});
    
    toast({ title: 'Copiado!', description: `${selectedCells.length} célula(s)` });
  }, [selectedCells, columns, rows]);

  const handlePaste = useCallback(
    (clipboardText?: string) => {
      if (selectedCells.length === 0) return;

      const startCell = selectedCells.reduce(
        (min, c) => (c.row < min.row || (c.row === min.row && c.col < min.col) ? c : min),
        selectedCells[0]
      );

      let pasteData: string[][];

      if (clipboardText) {
        pasteData = clipboardText
          .split('\n')
          .map((row) => row.split('\t'))
          .filter((row) => row.some((cell) => cell.trim()));
      } else if (copiedData) {
        pasteData = copiedData;
      } else {
        return;
      }

      if (pasteData.length === 0) return;

      const newRows = [...rows];

      // If selection is larger than paste data, repeat paste data to fill selection
      const selMinRow = Math.min(...selectedCells.map((c) => c.row));
      const selMaxRow = Math.max(...selectedCells.map((c) => c.row));
      const selMinCol = Math.min(...selectedCells.map((c) => c.col));
      const selMaxCol = Math.max(...selectedCells.map((c) => c.col));

      const selectionHeight = selMaxRow - selMinRow + 1;
      const selectionWidth = selMaxCol - selMinCol + 1;
      const pasteHeight = pasteData.length;
      const pasteWidth = Math.max(...pasteData.map((r) => r.length));

      // Determine fill area
      const fillHeight = selectedCells.length > 1 ? selectionHeight : pasteHeight;
      const fillWidth = selectedCells.length > 1 ? selectionWidth : pasteWidth;

      // Ensure enough rows exist
      const rowsNeeded = startCell.row + fillHeight - newRows.length;
      if (rowsNeeded > 0) {
        for (let i = 0; i < rowsNeeded; i++) {
          newRows.push({
            tempId: crypto.randomUUID(),
            data: columns.reduce((acc, col) => ({ ...acc, [col.name]: '' }), {}),
          });
        }
      }

      // Fill cells
      for (let r = 0; r < fillHeight; r++) {
        for (let c = 0; c < fillWidth; c++) {
          const targetRow = startCell.row + r;
          const targetCol = startCell.col + c;

          if (targetRow < newRows.length && targetCol < columns.length) {
            const sourceRow = r % pasteHeight;
            const sourceCol = c % pasteWidth;
            const value = pasteData[sourceRow]?.[sourceCol] || '';
            const colName = columns[targetCol].name;

            newRows[targetRow] = {
              ...newRows[targetRow],
              data: { ...newRows[targetRow].data, [colName]: value.trim() },
            };
          }
        }
      }

      onRowsChange(newRows);
      toast({ title: 'Colado!', description: `${fillHeight * fillWidth} célula(s)` });
    },
    [selectedCells, copiedData, columns, rows, onRowsChange]
  );

  const handleDelete = useCallback(() => {
    if (selectedCells.length === 0) return;

    const newRows = [...rows];
    selectedCells.forEach(({ row, col }) => {
      if (newRows[row] && columns[col]) {
        const colName = columns[col].name;
        newRows[row] = {
          ...newRows[row],
          data: { ...newRows[row].data, [colName]: '' },
        };
      }
    });
    onRowsChange(newRows);
  }, [selectedCells, columns, rows, onRowsChange]);

  // Auto-select first cell when rows exist but nothing is selected
  useEffect(() => {
    if (rows.length > 0 && selectedCells.length === 0 && columns.length > 0) {
      setSelectedCells([{ row: 0, col: 0 }]);
      setSelectionStart({ row: 0, col: 0 });
    }
  }, [rows.length, columns.length]);

  // Check if spreadsheet has focus
  const [hasFocus, setHasFocus] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Global keyboard handler - only when spreadsheet has focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard events if this spreadsheet has focus
      if (!hasFocus) return;
      
      // Don't handle if editing
      if (editingCell) return;

      // Copy - only when cells are selected
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedCells.length > 0) {
          e.preventDefault();
          handleCopy();
        }
        return;
      }

      // Paste - always allow, default to first cell if nothing selected
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        // If no cells selected, select the first one
        if (selectedCells.length === 0 && rows.length > 0 && columns.length > 0) {
          setSelectedCells([{ row: 0, col: 0 }]);
          setSelectionStart({ row: 0, col: 0 });
        }
        navigator.clipboard.readText().then((text) => {
          if (text) handlePaste(text);
        }).catch(() => {
          handlePaste();
        });
        return;
      }

      // Delete/Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
        return;
      }

      // Arrow navigation
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (e.shiftKey && selectionStart && selectedCells.length > 0) {
          const last = selectedCells[selectedCells.length - 1];
          const newEnd = { row: Math.max(0, last.row - 1), col: last.col };
          setSelectedCells(getSelectionRange(selectionStart, newEnd));
        } else {
          moveSelection(-1, 0);
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (e.shiftKey && selectionStart && selectedCells.length > 0) {
          const last = selectedCells[selectedCells.length - 1];
          const newEnd = { row: Math.min(rows.length - 1, last.row + 1), col: last.col };
          setSelectedCells(getSelectionRange(selectionStart, newEnd));
        } else {
          moveSelection(1, 0);
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (e.shiftKey && selectionStart && selectedCells.length > 0) {
          const last = selectedCells[selectedCells.length - 1];
          const newEnd = { row: last.row, col: Math.max(0, last.col - 1) };
          setSelectedCells(getSelectionRange(selectionStart, newEnd));
        } else {
          moveSelection(0, -1);
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (e.shiftKey && selectionStart && selectedCells.length > 0) {
          const last = selectedCells[selectedCells.length - 1];
          const newEnd = { row: last.row, col: Math.min(columns.length - 1, last.col + 1) };
          setSelectedCells(getSelectionRange(selectionStart, newEnd));
        } else {
          moveSelection(0, 1);
        }
        return;
      }

      // Tab navigation
      if (e.key === 'Tab') {
        e.preventDefault();
        moveSelection(0, e.shiftKey ? -1 : 1);
        return;
      }

      // Enter to start editing
      if (e.key === 'Enter' && selectedCells.length === 1) {
        e.preventDefault();
        const { row, col } = selectedCells[0];
        handleCellDoubleClick(row, col);
        return;
      }

      // Start typing to edit
      if (
        selectedCells.length === 1 &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        const { row, col } = selectedCells[0];
        setEditingCell({ row, col });
        setEditValue(e.key);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    hasFocus,
    editingCell,
    selectedCells,
    selectionStart,
    columns,
    rows,
    handleCopy,
    handlePaste,
    handleDelete,
    moveSelection,
  ]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell) {
      const key = getCellKey(editingCell.row, editingCell.col);
      const input = inputRefs.current.get(key);
      if (input) {
        input.focus();
        input.select();
      }
    }
  }, [editingCell]);

  const handleInputKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
      // Move down
      const newRow = Math.min(rows.length - 1, row + 1);
      setSelectedCells([{ row: newRow, col }]);
      setSelectionStart({ row: newRow, col });
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitEdit();
      // Move right/left
      let newCol = col + (e.shiftKey ? -1 : 1);
      let newRow = row;
      if (newCol < 0) {
        newCol = columns.length - 1;
        newRow = Math.max(0, row - 1);
      } else if (newCol >= columns.length) {
        newCol = 0;
        newRow = Math.min(rows.length - 1, row + 1);
      }
      setSelectedCells([{ row: newRow, col: newCol }]);
      setSelectionStart({ row: newRow, col: newCol });
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      commitEdit();
      const delta = e.key === 'ArrowUp' ? -1 : 1;
      const newRow = Math.max(0, Math.min(rows.length - 1, row + delta));
      setSelectedCells([{ row: newRow, col }]);
      setSelectionStart({ row: newRow, col });
    }
  };

  const handleInputBlur = () => {
    commitEdit();
  };

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-4">
        Clique em um dos botões acima para adicionar linhas
      </p>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="space-y-2"
      tabIndex={0}
      onFocus={() => setHasFocus(true)}
      onBlur={(e) => {
        // Only lose focus if the new focused element is outside this container
        if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
          setHasFocus(false);
        }
      }}
    >
      <p className="text-xs text-muted-foreground px-1">
        💡 Navegue com setas • Enter/duplo-clique para editar • Shift+Click para selecionar intervalo • Ctrl+C/V para copiar/colar • Delete para limpar
      </p>
      <div className="border rounded-md overflow-x-auto">
        <table ref={tableRef} className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((col) => (
                <th key={col.id} className="px-3 py-2 text-left font-medium border-r last:border-r-0">
                  <div className="flex items-center gap-1">
                    {col.display_name}
                    {col.required && <span className="text-destructive">*</span>}
                  </div>
                </th>
              ))}
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.tempId} className="border-t">
                {columns.map((col, colIndex) => {
                  const isSelected = isCellSelected(rowIndex, colIndex);
                  const isEditing =
                    editingCell?.row === rowIndex && editingCell?.col === colIndex;
                  const cellKey = getCellKey(rowIndex, colIndex);

                  const isFormulaColumn = col.column_type === 'formula';
                  const isListColumn = col.column_type === 'list' && col.list_config?.items;
                  const isReferenceColumn = col.column_type === 'reference' && col.reference_config;

                  const handleValueChange = (value: string) => {
                    const newRows = [...rows];
                    newRows[rowIndex] = {
                      ...newRows[rowIndex],
                      data: { ...newRows[rowIndex].data, [col.name]: value },
                    };
                    onRowsChange(newRows);
                  };

                  return (
                    <td
                      key={col.id}
                      className={`px-1 py-1 border-r last:border-r-0 ${isFormulaColumn ? 'bg-muted/30' : 'cursor-cell'} ${
                        isSelected ? 'bg-primary/20 ring-2 ring-primary ring-inset' : ''
                      }`}
                      onClick={(e) => !isFormulaColumn && !isListColumn && !isReferenceColumn && handleCellClick(rowIndex, colIndex, e)}
                      onDoubleClick={() => !isFormulaColumn && !isListColumn && !isReferenceColumn && handleCellDoubleClick(rowIndex, colIndex)}
                    >
                      {isFormulaColumn && col.formula_config ? (
                        <div className="h-8 px-2 flex items-center min-w-[80px] text-primary font-medium gap-1">
                          <Calculator className="h-3 w-3" />
                          {(() => {
                            try {
                              const result = evaluateFormula(col.formula_config, row.data, allTablesData);
                              if (result !== null && result !== undefined) {
                                if (typeof result === 'number') {
                                  return new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                  }).format(result);
                                }
                                return String(result);
                              }
                              return '-';
                            } catch (err) {
                              return '-';
                            }
                          })()}
                        </div>
                      ) : isReferenceColumn && col.reference_config ? (
                        <ReferenceCellEditor
                          value={row.data[col.name] || ''}
                          onChange={handleValueChange}
                          targetTableId={col.reference_config.targetTableId}
                          targetColumnName={col.reference_config.targetColumnName}
                        />
                      ) : isListColumn ? (
                        <Select
                          value={row.data[col.name] || ''}
                          onValueChange={handleValueChange}
                        >
                          <SelectTrigger className="h-8 text-sm border-0 shadow-none focus:ring-0 min-w-[100px]">
                            <SelectValue placeholder={`Selecione...`} />
                          </SelectTrigger>
                          <SelectContent>
                            {col.list_config!.items.map((item) => (
                              <SelectItem key={item} value={item}>
                                {item}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : isEditing ? (
                        <Input
                          ref={(el) => {
                            if (el) inputRefs.current.set(cellKey, el);
                          }}
                          type={col.column_type === 'number' || col.column_type === 'currency' ? 'number' : col.column_type === 'date' ? 'date' : col.column_type === 'time' ? 'time' : col.column_type === 'email' ? 'email' : col.column_type === 'url' ? 'url' : 'text'}
                          step={col.column_type === 'currency' ? '0.01' : col.column_type === 'number' ? 'any' : undefined}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleInputKeyDown(e, rowIndex, colIndex)}
                          onBlur={handleInputBlur}
                          className="h-8 text-sm"
                        />
                      ) : (
                        <div className="h-8 px-2 flex items-center min-w-[80px] truncate">
                          {col.column_type === 'currency' && row.data[col.name]
                            ? `R$ ${parseFloat(row.data[col.name] || '0').toFixed(2)}`
                            : row.data[col.name] || ''}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="px-1 py-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onRemoveRow(row.tempId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}