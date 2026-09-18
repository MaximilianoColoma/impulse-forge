import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ImpulseCatcher } from '@/components/ImpulseCatcher';
import { Loader2 } from 'lucide-react';

export default function Share() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [catcherOpen, setCatcherOpen] = useState(false);
  const [sharedContent, setSharedContent] = useState('');

  useEffect(() => {
    // Extract shared data from URL params
    const title = searchParams.get('title') || '';
    const text = searchParams.get('text') || '';
    const url = searchParams.get('url') || '';

    // Combine shared data into meaningful content
    let content = '';
    
    if (title) {
      content += `${title}\n\n`;
    }
    
    if (text) {
      content += `${text}\n\n`;
    }
    
    if (url) {
      content += `🔗 ${url}`;
    }

    // If no content was shared, redirect to home
    if (!content.trim()) {
      navigate('/');
      return;
    }

    setSharedContent(content.trim());
    setCatcherOpen(true);
  }, [searchParams, navigate]);

  const handleCatcherClose = () => {
    setCatcherOpen(false);
    // Redirect to main stream after closing
    setTimeout(() => navigate('/'), 100);
  };

  const handleImpulseCreated = () => {
    setCatcherOpen(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Inhalte werden übertragen...</p>
      </div>

      <ImpulseCatcher
        open={catcherOpen}
        onOpenChange={handleCatcherClose}
        onImpulseCreated={handleImpulseCreated}
        initialContent={sharedContent}
      />
    </div>
  );
}