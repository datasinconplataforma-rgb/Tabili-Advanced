import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomTable } from '@/hooks/useCustomTables';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import {
  Table2, Search, Plus, BarChart3, ArrowRightLeft,
  ChevronDown, ChevronRight, Share2, Globe, UserCircle2,
  Pencil, Copy, Trash2, MoreVertical, X
} from 'lucide-react';

interface ProjectTableActionsProps {
  table: CustomTable;
  isExpanded: boolean;
  onToggle: () => void;
  onMove: (tableId: string, tableName: string, projectId: string | null) => void;
  onShare: (table: CustomTable) => void;
  onExternalCollection: (table: CustomTable) => void;
  onEdit?: (table: CustomTable) => void;
  onDuplicate?: (table: CustomTable) => void;
  onTransfer?: (table: CustomTable) => void;
  onDelete?: (tableId: string, tableName: string) => void;
  currentProjectId: string | null;
  isSharedProject?: boolean;
}

export function ProjectTableActions({
  table,
  isExpanded,
  onToggle,
  onMove,
  onShare,
  onExternalCollection,
  onEdit,
  onDuplicate,
  onTransfer,
  onDelete,
  currentProjectId,
  isSharedProject = false,
}: ProjectTableActionsProps) {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isOwner = table.is_owner;
  const canEdit = isOwner || table.permission === 'edit' || table.permission === 'admin';

  const handleAction = (action: () => void) => {
    setDrawerOpen(false);
    action();
  };

  // Secondary actions for bottom sheet
  const secondaryActions = [
    ...(canEdit && onEdit ? [{ label: 'Editar Colunas', icon: Pencil, action: () => onEdit(table) }] : []),
    { label: 'Relatórios', icon: BarChart3, action: () => navigate('/relatorios', { state: { selectedTableId: table.id } }) },
    ...(isOwner && onDuplicate ? [{ label: 'Duplicar', icon: Copy, action: () => onDuplicate(table) }] : []),
    ...(isOwner ? [{ label: 'Compartilhar', icon: Share2, action: () => onShare(table) }] : []),
    ...(isOwner ? [{ label: 'Coleta Externa', icon: Globe, action: () => onExternalCollection(table) }] : []),
    ...(isOwner && onTransfer ? [{ label: 'Transferir', icon: ArrowRightLeft, action: () => onTransfer(table) }] : []),
    ...(isOwner && !isSharedProject ? [{ label: 'Mover p/ Projeto', icon: ArrowRightLeft, action: () => onMove(table.id, table.name, currentProjectId) }] : []),
    ...(isOwner && onDelete ? [{ label: 'Excluir', icon: Trash2, action: () => onDelete(table.id, table.name), destructive: true }] : []),
  ];

  return (
    <div className="border rounded-lg">
      <button
        className="flex items-center justify-between w-full py-2 px-3 hover:bg-muted/50 active:bg-muted/70 transition-colors rounded-lg"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
          <Table2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm truncate font-medium">{table.name}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 h-5 shrink-0">
            {table.columns.length} col
          </Badge>
          {!isOwner && (
            <Badge variant="outline" className="text-[10px] px-1.5 h-5 shrink-0">
              {table.permission === 'admin' ? 'Admin' : table.permission === 'edit' ? 'Editor' : 'Leitor'}
            </Badge>
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="flex items-center gap-1.5 px-3 pb-3 pt-1 border-t bg-muted/5">
          {/* Primary actions always visible */}
          <Button
            variant="default"
            size="sm"
            className="gap-1 text-xs h-8 flex-1 sm:flex-none rounded-lg"
            onClick={() => navigate('/consulta', { state: { selectedTableId: table.id } })}
          >
            <Search className="h-3.5 w-3.5" />
            Consulta
          </Button>
          {canEdit && (
            <Button
              variant="default"
              size="sm"
              className="gap-1 text-xs h-8 flex-1 sm:flex-none rounded-lg"
              onClick={() => navigate('/entrada', { state: { selectedTableId: table.id } })}
            >
              <Plus className="h-3.5 w-3.5" />
              Entrada
            </Button>
          )}

          {/* Desktop: show all actions inline */}
          <div className="hidden sm:flex flex-wrap gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs h-8"
              onClick={() => navigate('/relatorios', { state: { selectedTableId: table.id } })}
            >
              <BarChart3 className="h-3 w-3" />
              Relatórios
            </Button>
            {canEdit && onEdit && (
              <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={() => onEdit(table)}>
                <Pencil className="h-3 w-3" /> Editar
              </Button>
            )}
            {isOwner && onDuplicate && (
              <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={() => onDuplicate(table)}>
                <Copy className="h-3 w-3" /> Duplicar
              </Button>
            )}
            {isOwner && (
              <>
                <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={() => onShare(table)}>
                  <Share2 className="h-3 w-3" /> Compartilhar
                </Button>
                <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={() => onExternalCollection(table)}>
                  <Globe className="h-3 w-3" /> Coleta
                </Button>
              </>
            )}
            {isOwner && onTransfer && (
              <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={() => onTransfer(table)}>
                <ArrowRightLeft className="h-3 w-3" /> Transferir
              </Button>
            )}
            {isOwner && !isSharedProject && (
              <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={() => onMove(table.id, table.name, currentProjectId)}>
                <ArrowRightLeft className="h-3 w-3" /> Mover
              </Button>
            )}
            {isOwner && onDelete && (
              <Button variant="outline" size="sm" className="gap-1 text-xs h-8 text-destructive hover:text-destructive" onClick={() => onDelete(table.id, table.name)}>
                <Trash2 className="h-3 w-3" /> Excluir
              </Button>
            )}
          </div>

          {/* Mobile: three-dot menu opens bottom sheet */}
          {secondaryActions.length > 0 && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 sm:hidden shrink-0"
              onClick={() => setDrawerOpen(true)}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Bottom Sheet for mobile */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader className="pb-2">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-base">{table.name}</DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-1">
            {secondaryActions.map((item, i) => (
              <button
                key={i}
                className={`flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-muted/80 ${
                  (item as any).destructive ? 'text-destructive' : 'text-foreground'
                }`}
                onClick={() => handleAction(item.action)}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
