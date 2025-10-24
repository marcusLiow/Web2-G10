<template>
  <div class="map-page">
    <div class="map-container">
      <!-- Map Container -->
      <GoogleMap
        v-if="isGoogleMapsLoaded"
        :api-key="apiKey"
        :center="mapCenter"
        :zoom="mapZoom"
        class="map"
        @click="closeInfoWindow"
        :options="{
          zoomControl: true,
          streetViewControl: true,
          mapTypeControl: true,
          fullscreenControl: true
        }"
      >
        <!-- Job Markers -->
        <Marker
          v-for="job in jobs"
          :key="job.id"
          :position="job.coordinates"
          @click="openInfoWindow(job)"
          :options="{
            icon: {
              path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
              fillColor: '#DC2626',
              fillOpacity: 1,
              strokeWeight: 1,
              strokeColor: '#991B1B',
              scale: 1.5,
              anchor: { x: 12, y: 22 }
            }
          }"
        />

        <!-- Info Window for selected job -->
        <InfoWindow
          v-if="selectedJob"
          :position="selectedJob.coordinates"
          @closeclick="closeInfoWindow"
        >
          <div class="info-window">
            <h3>{{ selectedJob.title }}</h3>
            <p class="job-category">{{ selectedJob.category }}</p>
            <p class="job-price">${{ selectedJob.payment }}</p>
            <p class="job-location">📍 {{ selectedJob.location }}</p>
            <router-link :to="'/jobs/' + selectedJob.id" class="view-details-btn">
              View Details
            </router-link>
          </div>
        </InfoWindow>
      </GoogleMap>

      <!-- Loading State -->
      <div v-else class="loading-container">
        <div class="spinner"></div>
        <p>Loading map...</p>
      </div>

      <!-- Job List Sidebar -->
      <div class="job-list-sidebar">
        <h2>Available Jobs</h2>
        <div class="job-filters">
          <input 
            v-model="searchTerm" 
            placeholder="Search jobs..."
            class="search-input"
          />
          <select v-model="selectedCategory" class="category-select">
            <option value="">All Categories</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </div>
        <div class="job-list">
          <div 
            v-for="job in filteredJobs" 
            :key="job.id" 
            class="job-card"
            :class="{ 'selected': selectedJob?.id === job.id }"
            @click="selectJob(job)"
          >
            <h3>{{ job.title }}</h3>
            <p class="job-category">{{ job.category }}</p>
            <p class="job-price">${{ job.payment }}</p>
            <p class="job-location">📍 {{ job.location }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
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
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const jobs = ref([]);
    const isGoogleMapsLoaded = ref(false);
    const selectedJob = ref(null);
    const searchTerm = ref('');
    const selectedCategory = ref('');
    const mapCenter = ref({ lat: 1.4382, lng: 103.7891 }); // Default to Woodlands
    const mapZoom = ref(13); // Default zoom level

    // Map controls
    const updateZoom = (newZoom) => {
      mapZoom.value = newZoom;
    };

    // Available categories
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

    // Filtered jobs based on search and category
    const filteredJobs = computed(() => {
      return jobs.value.filter(job => {
        const matchesSearch = !searchTerm.value || 
          job.title.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
          job.description.toLowerCase().includes(searchTerm.value.toLowerCase());
        
        const matchesCategory = !selectedCategory.value || 
          job.category === selectedCategory.value;

        return matchesSearch && matchesCategory;
      });
    });

    // Fetch jobs from Supabase
    const fetchJobs = async () => {
      try {
        const { data, error } = await supabase
          .from('User-Job-Request')
          .select('*')
          .eq('status', 'open');

        if (error) throw error;

        // Transform the data
        jobs.value = data.map(job => {
          // Ensure coordinates are properly formatted
          let coordinates;
          try {
            coordinates = typeof job.coordinates === 'string' 
              ? JSON.parse(job.coordinates) 
              : job.coordinates;
          } catch (e) {
            coordinates = { lat: 1.4382, lng: 103.7891 }; // Default to Woodlands if invalid coordinates
          }

          // Validate coordinates
          if (!coordinates || typeof coordinates.lat !== 'number' || typeof coordinates.lng !== 'number') {
            coordinates = { lat: 1.4382, lng: 103.7891 }; // Default to Woodlands if invalid coordinates
          }

          return {
            id: job.id,
            title: job.title,
            description: job.description,
            category: job.category || 'Other',
            location: job.location,
            payment: job.payment,
            coordinates: coordinates,
            date: new Date(job.created_at).toLocaleDateString('en-GB')
          };
        });

        // Center map on first job if available
        if (jobs.value.length > 0 && jobs.value[0].coordinates) {
          mapCenter.value = jobs.value[0].coordinates;
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
      }
    };

    const openInfoWindow = (job) => {
      selectedJob.value = job;
    };

    const closeInfoWindow = () => {
      selectedJob.value = null;
    };

    const selectJob = (job) => {
      selectedJob.value = job;
      mapCenter.value = job.coordinates;
      mapZoom.value = 16; // Zoom in when selecting a job
    };

    onMounted(async () => {
      await fetchJobs();
      isGoogleMapsLoaded.value = true;
    });

    return {
      apiKey,
      jobs,
      isGoogleMapsLoaded,
      mapCenter,
      selectedJob,
      searchTerm,
      selectedCategory,
      categories,
      filteredJobs,
      openInfoWindow,
      closeInfoWindow,
      selectJob,
      mapZoom,
      updateZoom
    };
  }
};
</script>

<style scoped>
.map-page {
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.map-container {
  flex: 1;
  position: relative;
  display: flex;
}

.map {
  height: 100%;
  width: 70%;
}

.job-list-sidebar {
  width: 30%;
  height: 100%;
  background: white;
  padding: 1.5rem;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
}

.job-list-sidebar h2 {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: #1a1a1a;
}

.job-filters {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.search-input,
.category-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95rem;
}

.job-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.job-card {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.job-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.job-card.selected {
  border-color: #2563eb;
  background: #f0f7ff;
}

.job-card h3 {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  color: #1a1a1a;
}

.job-category {
  font-size: 0.9rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.job-price {
  font-size: 1.1rem;
  font-weight: 600;
  color: #059669;
  margin-bottom: 0.5rem;
}

.job-location {
  font-size: 0.9rem;
  color: #4b5563;
}

.info-window {
  padding: 1rem;
  min-width: 200px;
}

.info-window h3 {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  color: #1a1a1a;
}

.view-details-btn {
  display: inline-block;
  margin-top: 0.75rem;
  padding: 0.5rem 1rem;
  background: #2563eb;
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.view-details-btn:hover {
  background: #1d4ed8;
}

.loading-container {
  position: absolute;
  top: 50%;
  left: 35%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive Design */
@media (max-width: 768px) {
  .map-container {
    flex-direction: column;
  }

  .map {
    width: 100%;
    height: 50vh;
  }

  .job-list-sidebar {
    width: 100%;
    height: 50vh;
  }

  .loading-container {
    left: 50%;
  }
}
</style>
