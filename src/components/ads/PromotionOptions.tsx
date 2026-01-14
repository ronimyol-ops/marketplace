import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Star, ArrowUp, Zap, Check } from 'lucide-react';
import { toast } from 'sonner';

interface PromotionOption {
  id: 'featured' | 'top' | 'urgent';
  name: string;
  description: string;
  price: number;
  duration: number;
  icon: React.ReactNode;
  benefits: string[];
}

const promotionOptions: PromotionOption[] = [
  {
    id: 'featured',
    name: 'Featured Ad',
    description: 'Get maximum visibility with a featured badge',
    price: 500,
    duration: 7,
    icon: <Star className="h-5 w-5 text-amber-500 fill-current" />,
    benefits: [
      'Featured badge on your ad',
      'Appears in Featured section',
      'Higher search ranking',
      '7 days duration',
    ],
  },
  {
    id: 'top',
    name: 'Top Ad',
    description: 'Stay at the top of search results',
    price: 300,
    duration: 3,
    icon: <ArrowUp className="h-5 w-5 text-purple-500" />,
    benefits: [
      'Priority in listings',
      'Top Ad badge',
      'Boosted visibility',
      '3 days duration',
    ],
  },
  {
    id: 'urgent',
    name: 'Urgent Badge',
    description: 'Show urgency to attract quick buyers',
    price: 200,
    duration: 5,
    icon: <Zap className="h-5 w-5 text-red-500" />,
    benefits: [
      'Eye-catching urgent label',
      'Attracts quick buyers',
      'Stand out from others',
      '5 days duration',
    ],
  },
];

interface PromotionOptionsProps {
  onSelect?: (type: 'featured' | 'top' | 'urgent' | null) => void;
  selectedType?: 'featured' | 'top' | 'urgent' | null;
  showAsCard?: boolean;
}

export function PromotionOptions({ onSelect, selectedType, showAsCard = true }: PromotionOptionsProps) {
  const [selected, setSelected] = useState<string | null>(selectedType || null);

  const handleSelect = (value: string) => {
    const newValue = value === selected ? null : value;
    setSelected(newValue);
    onSelect?.(newValue as 'featured' | 'top' | 'urgent' | null);
  };

  const content = (
    <div className="space-y-4">
      <RadioGroup value={selected || ''} onValueChange={handleSelect}>
        {promotionOptions.map((option) => (
          <div
            key={option.id}
            className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
              selected === option.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => handleSelect(option.id)}
          >
            <div className="flex items-start gap-4">
              <RadioGroupItem value={option.id} id={option.id} className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {option.icon}
                  <Label htmlFor={option.id} className="font-semibold cursor-pointer">
                    {option.name}
                  </Label>
                  <Badge variant="secondary">৳{option.price}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{option.description}</p>
                <ul className="space-y-1">
                  {option.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-3 w-3 text-green-500" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </RadioGroup>

      {selected && (
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            <p className="font-semibold">
              Total: ৳{promotionOptions.find(o => o.id === selected)?.price}
            </p>
            <p className="text-sm text-muted-foreground">
              Duration: {promotionOptions.find(o => o.id === selected)?.duration} days
            </p>
          </div>
          <Button type="button" onClick={() => toast.info('Online promotion is not available in this demo yet. You can still publish your ad without promotion.')}>
            Promote Now
          </Button>
        </div>
      )}
    </div>
  );

  if (!showAsCard) return content;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500" />
          Promote Your Ad
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
