import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface CategoryField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  options: string[] | null;
  is_required: boolean;
  sort_order: number;
}

interface CategoryFieldsProps {
  categoryId: string;
  values: Record<string, string | boolean | number>;
  onChange: (values: Record<string, string | boolean | number>) => void;
}

export function CategoryFields({ categoryId, values, onChange }: CategoryFieldsProps) {
  const [fields, setFields] = useState<CategoryField[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (categoryId) {
      fetchFields();
    } else {
      setFields([]);
    }
  }, [categoryId]);

  const fetchFields = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('category_fields')
      .select('*')
      .eq('category_id', categoryId)
      .order('sort_order');

    if (data) {
      // Parse options from JSONB
      const parsedFields = data.map(field => ({
        ...field,
        options: field.options ? (typeof field.options === 'string' ? JSON.parse(field.options) : field.options) : null
      }));
      setFields(parsedFields as CategoryField[]);
    }
    setIsLoading(false);
  };

  const handleFieldChange = (fieldName: string, value: string | boolean | number) => {
    onChange({ ...values, [fieldName]: value });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
      <h3 className="font-semibold text-sm text-muted-foreground">Category Details</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.field_label}
              {field.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>

            {field.field_type === 'select' && field.options && (
              <Select
                value={values[field.field_name]?.toString() || ''}
                onValueChange={(v) => handleFieldChange(field.field_name, v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${field.field_label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {field.field_type === 'text' && (
              <Input
                value={values[field.field_name]?.toString() || ''}
                onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
                placeholder={`Enter ${field.field_label.toLowerCase()}`}
              />
            )}

            {field.field_type === 'number' && (
              <Input
                type="number"
                value={values[field.field_name]?.toString() || ''}
                onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
                placeholder={`Enter ${field.field_label.toLowerCase()}`}
              />
            )}

            {field.field_type === 'checkbox' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={field.field_name}
                  checked={!!values[field.field_name]}
                  onCheckedChange={(checked) => handleFieldChange(field.field_name, !!checked)}
                />
                <label
                  htmlFor={field.field_name}
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  {field.field_label}
                </label>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface CategoryFieldsDisplayProps {
  customFields: Record<string, any>;
}

export function CategoryFieldsDisplay({ customFields }: CategoryFieldsDisplayProps) {
  if (!customFields || Object.keys(customFields).length === 0) {
    return null;
  }

  const formatFieldName = (name: string) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="grid grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg">
      {Object.entries(customFields).map(([key, value]) => {
        if (value === null || value === undefined || value === '') return null;
        return (
          <div key={key}>
            <p className="text-xs text-muted-foreground">{formatFieldName(key)}</p>
            <p className="font-medium">{String(value)}</p>
          </div>
        );
      })}
    </div>
  );
}
