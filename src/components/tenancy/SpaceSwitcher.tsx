import { useState } from "react";
import { Check, ChevronsUpDown, Users, User, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useActiveSpace } from "@/hooks/useActiveSpace";
import { cn } from "@/lib/utils";
import type { SpaceSummary } from "@/lib/tenancy/spaceContext";

function iconFor(space: SpaceSummary) {
  if (space.visibility === "public") return Globe;
  if (space.visibility === "team") return Users;
  return User;
}

interface Props {
  className?: string;
}

export function SpaceSwitcher({ className }: Props) {
  const { active, available, loading, switching, setActive } = useActiveSpace();
  const [open, setOpen] = useState(false);

  const ActiveIcon = iconFor(active);
  const personal = available.filter((s) => s.isPersonal);
  const teams = available.filter((s) => !s.isPersonal);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-label="Space wechseln"
          aria-expanded={open}
          disabled={loading}
          className={cn(
            "h-8 max-w-[220px] justify-between gap-2 px-2 text-xs",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <ActiveIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{active.name}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="end">
        <Command>
          <CommandInput placeholder="Space suchen…" />
          <CommandList>
            <CommandEmpty>Kein Space gefunden.</CommandEmpty>
            {personal.length > 0 && (
              <CommandGroup heading="Persönlich">
                {personal.map((s) => (
                  <SpaceRow
                    key={s.id}
                    space={s}
                    active={s.id === active.id}
                    onSelect={() => {
                      setActive(s.id);
                      setOpen(false);
                    }}
                  />
                ))}
              </CommandGroup>
            )}
            {teams.length > 0 && (
              <CommandGroup heading="Teams">
                {teams.map((s) => (
                  <SpaceRow
                    key={s.id}
                    space={s}
                    active={s.id === active.id}
                    onSelect={() => {
                      setActive(s.id);
                      setOpen(false);
                    }}
                  />
                ))}
              </CommandGroup>
            )}
          </CommandList>
          {switching && (
            <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
              Wechsle Space…
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function SpaceRow({
  space,
  active,
  onSelect,
}: {
  space: SpaceSummary;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = iconFor(space);
  return (
    <CommandItem value={space.name} onSelect={onSelect} className="gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="flex-1 truncate">{space.name}</span>
      <Badge variant="secondary" className="h-4 px-1 text-[9px] uppercase">
        {space.visibility}
      </Badge>
      <Check
        className={cn(
          "h-3.5 w-3.5",
          active ? "opacity-100" : "opacity-0",
        )}
      />
    </CommandItem>
  );
}
