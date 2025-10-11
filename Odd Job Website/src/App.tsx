import { useState, useMemo } from 'react';
import { JobCard } from './components/JobCard';
import { SearchAndFilter } from './components/SearchAndFilter';
import { Badge } from './components/ui/badge';
import { User } from 'lucide-react';

// Mock data for jobs
const jobs = [
  {
    id: '1',
    name: 'Garden Cleanup',
    description: 'Need someone to help clean up my backyard garden, remove weeds, and trim bushes. Should take about 3-4 hours.',
    budget: '$80-100',
    location: 'San Francisco, CA',
    skills: ['Gardening', 'Landscaping', 'Physical Labor']
  },
  {
    id: '2',
    name: 'Website Bug Fixes',
    description: 'Looking for a developer to fix responsive design issues on my small business website. Must be familiar with React and CSS.',
    budget: '$150-200',
    location: 'Remote',
    skills: ['React', 'CSS', 'JavaScript', 'Web Development']
  },
  {
    id: '3',
    name: 'Furniture Assembly',
    description: 'Need help assembling IKEA furniture (2 bookshelves and a desk). All tools provided.',
    budget: '$60',
    location: 'Brooklyn, NY',
    skills: ['Assembly', 'Physical Labor', 'Handyman']
  },
  {
    id: '4',
    name: 'Dog Walking',
    description: 'Looking for a reliable dog walker for my friendly Golden Retriever. Need someone 3 times per week, early morning walks.',
    budget: '$25 per walk',
    location: 'Austin, TX',
    skills: ['Pet Care', 'Dog Walking', 'Physical Labor']
  },
  {
    id: '5',
    name: 'Logo Design',
    description: 'Small startup needs a modern, minimalist logo. Looking for 3-5 initial concepts with 2 rounds of revisions.',
    budget: '$200-300',
    location: 'Remote',
    skills: ['Graphic Design', 'Adobe Illustrator', 'Branding', 'Creative']
  },
  {
    id: '6',
    name: 'Math Tutoring',
    description: 'High school student needs help with algebra and geometry. 2 sessions per week, 1 hour each.',
    budget: '$40/hour',
    location: 'Seattle, WA',
    skills: ['Tutoring', 'Mathematics', 'Teaching', 'Communication']
  },
  {
    id: '7',
    name: 'Move Heavy Furniture',
    description: 'Need 2 people to help move a couch, dining table, and bed frame from 2nd floor apartment to moving truck.',
    budget: '$100',
    location: 'Chicago, IL',
    skills: ['Physical Labor', 'Moving', 'Handyman']
  },
  {
    id: '8',
    name: 'Photo Editing',
    description: 'Need 30 wedding photos edited and retouched. Looking for natural, warm tones. Quick turnaround preferred.',
    budget: '$120',
    location: 'Remote',
    skills: ['Photo Editing', 'Photoshop', 'Adobe Lightroom', 'Creative']
  }
];

// Mock user skills
const userSkills = ['React', 'CSS', 'JavaScript', 'Graphic Design', 'Physical Labor'];

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Get unique locations and skills from jobs
  const availableLocations = useMemo(() => {
    return Array.from(new Set(jobs.map(job => job.location))).sort();
  }, []);

  const availableSkills = useMemo(() => {
    const allSkills = jobs.flatMap(job => job.skills);
    return Array.from(new Set(allSkills)).sort();
  }, []);

  // Filter jobs based on search and filters
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Search filter
      const matchesSearch = 
        job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Location filter
      const matchesLocation = 
        selectedLocation === 'all' || job.location === selectedLocation;

      // Skills filter (job must have at least one of the selected skills)
      const matchesSkills = 
        selectedSkills.length === 0 ||
        selectedSkills.some(selectedSkill => 
          job.skills.some(jobSkill => 
            jobSkill.toLowerCase() === selectedSkill.toLowerCase()
          )
        );

      return matchesSearch && matchesLocation && matchesSkills;
    });
  }, [searchQuery, selectedLocation, selectedSkills]);

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary border-b border-primary/20">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-primary-foreground">OddJobs</h1>
          <p className="text-primary-foreground/80 mt-1">Find your next gig</p>
        </div>
      </header>

      {/* User Skills Section */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <p className="text-sm">Your Skills:</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {userSkills.map((skill, index) => (
                <Badge key={index} variant="outline" className="border-primary/40 text-primary">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2>Recommended Jobs for You</h2>
          <p className="text-muted-foreground mt-1">
            Jobs matching your skills are highlighted
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8">
          <SearchAndFilter
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedLocation={selectedLocation}
            onLocationChange={setSelectedLocation}
            selectedSkills={selectedSkills}
            onSkillToggle={handleSkillToggle}
            availableSkills={availableSkills}
            availableLocations={availableLocations}
          />
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'}
          </p>
        </div>

        {/* Job Listings */}
        {filteredJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} userSkills={userSkills} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-lg border border-border">
            <p className="text-muted-foreground">No jobs found matching your criteria.</p>
            <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters or search query.</p>
          </div>
        )}
      </main>
    </div>
  );
}
