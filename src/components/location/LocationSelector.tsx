import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DIVISIONS, getDistricts, getUpazilas, getAreas } from '@/lib/bangladesh-locations';

interface LocationSelectorProps {
  division: string;
  district: string;
  upazila?: string;
  area?: string;
  onDivisionChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
  onUpazilaChange?: (value: string) => void;
  onAreaChange?: (value: string) => void;
  showUpazila?: boolean;
  showArea?: boolean;
  required?: boolean;
}

export function LocationSelector({
  division,
  district,
  upazila = '',
  area = '',
  onDivisionChange,
  onDistrictChange,
  onUpazilaChange,
  onAreaChange,
  showUpazila = true,
  showArea = true,
  required = false
}: LocationSelectorProps) {
  const [districts, setDistricts] = useState<string[]>([]);
  const [upazilas, setUpazilas] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);

  useEffect(() => {
    if (division) {
      setDistricts(getDistricts(division));
    } else {
      setDistricts([]);
    }
  }, [division]);

  useEffect(() => {
    if (district) {
      setUpazilas(getUpazilas(district));
    } else {
      setUpazilas([]);
    }
  }, [district]);

  useEffect(() => {
    if (upazila) {
      setAreas(getAreas(upazila));
    } else {
      setAreas([]);
    }
  }, [upazila]);

  const handleDivisionChange = (value: string) => {
    onDivisionChange(value);
    onDistrictChange('');
    onUpazilaChange?.('');
    onAreaChange?.('');
  };

  const handleDistrictChange = (value: string) => {
    onDistrictChange(value);
    onUpazilaChange?.('');
    onAreaChange?.('');
  };

  const handleUpazilaChange = (value: string) => {
    onUpazilaChange?.(value);
    onAreaChange?.('');
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Division {required && <span className="text-destructive">*</span>}</Label>
        <Select value={division} onValueChange={handleDivisionChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select division" />
          </SelectTrigger>
          <SelectContent>
            {DIVISIONS.map((div) => (
              <SelectItem key={div} value={div}>{div}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>District {required && <span className="text-destructive">*</span>}</Label>
        <Select value={district} onValueChange={handleDistrictChange} disabled={!division}>
          <SelectTrigger>
            <SelectValue placeholder="Select district" />
          </SelectTrigger>
          <SelectContent>
            {districts.map((dist) => (
              <SelectItem key={dist} value={dist}>{dist}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showUpazila && (
        <div className="space-y-2">
          <Label>Upazila / Thana</Label>
          <Select 
            value={upazila} 
            onValueChange={handleUpazilaChange} 
            disabled={!district || upazilas.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={upazilas.length === 0 ? "No data available" : "Select upazila"} />
            </SelectTrigger>
            <SelectContent>
              {upazilas.map((up) => (
                <SelectItem key={up} value={up}>{up}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showArea && (
        <div className="space-y-2">
          <Label>Area</Label>
          {areas.length > 0 ? (
            <Select value={area} onValueChange={onAreaChange} disabled={!upazila}>
              <SelectTrigger>
                <SelectValue placeholder="Select area" />
              </SelectTrigger>
              <SelectContent>
                {areas.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder="Enter your area"
              value={area}
              onChange={(e) => onAreaChange?.(e.target.value)}
            />
          )}
        </div>
      )}
    </div>
  );
}
