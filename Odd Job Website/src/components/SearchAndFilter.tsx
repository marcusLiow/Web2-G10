import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Search, X } from 'lucide-react';

interface SearchAndFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedLocation: string;
  onLocationChange: (value: string) => void;
  selectedSkills: string[];
  onSkillToggle: (skill: string) => void;
  availableSkills: string[];
  availableLocations: string[];
}

export function SearchAndFilter({
  searchQuery,
  onSearchChange,
  selectedLocation,
  onLocationChange,
  selectedSkills,
  onSkillToggle,
  availableSkills,
  availableLocations
}: SearchAndFilterProps) {
  const clearFilters = () => {
    onSearchChange('');
    onLocationChange('all');
    selectedSkills.forEach(skill => onSkillToggle(skill));
  };

  const hasActiveFilters = searchQuery || selectedLocation !== 'all' || selectedSkills.length > 0;

  return (
    <div className="space-y-4 bg-card border border-border rounded-lg p-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search jobs by name or description..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Location Filter */}
        <div className="flex-1">
          <label className="text-sm mb-2 block text-muted-foreground">Location</label>
          <Select value={selectedLocation} onValueChange={onLocationChange}>
            <SelectTrigger>
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {availableLocations.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={clearFilters}
              className="w-full md:w-auto"
            >
              <X className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Skill Filters */}
      <div>
        <label className="text-sm mb-2 block text-muted-foreground">Filter by Skills</label>
        <div className="flex flex-wrap gap-2">
          {availableSkills.map((skill) => {
            const isSelected = selectedSkills.includes(skill);
            return (
              <Badge
                key={skill}
                variant={isSelected ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/90"
                onClick={() => onSkillToggle(skill)}
              >
                {skill}
                {isSelected && <X className="w-3 h-3 ml-1" />}
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
}
