import { useState, useEffect, useCallback, memo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow, differenceInHours, isPast, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Trash2, FolderKanban, Timer, AlertCircle, Paperclip, Download, Copy, Edit2, Check, X, History, Play, CheckCircle, MoreVertical, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DeadlinePicker } from './DeadlinePicker';
import { PomodoroTimer } from './PomodoroTimer';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SwipeableCard } from './SwipeableCard';

const TOOL_ICONS: Record<string, string> = {
  lovable: '🚀',
  chatgpt: '🤖',
  claude: '🔮',
  figma: '🎨',
  notion: '📝',
  linear: '📊',
  github: '💻',
};

interface ImpulseCardProps {
  impulse: {
    id: string;
    content: string;
    tags: string[];
    status: string;
    project_id?: string | null;
    created_at: string;
    due_date?: string | null;
    tool?: string | null;
    is_focus_block?: boolean;
    attachments?: Array<{
      name: string;
      path: string;
      type: string;
      size: number;
    }>;
  };
  onDelete?: (id: string) => void;
  onUpdate?: () => void;
  searchTerm?: string;
  isSprintMode?: boolean;
  isHighlighted?: boolean;
  isTouchDevice?: boolean;
}

function highlightText(text: string, searchTerm?: string) {
  if (!searchTerm) return text;
  
  const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
  return parts.map((part, i) => 
    part.toLowerCase() === searchTerm.toLowerCase() 
      ? <mark key={i} className="bg-primary/20 text-foreground font-semibold rounded px-1">{part}</mark>
      : part
  );
}

export const ImpulseCard = memo(function ImpulseCard({ impulse, onDelete, onUpdate, searchTerm, isSprintMode = false, isHighlighted = false, isTouchDevice = false }: ImpulseCardProps) {
  const isUnprocessed = impulse.status === 'unprocessed';
  const isInProgress = impulse.status === 'in-progress';
  const [projects, setProjects] = useState<any[]>([]);
  const [showProjectSelect, setShowProjectSelect] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(impulse.content);
  const [history, setHistory] = useState<Array<{ id: string; old_content: string; changed_at: string }>>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const dueDate = impulse.due_date ? new Date(impulse.due_date) : null;
  const isDone = impulse.status === 'done';
  const isOverdue = dueDate && !isDone ? isPast(dueDate) : false;
  const isUrgent = dueDate && !isDone ? differenceInHours(dueDate, new Date()) < 24 && differenceInHours(dueDate, new Date()) >= 0 : false;

  useEffect(() => {
    if (showProjectSelect) {
      fetchProjects();
    }
  }, [showProjectSelect]);

  useEffect(() => {
    fetchHistory();
  }, [impulse.id]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      console.error('Fehler beim Laden der Projekte:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('impulse_history')
        .select('*')
        .eq('impulse_id', impulse.id)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      console.error('Fehler beim Laden der Historie:', error);
    }
  };

  const handleSaveEdit = useCallback(async () => {
    if (!editedContent.trim()) {
      toast.error('Inhalt darf nicht leer sein');
      return;
    }

    try {
      // Save old content to history
      const { error: historyError } = await supabase
        .from('impulse_history')
        .insert({
          impulse_id: impulse.id,
          old_content: impulse.content
        });

      if (historyError) throw historyError;

      // Update impulse
      const { error } = await supabase
        .from('impulses')
        .update({ content: editedContent })
        .eq('id', impulse.id);

      if (error) throw error;

      toast.success('Impuls aktualisiert');
      setIsEditing(false);
      fetchHistory();
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error('Fehler beim Speichern');
    }
  }, [editedContent, impulse.id, impulse.content, onUpdate]);

  const handleCancelEdit = () => {
    setEditedContent(impulse.content);
    setIsEditing(false);
  };

  const handleProjectAssign = useCallback(async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('impulses')
        .update({ project_id: projectId === 'none' ? null : projectId })
        .eq('id', impulse.id);

      if (error) throw error;

      toast.success('Projekt zugewiesen');
      setShowProjectSelect(false);
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error('Projekt konnte nicht zugewiesen werden');
    }
  }, [impulse.id, onUpdate]);

  const handleDeadlineChange = useCallback(async (date: Date | undefined) => {
    try {
      const { error } = await supabase
        .from('impulses')
        .update({ due_date: date ? date.toISOString() : null })
        .eq('id', impulse.id);

      if (error) throw error;

      toast.success(date ? 'Deadline gesetzt' : 'Deadline entfernt');
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error('Deadline konnte nicht gespeichert werden');
    }
  }, [impulse.id, onUpdate]);

  const handleDownloadAttachment = async (attachment: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('impulse-attachments')
        .download(attachment.path);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error('Download fehlgeschlagen');
    }
  };

  const handleQuickStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('impulses')
        .update({ status: newStatus })
        .eq('id', impulse.id);

      if (error) throw error;

      if (newStatus === 'done') {
        toast.success('🎉 Aufgabe erledigt!');
      } else {
        toast.success('⏸️ In Arbeit verschoben');
      }
      
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error('Status konnte nicht aktualisiert werden');
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(impulse.content);
      toast.success('✅ In Zwischenablage kopiert');
    } catch (error: any) {
      toast.error('❌ Kopieren fehlgeschlagen');
    }
  };

  const handleNextStep = async () => {
    let newStatus = impulse.status;
    let message = '';

    if (impulse.status === 'unprocessed') {
      newStatus = 'in-progress';
      message = '▶️ Nach "In Arbeit" verschoben';
    } else if (impulse.status === 'in-progress') {
      newStatus = 'done';
      message = '✅ Als erledigt markiert';
    }

    if (newStatus === impulse.status) return;

    try {
      const { error } = await supabase
        .from('impulses')
        .update({ status: newStatus })
        .eq('id', impulse.id);

      if (error) throw error;

      toast.success(message);
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error('Status konnte nicht aktualisiert werden');
    }
  };

  const handleMarkAsDone = async () => {
    if (impulse.status === 'done') return;

    try {
      const { error } = await supabase
        .from('impulses')
        .update({ status: 'done' })
        .eq('id', impulse.id);

      if (error) throw error;

      toast.success('✅ Als erledigt markiert');
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error('Status konnte nicht aktualisiert werden');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === impulse.status) return;

    try {
      const { error } = await supabase
        .from('impulses')
        .update({ status: newStatus })
        .eq('id', impulse.id);

      if (error) throw error;

      const statusLabels: Record<string, string> = {
        'unprocessed': 'Impulse & Ideen',
        'in-progress': 'In Arbeit',
        'done': 'Erledigt'
      };

      toast.success(`Status geändert zu "${statusLabels[newStatus]}"`);
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error('Status konnte nicht aktualisiert werden');
    }
  };

  const handleToggleFocusBlock = async () => {
    try {
      const newValue = !impulse.is_focus_block;
      const { error } = await supabase
        .from('impulses')
        .update({ is_focus_block: newValue })
        .eq('id', impulse.id);

      if (error) throw error;

      toast.success(newValue ? '⏱️ Als 10-Minuten-Block markiert' : '⏱️ Focus-Block entfernt');
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error('Focus-Block konnte nicht aktualisiert werden');
    }
  };

  const handleArchive = async () => {
    try {
      const { error } = await supabase
        .from('impulses')
        .update({ is_archived: true })
        .eq('id', impulse.id);

      if (error) throw error;

      toast.success('📦 Impuls archiviert');
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error('Fehler beim Archivieren');
      console.error(error);
    }
  };

  const handleDeleteImpulse = async () => {
    try {
      const { error } = await supabase
        .from('impulses')
        .delete()
        .eq('id', impulse.id);

      if (error) throw error;

      toast.success('🗑️ Impuls gelöscht');
      if (onUpdate) onUpdate();
      if (onDelete) onDelete(impulse.id);
    } catch (error: any) {
      toast.error('Fehler beim Löschen');
      console.error(error);
    }
  };

  return (
    <>
      <SwipeableCard
        onArchive={handleArchive}
        onDelete={handleDeleteImpulse}
      >
      <Card
        className={`p-4 transition-all hover:shadow-lg flex flex-col ${
          isExpanded ? 'h-auto' : 'min-h-[320px]'
        } ${isUnprocessed ? 'border-l-4 border-l-secondary' : ''} ${
          isOverdue ? 'border-l-4 border-l-destructive' : ''
        } ${isUrgent ? 'border-l-4 border-l-yellow-500' : ''
        } ${isHighlighted ? 'ring-4 ring-primary ring-offset-2 ring-offset-background animate-pulse shadow-2xl shadow-primary/50' : ''}`}
      >{/* Erhöht von min-h-[280px] auf min-h-[320px] für vollständige Button-Anzeige */}
        {isHighlighted && (
          <div className="mb-3 flex items-center gap-2 bg-primary/10 text-primary px-3 py-2 rounded-md">
            <span className="text-lg">🎯</span>
            <span className="text-xs font-semibold">TOP PRIORITÄT - Größter Impact</span>
          </div>
        )}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[100px]"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="h-8"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Speichern
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="h-8"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Abbrechen
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex-shrink-0">
                  <p className={cn(
                    "text-xs text-foreground leading-relaxed",
                    !isExpanded && "line-clamp-3"
                  )}>
                    {highlightText(impulse.content, searchTerm)}
                  </p>
                  {impulse.content.length > 150 && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-xs text-primary hover:underline mt-1"
                    >
                      {isExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
                    </button>
                  )}
                </div>
                
                <div className="mt-auto pt-2">
                  <div className="flex flex-wrap items-center gap-2">
              {impulse.tool && (
                <Badge variant="outline" className="text-xs gap-1 border-primary/50">
                  <span>{TOOL_ICONS[impulse.tool]}</span>
                  <span className="capitalize">{impulse.tool}</span>
                </Badge>
              )}
              {impulse.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {impulse.attachments && impulse.attachments.length > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Paperclip className="h-3 w-3" />
                  {impulse.attachments.length}
                </Badge>
              )}
              {dueDate && (
                <Badge 
                  variant={isOverdue ? 'destructive' : isUrgent ? 'default' : 'outline'}
                  className={cn(
                    "text-xs gap-1",
                    isUrgent && "bg-yellow-500 text-black hover:bg-yellow-600"
                  )}
                >
                  <AlertCircle className="h-3 w-3" />
                  {format(dueDate, 'dd.MM.yyyy', { locale: de })}
                </Badge>
              )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(impulse.created_at), { 
                        addSuffix: true,
                        locale: de 
                      })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Attachments */}
            {impulse.attachments && impulse.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {impulse.attachments.map((attachment, index) => (
                  <button
                    key={index}
                    onClick={() => handleDownloadAttachment(attachment)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">{attachment.name}</span>
                  </button>
                ))}
              </div>
            )}

          {/* History Section */}
          {history.length > 0 && !isEditing && (
            <Collapsible open={showHistory} onOpenChange={setShowHistory}>
              <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <History className="h-3 w-3" />
                Verlauf ({history.length})
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border border-border"
                  >
                    <p className="line-through">{entry.old_content}</p>
                    <p className="text-[10px] mt-1">
                      {formatDistanceToNow(new Date(entry.changed_at), {
                        addSuffix: true,
                        locale: de,
                      })}
                    </p>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="flex-shrink-0 pt-3 mt-auto border-t border-border">
          {/* Sprint Mode Quick Actions */}
          {isSprintMode && impulse.status !== 'done' && (
            <div className="flex gap-2 mb-2">
              {impulse.status !== 'in-progress' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickStatusChange('in-progress');
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex-1"
                >
                  ⏸️ Weitermachen
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickStatusChange('done');
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex-1 bg-[#4ADE80] hover:bg-[#4ADE80]/90 text-black"
              >
                ✅ Erledigt
              </Button>
            </div>
          )}

          {!isSprintMode && showProjectSelect ? (
            <Select onValueChange={handleProjectAssign}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Projekt auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kein Projekt</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : !isSprintMode ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowProjectSelect(true)}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-full"
            >
              <FolderKanban className="h-4 w-4 mr-2" />
              {impulse.project_id ? 'Projekt ändern' : 'Zu Projekt hinzufügen'}
            </Button>
          ) : null}

          {/* Quick Actions */}
          <div className="flex gap-1 pt-2">
            {/* Focus Block Button - 10-Minute Task Marker */}
            <Button
              variant={impulse.is_focus_block ? "default" : "ghost"}
              size={isTouchDevice ? "default" : "sm"}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFocusBlock();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className={cn(
                impulse.is_focus_block 
                  ? "bg-[#A855F7] hover:bg-[#A855F7]/90 text-white" 
                  : "hover:bg-accent",
                isTouchDevice ? "h-12 w-12 p-0" : "h-8 w-8 p-0"
              )}
              title="10-Minuten-Block"
            >
              <Clock className={cn(isTouchDevice ? "h-5 w-5" : "h-4 w-4")} />
            </Button>

            {/* Copy Button - Direct Access */}
            <Button
              variant="ghost"
              size={isTouchDevice ? "default" : "sm"}
              onClick={(e) => {
                e.stopPropagation();
                handleCopyToClipboard();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className={cn(
                "hover:bg-accent",
                isTouchDevice ? "h-12 w-12 p-0" : "h-8 w-8 p-0"
              )}
              title="Kopieren"
            >
              <Copy className={cn(isTouchDevice ? "h-5 w-5" : "h-4 w-4")} />
            </Button>

            {/* Next Step Icon - Primary Action - More prominent on touch */}
            {impulse.status !== 'done' && (
              <Button
                variant={isTouchDevice ? "default" : "ghost"}
                size={isTouchDevice ? "default" : "sm"}
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextStep();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className={cn(
                  isTouchDevice 
                    ? "h-12 min-w-[120px] gap-2 bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "h-8 w-8 p-0 hover:bg-accent"
                )}
                title="Nächster Schritt"
              >
                <Play className={cn(isTouchDevice ? "h-5 w-5" : "h-4 w-4")} />
                {isTouchDevice && <span className="text-sm font-medium">Weiter</span>}
              </Button>
            )}

            {/* Mark as Done - Touch optimized button */}
            {isTouchDevice && impulse.status !== 'done' && (
              <Button
                variant="default"
                size="default"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkAsDone();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="h-12 min-w-[120px] gap-2 bg-[#4ADE80] hover:bg-[#4ADE80]/90 text-black"
                title="Als erledigt markieren"
              >
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Erledigt</span>
              </Button>
            )}

            {/* More Options Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size={isTouchDevice ? "default" : "sm"}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  className={cn(
                    "hover:bg-accent",
                    isTouchDevice ? "h-12 w-12 p-0" : "h-8 w-8 p-0"
                  )}
                  title="Mehr Optionen"
                >
                  <MoreVertical className={cn(isTouchDevice ? "h-5 w-5" : "h-4 w-4")} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {impulse.status !== 'done' && !isTouchDevice && (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsDone();
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Als erledigt markieren
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FolderKanban className="h-4 w-4 mr-2" />
                    Status ändern
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange('unprocessed');
                      }}
                    >
                      Impulse & Ideen
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange('in-progress');
                      }}
                    >
                      In Arbeit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange('done');
                      }}
                    >
                      Erledigt
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />

                {!isEditing && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Bearbeiten
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyToClipboard();
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Kopieren
                </DropdownMenuItem>

                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(impulse.id);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Löschen
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DeadlinePicker 
              value={dueDate}
              onChange={handleDeadlineChange}
            />
            
            {isInProgress && (
              <Button
                variant="ghost"
                size={isTouchDevice ? "default" : "sm"}
                onClick={(e) => {
                  e.stopPropagation();
                  setTimerOpen(true);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className={cn(
                  "hover:bg-accent",
                  isTouchDevice ? "h-12 w-12 p-0" : "h-8 w-8 p-0"
                )}
                title="Timer starten"
              >
                <Timer className={cn(isTouchDevice ? "h-5 w-5" : "h-4 w-4")} />
              </Button>
            )}
          </div>
        </div>
      </Card>
      </SwipeableCard>

    <PomodoroTimer
      open={timerOpen}
      onOpenChange={setTimerOpen}
      impulseName={impulse.content}
    />
    </>
  );
});

