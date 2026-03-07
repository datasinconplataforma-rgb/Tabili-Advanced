import { useState } from "react";
import { useCustomTables, CustomTable } from "@/hooks/useCustomTables";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table2, ChevronRight, Search, ArrowLeft } from "lucide-react";
import { ShareTableDialog } from "@/components/ShareTableDialog";

interface ShareWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareWizard({ open, onOpenChange }: ShareWizardProps) {
  const { tables } = useCustomTables();
  const [search, setSearch] = useState("");
  const [selectedTable, setSelectedTable] = useState<CustomTable | null>(null);

  const ownedTables = tables.filter((t) => t.is_owner);
  const filtered = ownedTables.filter(
    (t) => !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSearch("");
      setSelectedTable(null);
    }, 300);
  };

  const handleSelectTable = (table: CustomTable) => {
    handleClose();
    setTimeout(() => setSelectedTable(table), 350);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
        <SheetContent side="bottom" className="sm:hidden rounded-t-2xl px-4 pb-8 pt-2">
          <SheetHeader className="pb-3">
            <SheetTitle className="text-base">Compartilhar Tabela</SheetTitle>
          </SheetHeader>

          <p className="text-xs text-muted-foreground mb-3">
            Selecione a tabela que deseja compartilhar
          </p>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tabela..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhuma tabela encontrada
                </p>
              ) : (
                filtered.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => handleSelectTable(table)}
                    className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-muted/80 active:bg-muted"
                  >
                    <Table2 className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{table.name}</span>
                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                  </button>
                ))
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ShareTableDialog
        table={selectedTable}
        isOpen={!!selectedTable}
        onClose={() => setSelectedTable(null)}
      />
    </>
  );
}
