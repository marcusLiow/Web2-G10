<script setup>
import { ref, computed, onMounted } from 'vue';
import { supabase } from '../supabase/config';

const mockHelpers = [
  {
    id: 1,
    name: 'Marcus Chen',
    title: 'Full-Stack Developer',
    description: 'Experienced web developer specializing in Vue.js and Node.js. Available for bug fixes, feature development, and code reviews.',
    skills: ['Vue.js', 'Node.js', 'JavaScript', 'Git', 'REST APIs'],
    location: 'Remote',
    availability: 'Weekdays & Weekends',
    rating: 4.8,
    completedJobs: 47,
    bio: 'I\'ve been building web applications for 5+ years. I love solving complex problems and delivering clean, maintainable code. Fast turnaround time and excellent communication guaranteed.',
    experience: ['5+ years in web development', 'Built 20+ e-commerce sites', 'Specialized in Vue and React', 'Available for urgent fixes'],
    profileImage: '👨‍💻',
    responseTime: 'Usually responds within 2 hours',
    username: 'marcusChen_dev'
  },
  {
    id: 2,
    name: 'Sarah Johnson',
    title: 'Professional Cleaner',
    description: 'Detail-oriented cleaner with 8 years experience. Specialize in deep cleaning, move-out cleaning, and regular maintenance.',
    skills: ['Deep Cleaning', 'Move-out Cleaning', 'Kitchen & Bathroom', 'Eco-friendly Products'],
    location: 'Westside & Downtown',
    availability: 'Mon-Fri 9am-5pm',
    rating: 4.9,
    completedJobs: 156,
    bio: 'Professional cleaner with my own supplies and equipment. I take pride in my work and won\'t leave until you\'re 100% satisfied. Background checked and fully insured.',
    experience: ['8 years professional cleaning', 'Eco-friendly cleaning options', 'Own supplies & equipment', 'Background checked', 'References available'],
    profileImage: '🧹',
    responseTime: 'Usually responds within 3 hours',
    username: 'sarahCleans'
  },
  {
    id: 3,
    name: 'Tom Richards',
    title: 'Handyman & Carpenter',
    description: 'Skilled in furniture assembly, basic repairs, and light construction. 15+ years experience in residential work.',
    skills: ['Furniture Assembly', 'Carpentry', 'Drywall Repair', 'Painting', 'General Repairs'],
    location: 'North End & East Side',
    availability: 'Weekdays & Saturdays',
    rating: 4.7,
    completedJobs: 89,
    bio: 'I can fix almost anything around the house. From assembling IKEA furniture to patching drywall, I\'ve done it all. I bring my own tools and clean up when I\'m done.',
    experience: ['15+ years as a handyman', 'Licensed and insured', 'Own tools and equipment', 'Same-day service available', 'Free estimates'],
    profileImage: '🔨',
    responseTime: 'Usually responds within 4 hours',
    username: 'tomTheHandyman'
  },
  {
    id: 4,
    name: 'Lisa Martinez',
    title: 'Pet Care Specialist',
    description: 'Certified dog trainer and pet sitter. Love working with all breeds and temperaments. Available for walks, sitting, and training.',
    skills: ['Dog Walking', 'Pet Sitting', 'Basic Training', 'Pet First Aid'],
    location: 'All areas',
    availability: 'Flexible - 7 days a week',
    rating: 5.0,
    completedJobs: 203,
    bio: 'Animals are my passion! I\'m certified in pet first aid and have experience with dogs, cats, and small animals. Your pets will be safe and happy with me.',
    experience: ['Certified dog trainer', 'Pet first aid certified', '10+ years pet care', 'Experience with all breeds', 'Insured and bonded'],
    profileImage: '🐕',
    responseTime: 'Usually responds within 1 hour',
    username: 'lisaPetCare'
  },
  {
    id: 5,
    name: 'David Kim',
    title: 'Landscaper & Gardener',
    description: 'Professional landscaping services including lawn care, garden maintenance, and outdoor project installations.',
    skills: ['Landscaping', 'Lawn Care', 'Garden Design', 'Patio Installation', 'Tree Trimming'],
    location: 'All areas - own truck',
    availability: 'Mon-Sat 7am-6pm',
    rating: 4.8,
    completedJobs: 124,
    bio: 'I transform outdoor spaces into beautiful, functional areas. Whether it\'s regular maintenance or a complete landscape redesign, I deliver quality work on time and on budget.',
    experience: ['12 years landscaping experience', 'Licensed contractor', 'Own equipment and truck', 'Free consultations', 'Portfolio available'],
    profileImage: '🌱',
    responseTime: 'Usually responds within 3 hours',
    username: 'davidLandscapes'
  },
  {
    id: 6,
    name: 'Emma Wilson',
    title: 'Virtual Assistant',
    description: 'Organized and efficient VA offering admin support, data entry, scheduling, and customer service assistance.',
    skills: ['Data Entry', 'Scheduling', 'Email Management', 'Customer Service', 'Excel'],
    location: 'Remote',
    availability: 'Mon-Fri 9am-6pm',
    rating: 4.9,
    completedJobs: 78,
    bio: 'I help busy professionals and small businesses stay organized. Fast, reliable, and detail-oriented. I can handle everything from inbox management to customer inquiries.',
    experience: ['5 years as a VA', 'Expert in Google Workspace', 'CRM experience', 'Excellent communication', 'Fast turnaround'],
    profileImage: '💼',
    responseTime: 'Usually responds within 2 hours',
    username: 'emmaVA'
  }
];

const helpers = ref([]);
const searchTerm = ref('');
const selectedSkill = ref('');
const selectedHelper = ref(null);
const showModal = ref(false);
const isLoading = ref(true);

// All possible skills (you can customize this)
const skillsList = [
  'Cleaning',
  'Carpentry',
  'Plumbing',
  'Electrical',
  'Painting',
  'Landscaping',
  'Pet Care',
  'Moving',
  'Web Development',
  'Graphic Design',
  'Writing',
  'Tutoring',
  'Photography',
  'Cooking',
  'Other'
];

// Fetch helpers from Supabase
const fetchHelpers = async () => {
  try {
    isLoading.value = true;
    
    console.log('Fetching helpers from Supabase...');
    
    const { data: helpersData, error: helpersError } = await supabase
      .from('helper_profiles')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (helpersError) throw helpersError;

    console.log('Helpers fetched:', helpersData);

    // Fetch user data for each helper
    const transformedHelpers = await Promise.all(helpersData.map(async (helper) => {
      let name = 'Anonymous';
      let contactEmail = 'N/A';
      
      if (helper.user_id) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('username, email')
          .eq('id', helper.user_id)
          .single();
        
        if (!userError && userData) {
          name = userData.username || 'Anonymous';
          contactEmail = userData.email || 'N/A';
        }
      }

      return {
        id: helper.id,
        name: name,
        title: helper.title || 'Helper',
        description: helper.description || 'Available to help with various tasks',
        skills: helper.skills || ['General'],
        location: helper.location || 'Not specified',
        availability: helper.availability || 'Contact for availability',
        rating: helper.rating || 0,
        completedJobs: helper.completed_jobs || 0,
        bio: helper.bio || helper.description,
        experience: helper.experience || ['Contact for details'],
        profileImage: helper.profile_image || '👤',
        responseTime: helper.response_time || 'Usually responds within 24 hours',
        username: name
      };
    }));

    // Combine with mock helpers
    helpers.value = [...transformedHelpers, ...mockHelpers];
    console.log('Final helpers array:', helpers.value);
  } catch (error) {
    console.error('Error fetching helpers:', error);
    // If fetch fails, just use mock helpers
    helpers.value = mockHelpers;
  } finally {
    isLoading.value = false;
  }
};

// Fetch helpers when component mounts
onMounted(() => {
  fetchHelpers();
});

const filteredHelpers = computed(() => {
  const term = searchTerm.value.toLowerCase().trim();
  const skill = selectedSkill.value;
  let result = helpers.value;

  if (term) {
    result = result.filter(
      helper =>
        helper.name.toLowerCase().includes(term) ||
        helper.title.toLowerCase().includes(term) ||
        helper.description.toLowerCase().includes(term)
    );
  }

  if (skill) {
    result = result.filter(helper => 
      helper.skills.some(s => s.toLowerCase().includes(skill.toLowerCase()))
    );
  }

  return result;
});

const clearFilters = () => {
  searchTerm.value = '';
  selectedSkill.value = '';
};

const viewHelperProfile = (helper) => {
  selectedHelper.value = helper;
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  selectedHelper.value = null;
};

const startChat = () => {
  alert(`Starting chat with ${selectedHelper.value.name}...\n\nChat feature coming soon!\n\nUsername: ${selectedHelper.value.username}`);
  closeModal();
};

const renderStars = (rating) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  let stars = '⭐'.repeat(fullStars);
  if (hasHalfStar) stars += '⭐';
  return stars;
};
</script>

<template>
  <div class="page-wrapper">
    <div class="container">
      <!-- Header -->
      <div class="header-section">
        <h1 class="main-title">Browse Helpers</h1>
        <p class="subtitle">Find skilled helpers ready to assist with your tasks.</p>
      </div>

      <!-- Search and Filter Card -->
      <div class="search-card">
        <div class="search-grid">
          <div class="search-group">
            <label class="search-label">Search Helpers</label>
            <input
              v-model="searchTerm"
              placeholder="Search by name, title, or description..."
              class="search-input"
            />
          </div>

          <div class="search-group">
            <label class="search-label">Filter by Skill</label>
            <select 
              v-model="selectedSkill"
              class="search-select"
            >
              <option value="">-- Select a skill --</option>
              <option v-for="skill in skillsList" :key="skill" :value="skill">
                {{ skill }}
              </option>
            </select>
          </div>
        </div>

        <div v-if="selectedSkill" class="selected-filters">
          <span class="filter-tag">
            Skill: {{ selectedSkill }} 
            <button @click="selectedSkill = ''" class="remove-filter">✕</button>
          </span>
          <button class="clear-btn" @click="clearFilters">
            Clear All
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading helpers...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredHelpers.length === 0" class="empty-state">
        <p>No helpers found matching your criteria.</p>
      </div>

      <!-- Helpers Grid -->
      <div v-else class="helpers-grid">
        <div
          v-for="helper in filteredHelpers"
          :key="helper.id"
          class="helper-card"
        >
          <div class="helper-avatar">
            {{ helper.profileImage }}
          </div>
          
          <div class="helper-content">
            <div class="helper-header">
              <div>
                <h2 class="helper-name">{{ helper.name }}</h2>
                <p class="helper-title">{{ helper.title }}</p>
              </div>
              <div class="helper-rate">{{ helper.hourlyRate }}</div>
            </div>
            
            <div class="helper-stats">
              <div class="stat-item">
                <span class="stars">{{ renderStars(helper.rating) }}</span>
                <span class="rating-text">{{ helper.rating }}</span>
              </div>
              <div class="stat-item">
                <span class="jobs-count">{{ helper.completedJobs }} jobs completed</span>
              </div>
            </div>
            
            <p class="helper-description">{{ helper.description }}</p>
            
            <div class="helper-meta">
              <div class="meta-item">
                <span class="icon">📍</span>
                <span>{{ helper.location }}</span>
              </div>
              <div class="meta-item">
                <span class="icon">📅</span>
                <span>{{ helper.availability }}</span>
              </div>
            </div>
            
            <div class="skills-preview">
              <span
                v-for="skill in helper.skills.slice(0, 3)"
                :key="skill"
                class="skill-badge"
              >
                {{ skill }}
              </span>
              <span v-if="helper.skills.length > 3" class="more-skills">
                +{{ helper.skills.length - 3 }} more
              </span>
            </div>
            
            <button class="view-profile-btn" @click="viewHelperProfile(helper)">
              View Full Profile
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <button class="close-btn" @click="closeModal">✕</button>
        
        <div v-if="selectedHelper">
          <div class="modal-header">
            <div class="profile-section">
              <div class="profile-avatar-large">
                {{ selectedHelper.profileImage }}
              </div>
              <div>
                <h2 class="modal-name">{{ selectedHelper.name }}</h2>
                <p class="modal-title">{{ selectedHelper.title }}</p>
                <div class="modal-stats">
                  <span class="stars">{{ renderStars(selectedHelper.rating) }}</span>
                  <span class="rating-text">{{ selectedHelper.rating }}</span>
                  <span class="separator">•</span>
                  <span>{{ selectedHelper.completedJobs }} jobs</span>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-quick-info">
            <div class="info-item">
              <span class="icon">📍</span>
              <div>
                <div class="info-label">Location</div>
                <div class="info-value">{{ selectedHelper.location }}</div>
              </div>
            </div>
            <div class="info-item">
              <span class="icon">📅</span>
              <div>
                <div class="info-label">Availability</div>
                <div class="info-value">{{ selectedHelper.availability }}</div>
              </div>
            </div>
            <div class="info-item">
              <span class="icon">⏱️</span>
              <div>
                <div class="info-label">Response Time</div>
                <div class="info-value">{{ selectedHelper.responseTime }}</div>
              </div>
            </div>
          </div>

          <div class="modal-section">
            <h3 class="section-title">About</h3>
            <p class="section-text">{{ selectedHelper.bio }}</p>
          </div>

          <div class="modal-section">
            <h3 class="section-title">Skills & Expertise</h3>
            <div class="skills-list">
              <span
                v-for="skill in selectedHelper.skills"
                :key="skill"
                class="skill-tag"
              >
                {{ skill }}
              </span>
            </div>
          </div>

          <div class="modal-section">
            <h3 class="section-title">Experience & Qualifications</h3>
            <ul class="experience-list">
              <li v-for="(exp, index) in selectedHelper.experience" :key="index">
                {{ exp }}
              </li>
            </ul>
          </div>

          <div class="modal-section">
            <h3 class="section-title">Contact Information</h3>
            <p class="section-text">
              <strong>Email:</strong> {{ selectedHelper.contactEmail }}
            </p>
          </div>

          <button class="chat-btn" @click="startChat">
            💬 Start Chat
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.page-wrapper {
  min-height: 100vh;
  background: linear-gradient(to bottom, #f8f9fa 0%, #e9ecef 100%);
  padding: 2rem 1rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

/* Header */
.header-section {
  text-align: center;
  margin-bottom: 3rem;
}

.main-title {
  font-size: 3.5rem;
  font-weight: 700;
  color: #6C5B7F;
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: 1.25rem;
  color: #6b7280;
  margin: 0;
}

/* Search Card */
.search-card {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  margin-bottom: 2rem;
}

.search-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .search-grid {
    grid-template-columns: 1fr;
  }
}

.search-group {
  display: flex;
  flex-direction: column;
}

.search-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.search-input,
.search-select {
  padding: 0.875rem 1rem;
  font-size: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  transition: all 0.2s;
  background: white;
}

.search-input:focus,
.search-select:focus {
  outline: none;
  border-color: #6C5B7F;
  box-shadow: 0 0 0 3px rgba(108, 91, 127, 0.1);
}

.search-input::placeholder {
  color: #9ca3af;
}

/* Selected Filters */
.selected-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #E8E3ED;
  color: #4A3F5C;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid #C7BDD6;
}

.remove-filter {
  background: none;
  border: none;
  color: #4A3F5C;
  cursor: pointer;
  font-size: 1.125rem;
  line-height: 1;
  padding: 0;
  margin-left: 0.25rem;
  transition: all 0.2s;
}

.remove-filter:hover {
  transform: scale(1.2);
  color: #6C5B7F;
}

.clear-btn {
  padding: 0.5rem 1rem;
  background: transparent;
  color: #dc2626;
  border: none;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  color: #991b1b;
  text-decoration: underline;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #6b7280;
}

.spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid #e5e7eb;
  border-top-color: #6C5B7F;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #6b7280;
  font-size: 1.125rem;
}

/* Helpers Grid */
.helpers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .helpers-grid {
    grid-template-columns: 1fr;
  }
}

/* Helper Card */
.helper-card {
  background: white;
  border-radius: 1rem;
  padding: 1.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #f3f4f6;
  display: flex;
  gap: 1rem;
}

.helper-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.helper-avatar {
  font-size: 3.5rem;
  width: 4.5rem;
  height: 4.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  border-radius: 0.75rem;
  flex-shrink: 0;
}

.helper-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.helper-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
  gap: 1rem;
}

.helper-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.25rem 0;
  line-height: 1.3;
}

.helper-title {
  font-size: 0.95rem;
  color: #6b7280;
  margin: 0;
  font-weight: 500;
}

.helper-stats {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
}

.stars {
  font-size: 1rem;
  line-height: 1;
}

.rating-text {
  font-weight: 600;
  color: #374151;
}

.jobs-count {
  color: #6b7280;
  font-weight: 500;
}

.helper-description {
  color: #4b5563;
  line-height: 1.6;
  margin: 0 0 1rem 0;
  font-size: 0.95rem;
  flex-grow: 1;
}

.helper-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 0.5rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
}

.icon {
  font-size: 1rem;
}

.skills-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.skill-badge {
  display: inline-block;
  padding: 0.375rem 0.75rem;
  background: #E8E3ED;
  color: #4A3F5C;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border: 1px solid #C7BDD6;
}

.more-skills {
  display: inline-block;
  padding: 0.375rem 0.75rem;
  color: #6b7280;
  font-size: 0.8125rem;
  font-weight: 500;
}

.view-profile-btn {
  width: 100%;
  padding: 0.875rem;
  background: #1f2937;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.view-profile-btn:hover {
  background: #111827;
  transform: translateY(-1px);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  animation: slideUp 0.3s;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(20px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: #f3f4f6;
  border: none;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: #6b7280;
}

.close-btn:hover {
  background: #e5e7eb;
  color: #111827;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-right: 2rem;
}

.profile-section {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.profile-avatar-large {
  font-size: 4rem;
  width: 5rem;
  height: 5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  border-radius: 0.75rem;
  flex-shrink: 0;
}

.modal-name {
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.25rem 0;
}

.modal-title {
  font-size: 1.125rem;
  color: #6b7280;
  margin: 0 0 0.5rem 0;
  font-weight: 500;
}

.modal-stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  color: #374151;
}

.separator {
  color: #d1d5db;
}

.rate-badge {
  background: #16a34a;
  color: white;
  padding: 0.75rem 1.25rem;
  border-radius: 0.5rem;
  font-size: 1.25rem;
  font-weight: 700;
  white-space: nowrap;
}

.modal-quick-info {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 0.75rem;
}

@media (max-width: 640px) {
  .modal-quick-info {
    grid-template-columns: 1fr;
  }
}

.info-item {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.info-label {
  font-size: 0.8125rem;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.info-value {
  font-size: 0.95rem;
  color: #111827;
  font-weight: 600;
}

.modal-section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 1rem 0;
}

.section-text {
  color: #4b5563;
  line-height: 1.7;
  margin: 0;
}

.skills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.skill-tag {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: #E8E3ED;
  color: #4A3F5C;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid #C7BDD6;
}

.experience-list {
  margin: 0;
  padding-left: 1.5rem;
  color: #4b5563;
  line-height: 1.8;
}

.experience-list li {
  margin-bottom: 0.5rem;
}

.chat-btn {
  width: 100%;
  padding: 1rem;
  background: #6C5B7F;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 1rem;
}

.chat-btn:hover {
  background: #5A4C6B;
  transform: translateY(-1px);
  box-shadow: 0 10px 15px -3px rgba(108, 91, 127, 0.3);
}
</style>