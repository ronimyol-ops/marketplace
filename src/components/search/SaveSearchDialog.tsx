import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Bookmark, Bell } from 'lucide-react';
import { useSavedSearches, SearchCriteria } from '@/hooks/useSavedSearches';
import { useAuth } from '@/hooks/useAuth';

interface SaveSearchDialogProps {
  criteria: SearchCriteria;
  trigger?: React.ReactNode;
}

export function SaveSearchDialog({ criteria, trigger }: SaveSearchDialogProps) {
  const { user } = useAuth();
  const { saveSearch } = useSavedSearches();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    
    setIsSaving(true);
    const success = await saveSearch(name.trim(), criteria);
    setIsSaving(false);
    
    if (success) {
      setName('');
      setOpen(false);
    }
  };

  const generateDefaultName = () => {
    const parts: string[] = [];
    if (criteria.query) parts.push(`"${criteria.query}"`);
    if (criteria.division) parts.push(criteria.division);
    if (criteria.minPrice || criteria.maxPrice) {
      parts.push(`৳${criteria.minPrice || 0}-${criteria.maxPrice || '∞'}`);
    }
    return parts.length > 0 ? parts.join(' in ') : 'My Search';
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Bookmark className="h-4 w-4" />
            Save Search
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Save This Search
          </DialogTitle>
          <DialogDescription>
            Get notified when new ads matching your criteria are posted.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="search-name">Search Name</Label>
            <Input
              id="search-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={generateDefaultName()}
            />
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
            <p className="font-medium">Search Criteria:</p>
            <ul className="text-muted-foreground space-y-0.5">
              {criteria.query && <li>• Keywords: {criteria.query}</li>}
              {criteria.division && <li>• Location: {criteria.district ? `${criteria.district}, ` : ''}{criteria.division}</li>}
              {(criteria.minPrice || criteria.maxPrice) && (
                <li>• Price: ৳{criteria.minPrice || 0} - ৳{criteria.maxPrice || '∞'}</li>
              )}
              {criteria.condition && <li>• Condition: {criteria.condition}</li>}
              {!criteria.query && !criteria.division && !criteria.minPrice && !criteria.maxPrice && (
                <li>• All ads</li>
              )}
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? 'Saving...' : 'Save & Enable Alerts'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
