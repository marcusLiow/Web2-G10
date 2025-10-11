import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { MapPin, DollarSign, Check } from 'lucide-react';

interface Job {
  id: string;
  name: string;
  description: string;
  budget: string;
  location: string;
  skills: string[];
}

interface JobCardProps {
  job: Job;
  userSkills: string[];
}

export function JobCard({ job, userSkills }: JobCardProps) {
  const [isApplied, setIsApplied] = useState(false);

  const handleApply = () => {
    setIsApplied(true);
  };

  const isSkillMatched = (skill: string) => {
    return userSkills.some(userSkill => 
      userSkill.toLowerCase() === skill.toLowerCase()
    );
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle>{job.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">{job.description}</p>
        
        <div className="flex items-center gap-2 text-muted-foreground">
          <DollarSign className="w-4 h-4" />
          <span>{job.budget}</span>
        </div>
        
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>{job.location}</span>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm">Required Skills:</p>
          <div className="flex flex-wrap gap-2">
            {job.skills.map((skill, index) => (
              <Badge
                key={index}
                variant={isSkillMatched(skill) ? "default" : "secondary"}
              >
                {skill}
                {isSkillMatched(skill) && (
                  <Check className="w-3 h-3 ml-1" />
                )}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleApply} 
          disabled={isApplied}
          className="w-full"
          variant={isApplied ? "secondary" : "default"}
        >
          {isApplied ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Applied
            </>
          ) : (
            "Apply"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
