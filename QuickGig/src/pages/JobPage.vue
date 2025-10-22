<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '../supabase/config';

const router = useRouter();
const jobs = ref([]);
const searchTerm = ref('');
const selectedCategory = ref('');
const isLoading = ref(true);
const isLoggedIn = ref(false);

// Categories list
const categories = [
  'Construction',
  'Tech', 
  'Home',
  'Pets',
  'Cleaning',
  'Moving',
  'Landscaping',
  'Other'
];

// Check if user is logged in
const checkLoginStatus = () => {
  isLoggedIn.value = localStorage.getItem('isLoggedIn') === 'true';
};

// Fetch jobs from Supabase
const fetchJobs = async () => {
  try {
    isLoading.value = true;
    
    console.log('Fetching jobs from Supabase...');
    
    const { data: jobsData, error: jobsError } = await supabase
      .from('User-Job-Request')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (jobsError) throw jobsError;

    console.log('Jobs fetched:', jobsData);

    // Fetch user data for each job
    const transformedJobs = await Promise.all(jobsData.map(async (job) => {
      let postedBy = 'Anonymous';
      let contactEmail = 'N/A';
      
      console.log('Job user_id:', job.user_id);
      
      if (job.user_id) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('username')
          .eq('id', job.user_id)
          .single();
        
        console.log('User data for job:', userData, 'Error:', userError);
        
        if (!userError && userData) {
          postedBy = userData.username || 'Anonymous';
          contactEmail = 'Contact via chat'; // Don't expose email publicly
        }
      }
      
      console.log('Final postedBy:', postedBy, 'Email:', contactEmail);

      return {
        id: job.id,
        name: job.title,
        description: job.description,
        budget: `$${job.payment}`,
        skills: ['General'],
        location: job.location,
        postal_code: job.postal_code, // ADDED: Pass postal code for map
        coordinates: job.coordinates, // ADDED: Pass coordinates from database
        date: new Date(job.created_at).toLocaleDateString('en-GB'),
        category: job.category || 'Other',
        fullDescription: job.description,
        requirements: ['Contact poster for details'],
        postedBy: postedBy,
        contactEmail: contactEmail,
        userId: job.user_id
      };
    }));

    jobs.value = transformedJobs;
    console.log('Final jobs array:', jobs.value);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    jobs.value = [];
  } finally {
    isLoading.value = false;
  }
};

// Fetch jobs when component mounts
onMounted(() => {
  checkLoginStatus();
  fetchJobs();
  
  // Listen for login/logout events
  window.addEventListener('user-logged-in', checkLoginStatus);
  window.addEventListener('user-logged-out', checkLoginStatus);
});

const filteredJobs = computed(() => {
  const term = searchTerm.value.toLowerCase().trim();
  const category = selectedCategory.value;
  let result = jobs.value;

  if (term) {
    result = result.filter(
      job =>
        job.name.toLowerCase().includes(term) ||
        job.description.toLowerCase().includes(term) ||
        job.location.toLowerCase().includes(term) // <-- ADD THIS LINE
    );
  }

  if (category) {
    result = result.filter(job => job.category === category);
  }

  return result;
});

const clearFilters = () => {
  searchTerm.value = '';
  selectedCategory.value = '';
};

// Navigate to job details page instead of opening modal
const viewJobDetails = (job) => {
  // Store job data in localStorage temporarily for the details page
  localStorage.setItem('selectedJob', JSON.stringify(job));
  // Navigate to job details page with job ID
  router.push(`/job/${job.id}`);
};
</script>

<template>
  <div class="page-wrapper">
    <div class="container">
      <!-- Header -->
      <div class="header-section">
        <h1 class="main-title">Odd Jobs Hub</h1>
        <p class="subtitle">Find the perfect side gig or hire the best talent.</p>
      </div>

      <!-- Search and Filter Card -->
      <div class="search-card">
        <div class="search-grid">
          <div class="search-group">
            <label class="search-label">Search Jobs</label>
            <input
              v-model="searchTerm"
              placeholder="Search by job title or description..."
              class="search-input"
            />
          </div>

          <div class="search-group">
            <label class="search-label">Filter by Category</label>
            <select 
              v-model="selectedCategory"
              class="search-select"
            >
              <option value="">-- Select a category --</option>
              <option value="Construction">Construction</option>
              <option value="Tech">Tech</option>
              <option value="Home">Home</option>
              <option value="Pets">Pets</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Moving">Moving</option>
              <option value="Landscaping">Landscaping</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div v-if="selectedCategory" class="selected-filters">
          <span class="filter-tag">
            Category: {{ selectedCategory }} 
            <button @click="selectedCategory = ''" class="remove-filter">✕</button>
          </span>
          <button class="clear-btn" @click="clearFilters">
            Clear All
          </button>
        </div>
      </div>

      <!-- Job Cards -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading jobs...</p>
      </div>

      <div v-else-if="filteredJobs.length === 0" class="empty-state">
        <p>No jobs found matching your criteria.</p>
      </div>

      <div v-else class="jobs-grid">
        <div
          v-for="job in filteredJobs"
          :key="job.id"
          class="job-card"
        >
          <div class="job-header">
            <h2 class="job-title">{{ job.name }}</h2>
            <span class="job-category">{{ job.category }}</span>
          </div>
          
          <p class="job-description">{{ job.description }}</p>
          
          <div class="job-meta">
            <div class="meta-item">
              <span class="meta-label">Price:</span>
              <span class="meta-text">{{ job.budget }}</span>
            </div>
            <div class="meta-item">
              <span class="icon">📍</span>
              <span class="meta-text">{{ job.location }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Date:</span>
              <span class="meta-text">{{ job.date }}</span>
            </div>
          </div>
          
          <button class="view-details-btn" @click="viewJobDetails(job)">
            View Details
          </button>
        </div>
      </div>
    </div>

    <!-- Post Job Button (Fixed) - Only shown when logged in -->
    <router-link v-if="isLoggedIn" to="/request" class="post-job-btn">
      <span class="plus-icon">+</span>
      <span class="btn-text">Post Job</span>
    </router-link>
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
  color: #2563eb;
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
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
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
  background: #dbeafe;
  color: #1e40af;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid #93c5fd;
}

.remove-filter {
  background: none;
  border: none;
  color: #1e40af;
  cursor: pointer;
  font-size: 1.125rem;
  line-height: 1;
  padding: 0;
  margin-left: 0.25rem;
  transition: all 0.2s;
}

.remove-filter:hover {
  transform: scale(1.2);
  color: #1d4ed8;
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
  border-top-color: #2563eb;
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

/* Jobs Grid */
.jobs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .jobs-grid {
    grid-template-columns: 1fr;
  }
}

/* Job Card */
.job-card {
  background: white;
  border-radius: 1rem;
  padding: 1.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #f3f4f6;
  display: flex;
  flex-direction: column;
}

.job-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.job-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
}

.job-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
  flex: 1;
  line-height: 1.4;
}

.job-category {
  background: #f3f4f6;
  color: #6b7280;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
}

.job-description {
  color: #6b7280;
  line-height: 1.6;
  margin: 0 0 1.5rem 0;
  font-size: 0.95rem;
  flex-grow: 1;
}

.job-meta {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  color: #374151;
}

.meta-label {
  font-weight: 600;
  color: #6b7280;
}

.icon {
  font-size: 1.125rem;
}

.meta-text {
  font-weight: 500;
}

.view-details-btn {
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

.view-details-btn:hover {
  background: #111827;
  transform: translateY(-1px);
}

/* Post Job Button (Fixed) */
.post-job-btn {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: #2563eb;
  color: white;
  text-decoration: none;
  border-radius: 9999px;
  font-size: 1.125rem;
  font-weight: 600;
  box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.5);
  cursor: pointer;
  transition: all 0.3s;
  z-index: 999;
}

.post-job-btn:hover {
  background: #1d4ed8;
  transform: translateY(-2px);
  box-shadow: 0 15px 30px -5px rgba(37, 99, 235, 0.6);
}

.plus-icon {
  font-size: 1.5rem;
  font-weight: 300;
  line-height: 1;
}

.btn-text {
  white-space: nowrap;
}

@media (max-width: 640px) {
  .post-job-btn {
    bottom: 1.5rem;
    right: 1.5rem;
    padding: 0.875rem 1.25rem;
    font-size: 1rem;
  }
  
  .plus-icon {
    font-size: 1.25rem;
  }
}
</style>