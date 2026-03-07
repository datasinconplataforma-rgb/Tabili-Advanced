import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCustomTables } from "@/hooks/useCustomTables";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Table2, Plus, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CreateTableDialog } from "@/components/CreateTableDialog";

interface CreateFormWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateFormWizard({ open, onOpenChange }: CreateFormWizardProps) {
  const navigate = useNavigate();
  const { tables, createTable } = useCustomTables();
  const [step, setStep] = useState<"choose" | "select-table">("choose");
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const ownedTables = tables.filter((t) => t.is_owner);
  const filtered = ownedTables.filter(
    (t) => !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("choose");
      setSearch("");
    }, 300);
  };

  const handleSelectTable = (tableId: string, tableName: string) => {
    handleClose();
    navigate("/compartilhamento", {
      state: { openFormForTable: tableId, tableName },
    });
  };

  const handleCreateNew = () => {
    handleClose();
    setTimeout(() => setShowCreateDialog(true), 350);
  };

  const handleTableCreated = async (
    name: string,
    columns: Parameters<typeof createTable>[1]
  ) => {
    const tableId = await createTable(name, columns);
    if (tableId) {
      setShowCreateDialog(false);
      navigate("/compartilhamento", {
        state: { openFormForTable: tableId, tableName: name },
      });
    }
    return tableId;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
        <SheetContent side="bottom" className="sm:hidden rounded-t-2xl px-4 pb-8 pt-2">
          <SheetHeader className="pb-3">
            <SheetTitle className="text-base">
              {step === "choose" ? "Criar Formulário" : "Selecionar Tabela"}
            </SheetTitle>
          </SheetHeader>

          {step === "choose" && (
            <div className="space-y-2">
              <button
                onClick={() => setStep("select-table")}
                className="flex items-center gap-3 w-full rounded-xl border border-border bg-muted/40 p-4 transition-colors active:bg-muted"
              >
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                  <Table2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">Tabela existente</p>
                  <p className="text-xs text-muted-foreground">
                    Usar uma tabela já criada
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>

              <button
                onClick={handleCreateNew}
                className="flex items-center gap-3 w-full rounded-xl border border-border bg-muted/40 p-4 transition-colors active:bg-muted"
              >
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">Criar nova tabela</p>
                  <p className="text-xs text-muted-foreground">
                    Criar tabela e configurar formulário
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          )}

          {step === "select-table" && (
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
                      onClick={() => handleSelectTable(table.id, table.name)}
                      className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-muted/80 active:bg-muted"
                    >
                      <Table2 className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{table.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {table.columns.length} col
                      </span>
                    </button>
                  ))
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setStep("choose")}
              >
                Voltar
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <CreateTableDialog
        onCreateTable={handleTableCreated}
        externalOpen={showCreateDialog}
        onExternalOpenChange={setShowCreateDialog}
      />
    </>
  );
}
