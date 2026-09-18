import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Loader2, Paperclip, X, FolderOpen } from 'lucide-react';
import { generateTags } from '@/services/aiTagging';
import { useDebounce } from '@/hooks/useDebounce';
import { UpgradeNudgeBanner } from '@/components/UpgradeNudgeBanner';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import { emitOperationalEvent } from '@/lib/observability/emitOperationalEvent';

interface ImpulseCatcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImpulseCreated?: () => void;
  defaultProjectId?: string;
  initialContent?: string;
}

const TOOLS = [
  { value: 'lovable', label: 'Lovable', icon: '🚀' },
  { value: 'chatgpt', label: 'ChatGPT', icon: '🤖' },
  { value: 'claude', label: 'Claude', icon: '🔮' },
  { value: 'figma', label: 'Figma', icon: '🎨' },
  { value: 'notion', label: 'Notion', icon: '📝' },
  { value: 'linear', label: 'Linear', icon: '📊' },
  { value: 'github', label: 'GitHub', icon: '💻' },
];

export function ImpulseCatcher({ open, onOpenChange, onImpulseCreated, defaultProjectId, initialContent }: ImpulseCatcherProps) {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(defaultProjectId);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | undefined>();
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [userTools, setUserTools] = useState<Array<{ value: string; label: string; icon: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const debouncedContent = useDebounce(content, 1000);
  const [impulseCount, setImpulseCount] = useState<number>(0);
  const { tier } = useSubscriptionTier();

  useEffect(() => {
    if (open) {
      fetchProjects();
      fetchUserTools();
      setSelectedProjectId(defaultProjectId);
      // Load current impulse count for nudge threshold
      supabase
        .from('impulses')
        .select('*', { count: 'exact', head: true })
        .eq('is_archived', false)
        .then(({ count }) => setImpulseCount(count ?? 0));
      
      // Set initial content if provided (for share target)
      if (initialContent) {
        setContent(initialContent);
      }
    } else {
      // Reset form when closing (only if no initial content)
      if (!initialContent) {
        setContent('');
      }
      setTags([]);
      setSuggestedTags([]);
      setSelectedTool(undefined);
      setFiles([]);
    }
  }, [open, defaultProjectId, initialContent]);

  const fetchUserTools = async () => {
    try {
      const { data, error } = await supabase
        .from('user_tools')
        .select('*')
        .order('tool_name');

      if (error) throw error;
      
      const customTools = (data || []).map(tool => ({
        value: tool.tool_name.toLowerCase().replace(/\s+/g, '-'),
        label: tool.tool_name,
        icon: '🔧'
      }));
      
      setUserTools([...TOOLS, ...customTools]);
    } catch (error: any) {
      console.error('Fehler beim Laden der Tools:', error);
      setUserTools(TOOLS);
    }
  };

  useEffect(() => {
    const fetchAiTags = async () => {
      if (debouncedContent.trim().length >= 15) {
        setIsGeneratingTags(true);
        try {
          const aiTags = await generateTags(debouncedContent, selectedProjectId);
          // Filter out tags that are already selected
          const filteredTags = aiTags.filter(tag => !tags.includes(tag));
          setSuggestedTags(filteredTags);
        } catch (error) {
          console.error('Fehler beim Generieren der Tags:', error);
          setSuggestedTags([]);
        } finally {
          setIsGeneratingTags(false);
        }
      } else {
        setSuggestedTags([]);
        setIsGeneratingTags(false);
      }
    };

    fetchAiTags();
  }, [debouncedContent, tags, selectedProjectId]);

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

  // Build hierarchical project structure for display
  const buildProjectOptions = (projects: any[]) => {
    const map = new Map<string, any>();
    const roots: any[] = [];

    // Create map of all projects
    projects.forEach(project => {
      map.set(project.id, { ...project, children: [] });
    });

    // Build tree structure
    projects.forEach(project => {
      const node = map.get(project.id)!;
      if (project.parent_project_id) {
        const parent = map.get(project.parent_project_id);
        if (parent && parent.children) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    // Flatten with depth indicators
    const flattenWithDepth = (nodes: any[], depth = 0): any[] => {
      return nodes.flatMap(node => [
        { ...node, depth },
        ...flattenWithDepth(node.children || [], depth + 1)
      ]);
    };

    return flattenWithDepth(roots);
  };

  const hierarchicalProjects = buildProjectOptions(projects);
  
  // Sort projects so current project appears first
  const sortedProjects = defaultProjectId 
    ? [...hierarchicalProjects].sort((a, b) => {
        if (a.id === defaultProjectId) return -1;
        if (b.id === defaultProjectId) return 1;
        return 0;
      })
    : hierarchicalProjects;

  const toggleTag = (tag: string) => {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (userId: string, impulseId: string) => {
    if (files.length === 0) return [];
    
    const uploadedFiles = [];
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${impulseId}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('impulse-attachments')
        .upload(fileName, file);
      
      if (error) {
        console.error('File upload error:', error);
        throw error;
      }
      
      uploadedFiles.push({
        name: file.name,
        path: data.path,
        type: file.type,
        size: file.size,
      });
    }
    
    return uploadedFiles;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    setIsUploading(files.length > 0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht authentifiziert');

      const finalTags = tags.length > 0 ? tags : suggestedTags.length > 0 ? suggestedTags : ['general'];

      // Create impulse first to get the ID
      const { data: impulseData, error: impulseError } = await supabase
        .from('impulses')
        .insert([
          {
            content,
            tags: finalTags,
            user_id: user.id,
            project_id: selectedProjectId || null,
            type: 'idea',
            status: 'unprocessed',
            tool: selectedTool || null,
            attachments: [],
          },
        ])
        .select()
        .single();

      if (impulseError) throw impulseError;

      // T2.10_A · pseudonymous success event (no content, no impulse_id).
      void emitOperationalEvent({
        event_name: 'impulse.create.success',
        result: 'success',
        space_ref: null,
        surface: 'impulse_catcher',
      });

      // Upload files if any
      let attachments = [];
      if (files.length > 0) {
        attachments = await uploadFiles(user.id, impulseData.id);
        
        // Update impulse with attachments
        const { error: updateError } = await supabase
          .from('impulses')
          .update({ attachments })
          .eq('id', impulseData.id);
        
        if (updateError) throw updateError;
      }

      toast.success('✅ Impuls erfasst');
      setContent('');
      setTags([]);
      setSuggestedTags([]);
      setSelectedProjectId(undefined);
      setSelectedTool(undefined);
      setFiles([]);
      onOpenChange(false);
      onImpulseCreated?.();
    } catch (error: any) {
      toast.error('Fehler beim Speichern');
      console.error(error);
      void emitOperationalEvent({
        event_name: 'impulse.create.failure',
        result: 'failure',
        space_ref: null,
        surface: 'impulse_catcher',
        error_class: (error?.code ?? error?.name ?? 'unknown').toString().slice(0, 64),
      });
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Fang deinen Impuls
          </DialogTitle>
        </DialogHeader>

        {tier === 'free' && impulseCount >= 45 && (
          <UpgradeNudgeBanner
            surface="impulse.catcher"
            context={{ impulsesCount: impulseCount }}
            className="mb-3"
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-4" aria-label="Impuls erfassen">
          <div className="space-y-3">
            <label htmlFor="impulse-content" className="sr-only">
              Impuls-Inhalt eingeben
            </label>
            <Textarea
              id="impulse-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Was geht dir durch den Kopf? Schreib es einfach hier rein..."
              className="min-h-[150px] sm:min-h-[200px] resize-none text-base sm:text-lg"
              autoFocus
              aria-required="true"
              aria-describedby="impulse-help"
            />
            <p id="impulse-help" className="sr-only">
              Gib deinen Gedanken oder deine Idee ein. Die KI wird automatisch Tags vorschlagen.
            </p>
            
            {/* Action Icons */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 gap-2"
                aria-label="Datei zum Impuls anhängen (max. 10MB, Bilder und Dokumente)"
              >
                <Paperclip className="h-4 w-4" />
                <span className="hidden sm:inline">Dateien</span>
              </Button>
              
              <Select value={selectedTool} onValueChange={setSelectedTool}>
                <SelectTrigger className="w-[140px] sm:w-[180px] h-8" aria-label="Tool für Impuls auswählen">
                  <SelectValue placeholder="Tool wählen..." />
                </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Kein Tool</SelectItem>
                    {userTools.map((tool) => (
                      <SelectItem key={tool.value} value={tool.value}>
                        {tool.icon} {tool.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
              </Select>
            </div>

            {/* Project Selection - Prominent Position */}
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
              <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger 
                    id="project-select" 
                    className="h-9 bg-background border-border"
                    aria-label="Projekt auswählen"
                  >
                    <SelectValue placeholder="Kein Projekt ausgewählt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Kein Projekt</SelectItem>
                    {sortedProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <span style={{ paddingLeft: `${project.depth * 16}px` }} className="flex items-center gap-2">
                          {project.depth > 0 && '└─ '}
                          {project.name}
                          {project.id === defaultProjectId && (
                            <span className="text-xs text-primary font-medium">(aktuell)</span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {defaultProjectId && selectedProjectId === defaultProjectId && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  Aktuelles Projekt
                </Badge>
              )}
            </div>

            {/* File Preview */}
            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Anhänge:</p>
                <div className="flex flex-wrap gap-2">
                  {files.map((file, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="gap-2 pr-1 max-w-[200px]"
                    >
                      <span className="truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="hover:bg-background/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Tag Suggestions */}
          {(isGeneratingTags || suggestedTags.length > 0) && (
            <div className="space-y-2 p-4 bg-secondary/5 border border-secondary/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-secondary" />
                <p className="text-sm font-medium text-secondary">KI-Tag-Vorschläge</p>
                {isGeneratingTags && (
                  <Loader2 className="h-3 w-3 animate-spin text-secondary ml-auto" />
                )}
              </div>
              
              {suggestedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {suggestedTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer border-secondary/50 text-secondary hover:bg-secondary hover:text-background transition-all"
                      onClick={() => toggleTag(tag)}
                    >
                      + {tag}
                    </Badge>
                  ))}
                </div>
              )}
              
              {isGeneratingTags && suggestedTags.length === 0 && (
                <div className="flex gap-1 justify-center py-2">
                  <div className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
                  <div className="h-2 w-2 rounded-full bg-secondary animate-pulse delay-75" />
                  <div className="h-2 w-2 rounded-full bg-secondary animate-pulse delay-150" />
                </div>
              )}
            </div>
          )}

          {/* Selected Tags */}
          {tags.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Ausgewählte Tags:</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    className="cursor-pointer bg-secondary text-background hover:bg-secondary/80 transition-colors"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              aria-label="Impuls-Erfassung abbrechen"
            >
              Abbrechen
            </Button>
            <Button 
              type="submit" 
              disabled={!content.trim() || isSubmitting} 
              className="min-w-[120px]"
              aria-label={isUploading ? 'Dateien werden hochgeladen' : isSubmitting ? 'Impuls wird gespeichert' : 'Impuls speichern'}
            >
              {isUploading ? 'Lädt hoch...' : isSubmitting ? 'Speichert...' : 'Speichern'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
