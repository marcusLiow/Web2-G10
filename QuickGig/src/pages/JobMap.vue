<template>
  <div class="map-page-wrapper">
    <div class="map-page">
    
    <!-- Overlay for mobile (when sidebar is open) - MOVED BEFORE SIDEBAR -->
    <div 
      v-if="!isSidebarCollapsed"
      class="sidebar-overlay"
      @click="toggleSidebar"
    ></div>
    
    <!-- Left Sidebar -->
    <div 
      class="sidebar" 
      :class="{ 'sidebar-collapsed': isSidebarCollapsed }"
      :style="{ width: isSidebarCollapsed ? '0' : `${sidebarWidth}px` }"
    >
      <!-- Sidebar Header with Toggle -->
      <div class="sidebar-header">
        <h2 class="sidebar-title">Job Search</h2>
        <button class="sidebar-close-btn" @click="toggleSidebar" title="Close sidebar">
          <span>←</span>
        </button>
      </div>

      <div class="sidebar-content">
        <!-- Search Bar -->
        <div class="search-container">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search jobs or location..."
              class="search-input"
              @input="handleSearch"
            />
            <button v-if="searchQuery" class="clear-btn" @click="clearSearch">✕</button>
          </div>
        </div>

        <!-- Filters Section -->
        <div class="filters-section">
          <div class="filter-group">
            <label class="filter-label">Category</label>
            <select v-model="selectedCategory" class="filter-select" @change="applyFilters">
              <option value="">All Categories</option>
              <option v-for="category in categories" :key="category" :value="category">
                {{ category }}
              </option>
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label">Location</label>
            <input
              v-model="locationFilter"
              type="text"
              placeholder="Enter location..."
              class="filter-input"
              @input="applyFilters"
            />
          </div>

          <div class="filter-group">
            <label class="filter-label">Budget Range</label>
            <div class="budget-range">
              <input
                v-model.number="minBudget"
                type="number"
                placeholder="Min"
                class="budget-input"
                @input="applyFilters"
              />
              <span class="budget-separator">-</span>
              <input
                v-model.number="maxBudget"
                type="number"
                placeholder="Max"
                class="budget-input"
                @input="applyFilters"
              />
            </div>
          </div>

          <div class="filter-actions">
            <button @click="clearFilters" class="clear-filters-btn">Clear Filters</button>
            <div class="results-count">{{ filteredJobs.length }} results</div>
          </div>
        </div>

        <!-- Jobs List -->
        <div class="jobs-list">
          <div
            v-for="job in filteredJobs"
            :key="job.id"
            class="job-card"
            :class="{ 'job-card-selected': selectedJob?.id === job.id }"
            @click="selectJobFromList(job)"
            @mouseenter="highlightMarker(job)"
            @mouseleave="unhighlightMarker"
          >
            <div class="job-card-image" v-if="job.images && job.images.length > 0">
              <img :src="job.images[0]" :alt="job.title" />
            </div>
            <div class="job-card-image-placeholder" v-else>
              <span class="placeholder-icon">📋</span>
            </div>
            
            <div class="job-card-content">
              <h3 class="job-card-title">{{ job.title }}</h3>
              
              <div class="job-card-category">
                <span class="category-badge">{{ job.category }}</span>
              </div>
              
              <div class="job-card-price">${{ job.payment }}</div>
              
              <div class="job-card-location">
                <span class="location-icon">📍</span>
                {{ job.location }}
              </div>
              
              <div class="job-card-description">
                {{ truncateText(job.description, 80) }}
              </div>
              
              <div class="job-card-footer">
                <span class="job-card-date">{{ job.date }}</span>
                <button @click.stop="viewJobDetails(job)" class="view-details-btn">
                  View Details →
                </button>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="filteredJobs.length === 0" class="empty-state">
            <span class="empty-icon">🔍</span>
            <p>No jobs found matching your criteria</p>
            <button @click="clearFilters" class="clear-filters-btn">Clear Filters</button>
          </div>
        </div>
      </div>
      
      <!-- Resize Handle -->
      <div 
        v-if="!isSidebarCollapsed"
        class="resize-handle"
        @mousedown="startResize"
        @touchstart="startResize"
      >
        <div class="resize-handle-line"></div>
      </div>
    </div>

    <!-- Sidebar Open Button (when collapsed) -->
    <button 
      v-if="isSidebarCollapsed"
      class="sidebar-open-btn" 
      @click="toggleSidebar"
      title="Open sidebar"
    >
      <span>→</span>
      <span class="open-btn-text">Jobs</span>
    </button>

    <!-- Map Container -->
    <div class="map-container">
      <GoogleMap
        v-if="isGoogleMapsLoaded && jobs.length > 0"
        :api-key="apiKey"
        :center="mapCenter"
        :zoom="mapZoom"
        class="google-map"
        :options="{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: true
        }"
      >
        <!-- Markers for each filtered job -->
        <Marker
          v-for="job in filteredJobs"
          :key="job.id"
          :options="{ 
            position: job.coordinates,
            title: job.title,
            icon: getMarkerIcon(job)
          }"
          @click="selectJob(job)"
        />

        <!-- Info Window Popup -->
        <InfoWindow
          v-if="selectedJob"
          :options="{ 
            position: selectedJob.coordinates,
            pixelOffset: { width: 0, height: -35 }
          }"
          @closeclick="closeJobPopup"
        >
          <div class="job-popup">
            <div v-if="selectedJob.images && selectedJob.images.length > 0" class="popup-image">
              <img :src="selectedJob.images[0]" :alt="selectedJob.title" />
            </div>
            
            <h3>{{ selectedJob.title }}</h3>
            <div class="popup-category">{{ selectedJob.category }}</div>
            <div class="popup-price">${{ selectedJob.payment }}</div>
            <div class="popup-location">📍 {{ selectedJob.location }}</div>
            <div class="popup-description">{{ selectedJob.description }}</div>
            <div class="popup-date">Posted: {{ selectedJob.date }}</div>
            
            <button @click="viewJobDetails(selectedJob)" class="view-btn">
              View Full Details
            </button>
          </div>
        </InfoWindow>
      </GoogleMap>

      <!-- Loading State -->
      <div v-else-if="!isGoogleMapsLoaded" class="loading-container">
        <div class="spinner"></div>
        <p>Loading map and jobs...</p>
      </div>

      <!-- No Jobs State -->
      <div v-else class="no-jobs-container">
        <p>No job listings available at the moment</p>
      </div>

      <!-- Search This Area Button -->
      <button
        v-if="jobs.length > 0 && !isSidebarCollapsed"
        class="search-area-btn"
        @click="searchCurrentArea"
      >
        🔍 Search this area
      </button>
    </div>
  </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '../supabase/config';
import { GoogleMap, Marker, InfoWindow } from 'vue3-google-map';

export default {
  name: 'JobMap',
  components: {
    GoogleMap,
    Marker,
    InfoWindow
  },
  setup() {
    const router = useRouter();
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const jobs = ref([]);
    const isGoogleMapsLoaded = ref(false);
    const selectedJob = ref(null);
    const hoveredJob = ref(null);
    const isSidebarCollapsed = ref(false);
    const sidebarWidth = ref(420);
    const isResizing = ref(false);
    
    // Filter states
    const searchQuery = ref('');
    const selectedCategory = ref('');
    const locationFilter = ref('');
    const minBudget = ref(null);
    const maxBudget = ref(null);
    
    const mapCenter = ref({ lat: 1.3521, lng: 103.8198 }); // Singapore center
    const mapZoom = ref(12);

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

    // Filtered jobs based on all filters
    const filteredJobs = computed(() => {
      let filtered = jobs.value;

      // Search query filter (searches title, description, location)
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(job =>
          job.title.toLowerCase().includes(query) ||
          job.description.toLowerCase().includes(query) ||
          job.location.toLowerCase().includes(query) ||
          job.category.toLowerCase().includes(query)
        );
      }

      // Category filter
      if (selectedCategory.value) {
        filtered = filtered.filter(job => job.category === selectedCategory.value);
      }

      // Location filter
      if (locationFilter.value) {
        const locQuery = locationFilter.value.toLowerCase();
        filtered = filtered.filter(job =>
          job.location.toLowerCase().includes(locQuery) ||
          (job.postal_code && job.postal_code.toLowerCase().includes(locQuery))
        );
      }

      // Budget filter
      if (minBudget.value !== null && minBudget.value !== '') {
        filtered = filtered.filter(job => parseFloat(job.payment) >= minBudget.value);
      }
      if (maxBudget.value !== null && maxBudget.value !== '') {
        filtered = filtered.filter(job => parseFloat(job.payment) <= maxBudget.value);
      }

      return filtered;
    });

    // Watch filtered jobs and update map center
    watch(filteredJobs, (newFilteredJobs) => {
      if (newFilteredJobs.length > 0) {
        const avgLat = newFilteredJobs.reduce((sum, job) => sum + job.coordinates.lat, 0) / newFilteredJobs.length;
        const avgLng = newFilteredJobs.reduce((sum, job) => sum + job.coordinates.lng, 0) / newFilteredJobs.length;
        mapCenter.value = { lat: avgLat, lng: avgLng };
      }
    });

    // Geocode address to get coordinates
    const geocodeAddress = async (address) => {
      if (!address || !apiKey) return null;

      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address + ', Singapore')}&key=${apiKey}`
        );
        const data = await response.json();
        
        if (data.status === 'OK' && data.results.length > 0) {
          return {
            lat: data.results[0].geometry.location.lat,
            lng: data.results[0].geometry.location.lng
          };
        }
      } catch (error) {
        console.error('Geocoding error:', error);
      }
      
      return null;
    };

    // Fetch jobs from database
    const fetchJobs = async () => {
      try {
        const { data, error } = await supabase
          .from('User-Job-Request')
          .select('*');

        if (error) throw error;
        if (!data || data.length === 0) {
          jobs.value = [];
          return;
        }

        const jobPromises = data.map(async (job) => {
          let coordinates = null;

          if (job.coordinates) {
            try {
              coordinates = typeof job.coordinates === 'string' 
                ? JSON.parse(job.coordinates) 
                : job.coordinates;
              
              if (coordinates && 
                  typeof coordinates.lat === 'number' && 
                  typeof coordinates.lng === 'number' &&
                  !isNaN(coordinates.lat) && 
                  !isNaN(coordinates.lng)) {
                // Valid coordinates
              } else {
                coordinates = null;
              }
            } catch (e) {
              coordinates = null;
            }
          }

          if (!coordinates && job.location) {
            coordinates = await geocodeAddress(job.location);
          }

          if (!coordinates && job.postal_code) {
            coordinates = await geocodeAddress(job.postal_code);
          }

          if (!coordinates) {
            coordinates = {
              lat: 1.3521 + (Math.random() - 0.5) * 0.1,
              lng: 103.8198 + (Math.random() - 0.5) * 0.1
            };
          }

          const title = job.title || job.name || 'Untitled Job';
          const description = job.description || job.fullDescription || job.full_description || 'No description';
          const payment = job.payment || job.budget?.replace('$', '') || '0';
          const postedBy = job.posted_by || job.postedBy || job.user_name || 'Anonymous';
          const skills = job.skills || [];
          
          return {
            id: job.id,
            title: title,
            name: title,
            description: description,
            fullDescription: description,
            category: job.category || 'Other',
            location: job.location || 'Location not specified',
            payment: payment,
            budget: `$${payment}`,
            coordinates: coordinates,
            images: job.images || [],
            date: job.created_at ? new Date(job.created_at).toLocaleDateString('en-GB') : 'N/A',
            userId: job.user_id || job.userId,
            postedBy: postedBy,
            skills: skills,
            postal_code: job.postal_code || '',
            expiration_date: job.expiration_date || null
          };
        });

        jobs.value = await Promise.all(jobPromises);

        if (jobs.value.length > 0) {
          const avgLat = jobs.value.reduce((sum, job) => sum + job.coordinates.lat, 0) / jobs.value.length;
          const avgLng = jobs.value.reduce((sum, job) => sum + job.coordinates.lng, 0) / jobs.value.length;
          mapCenter.value = { lat: avgLat, lng: avgLng };
        }

      } catch (error) {
        console.error('Error in fetchJobs:', error);
      }
    };

    const selectJob = (job) => {
      selectedJob.value = job;
      // Scroll to job in sidebar
      setTimeout(() => {
        const jobCard = document.querySelector(`.job-card[data-job-id="${job.id}"]`);
        if (jobCard) {
          jobCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    };

    const selectJobFromList = (job) => {
      selectedJob.value = job;
      // Center map on selected job
      mapCenter.value = { ...job.coordinates };
      mapZoom.value = 15;
    };

    const closeJobPopup = () => {
      selectedJob.value = null;
    };

    const viewJobDetails = async (job) => {
      if (!job) return;
      
      try {
        const { data: jobData, error } = await supabase
          .from('User-Job-Request')
          .select('*')
          .eq('id', job.id)
          .single();
        
        if (error) {
          const jobForStorage = {
            id: job.id,
            name: job.title,
            title: job.title,
            fullDescription: job.description,
            description: job.description,
            category: job.category,
            location: job.location,
            budget: `$${job.payment}`,
            payment: job.payment,
            coordinates: job.coordinates,
            images: job.images || [],
            date: job.date,
            userId: job.userId,
            postedBy: job.postedBy || 'Anonymous',
            skills: job.skills || [],
            postal_code: job.postal_code || ''
          };
          
          localStorage.setItem('selectedJob', JSON.stringify(jobForStorage));
        } else {
          const jobForStorage = {
            ...jobData,
            name: jobData.name || jobData.title,
            title: jobData.title || jobData.name,
            fullDescription: jobData.full_description || jobData.description,
            budget: jobData.budget || `$${jobData.payment}`,
            postedBy: jobData.posted_by || jobData.postedBy || 'Anonymous',
            date: jobData.created_at ? new Date(jobData.created_at).toLocaleDateString('en-GB') : job.date
          };
          
          localStorage.setItem('selectedJob', JSON.stringify(jobForStorage));
        }
        
        router.push(`/job/${job.id}`);
        
      } catch (error) {
        console.error('Error navigating to job details:', error);
      }
    };

    const handleSearch = () => {
      applyFilters();
    };

    const clearSearch = () => {
      searchQuery.value = '';
      applyFilters();
    };

    const applyFilters = () => {
      // Filters are automatically applied through computed property
      // This function can be used for additional actions if needed
    };

    const clearFilters = () => {
      searchQuery.value = '';
      selectedCategory.value = '';
      locationFilter.value = '';
      minBudget.value = null;
      maxBudget.value = null;
      
      // Reset map view
      if (jobs.value.length > 0) {
        const avgLat = jobs.value.reduce((sum, job) => sum + job.coordinates.lat, 0) / jobs.value.length;
        const avgLng = jobs.value.reduce((sum, job) => sum + job.coordinates.lng, 0) / jobs.value.length;
        mapCenter.value = { lat: avgLat, lng: avgLng };
        mapZoom.value = 12;
      }
    };

    const toggleSidebar = () => {
      isSidebarCollapsed.value = !isSidebarCollapsed.value;
    };

    const startResize = (e) => {
      isResizing.value = true;
      e.preventDefault();
      
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', stopResize);
      document.addEventListener('touchmove', handleResize);
      document.addEventListener('touchend', stopResize);
      
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    };

    const handleResize = (e) => {
      if (!isResizing.value) return;
      
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const newWidth = clientX;
      
      // Set min and max width constraints
      if (newWidth >= 320 && newWidth <= 600) {
        sidebarWidth.value = newWidth;
      }
    };

    const stopResize = () => {
      isResizing.value = false;
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', stopResize);
      document.removeEventListener('touchmove', handleResize);
      document.removeEventListener('touchend', stopResize);
      
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    const highlightMarker = (job) => {
      hoveredJob.value = job;
    };

    const unhighlightMarker = () => {
      hoveredJob.value = null;
    };

    const getMarkerIcon = (job) => {
      const isSelected = selectedJob.value?.id === job.id;
      const isHovered = hoveredJob.value?.id === job.id;
      
      if (isSelected || isHovered) {
        return {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="40" height="52" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 0C8.95 0 0 8.95 0 20c0 15 20 32 20 32s20-17 20-32C40 8.95 31.05 0 20 0z" fill="#DC2626"/>
              <circle cx="20" cy="20" r="10" fill="white"/>
            </svg>
          `),
          scaledSize: { width: 40, height: 52 }
        };
      }
      
      return {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26s16-14 16-26C32 7.16 24.84 0 16 0z" fill="#EF4444"/>
            <circle cx="16" cy="16" r="8" fill="white"/>
          </svg>
        `),
        scaledSize: { width: 32, height: 42 }
      };
    };

    const searchCurrentArea = () => {
      // This would typically search based on current map bounds
      // For now, it applies current filters
      console.log('Searching current area...');
    };

    const truncateText = (text, maxLength) => {
      if (!text) return '';
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength) + '...';
    };

    onMounted(async () => {
      await fetchJobs();
      isGoogleMapsLoaded.value = true;
      
      // Check if window is mobile-sized and collapse sidebar
      if (window.innerWidth < 768) {
        isSidebarCollapsed.value = true;
      }
    });

    return {
      apiKey,
      jobs,
      filteredJobs,
      isGoogleMapsLoaded,
      mapCenter,
      mapZoom,
      selectedJob,
      hoveredJob,
      isSidebarCollapsed,
      sidebarWidth,
      isResizing,
      searchQuery,
      selectedCategory,
      locationFilter,
      minBudget,
      maxBudget,
      categories,
      selectJob,
      selectJobFromList,
      closeJobPopup,
      viewJobDetails,
      handleSearch,
      clearSearch,
      applyFilters,
      clearFilters,
      toggleSidebar,
      startResize,
      highlightMarker,
      unhighlightMarker,
      getMarkerIcon,
      searchCurrentArea,
      truncateText
    };
  }
};
</script>

<style scoped>
.map-page-wrapper {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  padding-top: 92px; /* Navbar height: 60px logo + 2rem padding */
}

.map-page {
  display: flex;
  height: 100%;
  width: 100%;
  max-width: 100vw;
  overflow: hidden;
  position: relative;
}

/* Sidebar Styles */
.sidebar {
  min-width: 0;
  max-width: 600px;
  height: 100%;
  background: white;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease, box-shadow 0.3s ease;
  z-index: 100;
  position: relative;
  overflow: hidden;
}

.sidebar-collapsed {
  width: 0 !important;
  box-shadow: none;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  background: white;
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.sidebar-close-btn {
  width: 36px;
  height: 36px;
  background: #f3f4f6;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: #6b7280;
  transition: all 0.2s;
}

.sidebar-close-btn:hover {
  background: #e5e7eb;
  color: #1f2937;
}

.sidebar-open-btn {
  position: fixed;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  background: white;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 0 8px 8px 0;
  padding: 1rem 0.75rem;
  cursor: pointer;
  z-index: 99;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.sidebar-open-btn:hover {
  background: #f9fafb;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  padding-right: 1rem;
}

.sidebar-open-btn span:first-child {
  font-size: 1.5rem;
  color: #DC2626;
}

.open-btn-text {
  writing-mode: vertical-rl;
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  letter-spacing: 0.05em;
}

.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  z-index: 101;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.resize-handle:hover {
  background: rgba(220, 38, 38, 0.1);
}

.resize-handle:hover .resize-handle-line {
  background: #DC2626;
}

.resize-handle-line {
  width: 2px;
  height: 40px;
  background: #d1d5db;
  border-radius: 1px;
  transition: all 0.2s;
}

.sidebar-overlay {
  display: none;
}

.sidebar-toggle {
  display: none;
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Search Bar */
.search-container {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  background: white;
  flex-shrink: 0;
}

.search-box {
  display: flex;
  align-items: center;
  background: #f3f4f6;
  border-radius: 24px;
  padding: 0.75rem 1rem;
  gap: 0.75rem;
  transition: background 0.2s;
}

.search-box:focus-within {
  background: #e5e7eb;
}

.search-icon {
  font-size: 1.1rem;
  color: #6b7280;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 0.95rem;
  color: #1f2937;
}

.search-input::placeholder {
  color: #9ca3af;
}

.clear-btn {
  background: transparent;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
}

.clear-btn:hover {
  background: #d1d5db;
}

/* Filters Section */
.filters-section {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  background: #fafafa;
  flex-shrink: 0;
}

.filter-group {
  margin-bottom: 1rem;
}

.filter-group:last-child {
  margin-bottom: 0;
}

.filter-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.filter-select,
.filter-input {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  background: white;
  transition: border-color 0.2s;
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: #DC2626;
}

.budget-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.budget-input {
  flex: 1;
  padding: 0.625rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  background: white;
}

.budget-input:focus {
  outline: none;
  border-color: #DC2626;
}

.budget-separator {
  color: #9ca3af;
  font-weight: 500;
}

.filter-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.clear-filters-btn {
  padding: 0.5rem 1rem;
  background: transparent;
  color: #DC2626;
  border: 1px solid #DC2626;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-filters-btn:hover {
  background: #DC2626;
  color: white;
}

.results-count {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

/* Jobs List */
.jobs-list {
  flex: 0 0 auto;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1rem 0;
  max-height: 600px;
}

.job-card {
  display: flex;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  transition: background 0.2s;
}

.job-card:hover {
  background: #f9fafb;
}

.job-card-selected {
  background: #fef2f2;
  border-left: 3px solid #DC2626;
}

.job-card-selected:hover {
  background: #fef2f2;
}

.job-card-image,
.job-card-image-placeholder {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.job-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.job-card-image-placeholder {
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-icon {
  font-size: 2rem;
  opacity: 0.5;
}

.job-card-content {
  flex: 1;
  min-width: 0;
}

.job-card-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.job-card-category {
  margin-bottom: 0.5rem;
}

.category-badge {
  display: inline-block;
  background: #f3f4f6;
  color: #4b5563;
  padding: 0.25rem 0.625rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.job-card-price {
  font-size: 1.25rem;
  font-weight: 700;
  color: #059669;
  margin: 0.25rem 0 0.5rem 0;
}

.job-card-location {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.location-icon {
  font-size: 0.875rem;
}

.job-card-description {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.job-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
}

.job-card-date {
  font-size: 0.75rem;
  color: #9ca3af;
}

.view-details-btn {
  background: transparent;
  color: #DC2626;
  border: none;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.view-details-btn:hover {
  background: #fee2e2;
}

/* Empty State */
.empty-state {
  padding: 3rem 1.25rem;
  text-align: center;
  color: #9ca3af;
}

.empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state p {
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

/* Map Container */
.map-container {
  flex: 1;
  position: relative;
  height: 100%;
}

.google-map {
  width: 100%;
  height: 100%;
}

/* Job Popup */
.job-popup {
  padding: 1rem;
  max-width: 300px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.popup-image {
  width: 100%;
  height: 150px;
  margin-bottom: 0.75rem;
  border-radius: 8px;
  overflow: hidden;
}

.popup-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.job-popup h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 0.5rem 0;
}

.popup-category {
  display: inline-block;
  background: #f3f4f6;
  color: #4b5563;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.popup-price {
  font-size: 1.5rem;
  font-weight: 700;
  color: #059669;
  margin: 0.5rem 0;
}

.popup-location {
  font-size: 0.9rem;
  color: #4b5563;
  margin: 0.5rem 0;
}

.popup-description {
  font-size: 0.9rem;
  color: #6b7280;
  margin: 0.75rem 0;
  line-height: 1.5;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.popup-date {
  font-size: 0.85rem;
  color: #9ca3af;
  margin: 0.5rem 0 0.75rem 0;
}

.view-btn {
  display: block;
  width: 100%;
  padding: 0.75rem;
  background: #DC2626;
  color: white;
  text-align: center;
  text-decoration: none;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  transition: background 0.2s;
  margin-top: 0.75rem;
  cursor: pointer;
  font-family: inherit;
}

.view-btn:hover {
  background: #b91c1c;
}

/* Search Area Button */
.search-area-btn {
  position: absolute;
  top: 1.25rem;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  color: #1f2937;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 24px;
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all 0.2s;
  z-index: 10;
}

.search-area-btn:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  background: #f9fafb;
}

/* Loading State */
.loading-container,
.no-jobs-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6b7280;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #DC2626;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Scrollbar Styling */
.jobs-list::-webkit-scrollbar {
  width: 8px;
}

.jobs-list::-webkit-scrollbar-track {
  background: #f3f4f6;
}

.jobs-list::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

.jobs-list::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* Responsive */
@media (max-width: 1024px) {
  .sidebar {
    max-width: 400px;
  }
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed !important;
    width: 85% !important;
    max-width: 400px;
    height: 100vh !important;
    left: 0;
    top: 0 !important;
    z-index: 100;
    transform: translateX(0);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
    padding-top: 130px;
  }
  
  .sidebar-collapsed {
    transform: translateX(-100%) !important;
    width: 85% !important;
    box-shadow: none;
  }
  
  .sidebar-overlay {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 99;
    animation: fadeIn 0.3s ease;
    backdrop-filter: blur(2px);
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  .sidebar-open-btn {
    position: fixed;
    left: 1rem;
    top: calc(130px + 1rem);
    transform: none;
    border-radius: 12px;
    padding: 0.875rem 1.25rem;
    flex-direction: row;
    gap: 0.625rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    z-index: 101;
    animation: slideIn 0.3s ease;
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(-100px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .sidebar-open-btn:hover {
    padding: 0.875rem 1.25rem;
    transform: scale(1.05);
  }
  
  .sidebar-open-btn span:first-child {
    font-size: 1.25rem;
  }
  
  .open-btn-text {
    writing-mode: horizontal-tb;
    font-size: 0.95rem;
    font-weight: 700;
  }
  
  .sidebar-close-btn {
    width: 40px;
    height: 40px;
    font-size: 1.5rem;
  }
  
  .sidebar-header {
    padding: 1.5rem 1.25rem;
  }
  
  .resize-handle {
    display: none;
  }
  
  .map-container {
    width: 100%;
  }
  
  .search-area-btn {
    top: auto;
    bottom: 5.5rem;
    left: 1rem;
    transform: none;
    font-size: 0.85rem;
    padding: 0.625rem 1.25rem;
  }
  
  /* Improve touch targets for mobile */
  .job-card {
    padding: 1.25rem;
  }
  
  .filter-select,
  .filter-input,
  .budget-input {
    padding: 0.75rem 1rem;
    font-size: 1rem;
  }
  
  .search-box {
    padding: 0.875rem 1.25rem;
  }
}

@media (max-width: 480px) {
  .sidebar {
    width: 100% !important;
    max-width: 100%;
    height: 100vh;
    top: 0;
    padding-top: 200px;
  }
  
  .sidebar-collapsed {
    width: 100% !important;
  }
  
  .sidebar-overlay {
    top: 0;
  }
  
  .sidebar-open-btn {
    top: calc(200px + 1rem);
  }
  
  .job-card {
    flex-direction: column;
  }
  
  .job-card-image,
  .job-card-image-placeholder {
    width: 100%;
    height: 150px;
  }
}
</style>