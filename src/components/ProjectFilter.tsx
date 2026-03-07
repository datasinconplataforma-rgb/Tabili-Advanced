import { useState, useMemo } from 'react';
import { useTableProjects } from '@/hooks/useTableProjects';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderOpen, Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProjectFilterProps {
  value: string;
  onChange: (value: string) => void;
}

const OPTIONS_PREFIX = [
  { value: '__all__', label: 'Todos os projetos' },
  { value: '__none__', label: 'Sem projeto' },
];

export function ProjectFilter({ value, onChange }: ProjectFilterProps) {
  const { projects, loading } = useTableProjects();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })),
    [projects]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedProjects;
    return sortedProjects.filter((p) => p.name.toLowerCase().includes(q));
  }, [sortedProjects, search]);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return OPTIONS_PREFIX;
    return OPTIONS_PREFIX.filter((o) => o.label.toLowerCase().includes(q));
  }, [search]);

  if (loading || projects.length === 0) return null;

  const selectedLabel =
    OPTIONS_PREFIX.find((o) => o.value === value)?.label ??
    projects.find((p) => p.id === value)?.name ??
    'Todos os projetos';

  return (
    <div className="flex items-center gap-2 w-full">
      <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full sm:w-[200px] justify-between font-normal"
          >
            <span className="truncate">{selectedLabel}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[260px] p-0" align="start">
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder="Buscar projeto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <ScrollArea className="max-h-[240px]">
            <div className="p-1">
              {filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground',
                    value === opt.value && 'bg-accent text-accent-foreground'
                  )}
                  onClick={() => { onChange(opt.value); setOpen(false); setSearch(''); }}
                >
                  <Check className={cn('h-4 w-4 shrink-0', value === opt.value ? 'opacity-100' : 'opacity-0')} />
                  {opt.label}
                </button>
              ))}
              {filtered.length > 0 && filteredOptions.length > 0 && (
                <div className="-mx-1 my-1 h-px bg-border" />
              )}
              {filtered.map((p) => (
                <button
                  key={p.id}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground',
                    value === p.id && 'bg-accent text-accent-foreground'
                  )}
                  onClick={() => { onChange(p.id); setOpen(false); setSearch(''); }}
                >
                  <Check className={cn('h-4 w-4 shrink-0', value === p.id ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
              {filteredOptions.length === 0 && filtered.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">Nenhum resultado</p>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
