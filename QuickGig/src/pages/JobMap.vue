<template>
  <div class="map-page">
    <!-- Full Screen Map -->
    <GoogleMap
      v-if="isGoogleMapsLoaded && jobs.length > 0"
      :api-key="apiKey"
      :center="mapCenter"
      :zoom="mapZoom"
      class="full-map"
      :options="{
        zoomControl: true,
        streetViewControl: true,
        mapTypeControl: true,
        fullscreenControl: true
      }"
    >
      <!-- Default Marker for each filtered job -->
      <Marker
        v-for="job in filteredJobs"
        :key="job.id"
        :options="{ 
          position: job.coordinates,
          title: job.title
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
          <!-- Job Image if available -->
          <div v-if="selectedJob.images && selectedJob.images.length > 0" class="popup-image">
            <img :src="selectedJob.images[0]" :alt="selectedJob.title" />
          </div>
          
          <h3>{{ selectedJob.title }}</h3>
          <div class="popup-category">{{ selectedJob.category }}</div>
          <div class="popup-price">${{ selectedJob.payment }}</div>
          <div class="popup-location">📍 {{ selectedJob.location }}</div>
          <div class="popup-description">{{ selectedJob.description }}</div>
          <div class="popup-date">Posted: {{ selectedJob.date }}</div>
          
          <button @click="viewJobDetails" class="view-btn">
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

    <!-- Floating Category Filter -->
    <div class="floating-filter" v-if="jobs.length > 0">
      <select v-model="selectedCategory" class="category-select" @change="filterAndCenterMap">
        <option value="">All Categories</option>
        <option v-for="category in categories" :key="category" :value="category">
          {{ category }}
        </option>
      </select>
    </div>

    <!-- Jobs Counter Badge -->
    <div class="jobs-counter" v-if="jobs.length > 0">
      {{ filteredJobs.length }} {{ filteredJobs.length === 1 ? 'Job' : 'Jobs' }} Available
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
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
    const selectedCategory = ref('');
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

    // Filtered jobs based on category only
    const filteredJobs = computed(() => {
      if (!selectedCategory.value) {
        // Show all jobs if no category is selected
        return jobs.value;
      }
      
      // Filter by selected category
      return jobs.value.filter(job => job.category === selectedCategory.value);
    });

    // Geocode address to get coordinates
    const geocodeAddress = async (address) => {
      if (!address || !apiKey) {
        console.log('No address or API key for geocoding');
        return null;
      }

      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address + ', Singapore')}&key=${apiKey}`
        );
        const data = await response.json();
        
        console.log('Geocoding result for', address, ':', data);
        
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
        console.log('Fetching jobs from database...');
        
        const { data, error } = await supabase
          .from('User-Job-Request')
          .select('*');

        if (error) {
          console.error('Database error:', error);
          throw error;
        }

        console.log('Raw jobs data:', data);

        if (!data || data.length === 0) {
          console.log('No jobs found in database');
          jobs.value = [];
          return;
        }

        // Process each job to ensure it has coordinates
        const jobPromises = data.map(async (job, index) => {
          console.log(`Processing job ${index + 1}:`, job);
          
          let coordinates = null;

          // Try to get coordinates from database
          if (job.coordinates) {
            try {
              coordinates = typeof job.coordinates === 'string' 
                ? JSON.parse(job.coordinates) 
                : job.coordinates;
              
              console.log('Coordinates from DB:', coordinates);
              
              // Validate coordinates
              if (coordinates && 
                  typeof coordinates.lat === 'number' && 
                  typeof coordinates.lng === 'number' &&
                  !isNaN(coordinates.lat) && 
                  !isNaN(coordinates.lng)) {
                console.log('Valid coordinates found:', coordinates);
              } else {
                console.log('Invalid coordinates, will geocode');
                coordinates = null;
              }
            } catch (e) {
              console.error('Error parsing coordinates:', e);
              coordinates = null;
            }
          }

          // If no valid coordinates, try geocoding
          if (!coordinates && job.location) {
            console.log('Attempting to geocode location:', job.location);
            coordinates = await geocodeAddress(job.location);
          }

          // If still no coordinates, use postal code
          if (!coordinates && job.postal_code) {
            console.log('Attempting to geocode postal code:', job.postal_code);
            coordinates = await geocodeAddress(job.postal_code);
          }

          // Last resort: random location in Singapore
          if (!coordinates) {
            console.log('Using random Singapore location for job:', job.title);
            coordinates = {
              lat: 1.3521 + (Math.random() - 0.5) * 0.1,
              lng: 103.8198 + (Math.random() - 0.5) * 0.1
            };
          }

          console.log('Final coordinates for', job.title, ':', coordinates);

          // Handle different field name variations
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
        
        console.log('Processed jobs:', jobs.value);
        console.log('Total jobs with coordinates:', jobs.value.length);

        // Center map to show all jobs
        if (jobs.value.length > 0) {
          const avgLat = jobs.value.reduce((sum, job) => sum + job.coordinates.lat, 0) / jobs.value.length;
          const avgLng = jobs.value.reduce((sum, job) => sum + job.coordinates.lng, 0) / jobs.value.length;
          mapCenter.value = { lat: avgLat, lng: avgLng };
          console.log('Map centered at:', mapCenter.value);
        }

      } catch (error) {
        console.error('Error in fetchJobs:', error);
      }
    };

    const selectJob = (job) => {
      console.log('Job selected:', job);
      selectedJob.value = job;
    };

    const closeJobPopup = () => {
      selectedJob.value = null;
    };

    const viewJobDetails = async () => {
      if (!selectedJob.value) return;
      
      try {
        // Fetch the complete job data from database
        const { data: jobData, error } = await supabase
          .from('User-Job-Request')
          .select('*')
          .eq('id', selectedJob.value.id)
          .single();
        
        if (error) {
          console.error('Error fetching job details:', error);
          // Fallback to using the data we have
          const jobForStorage = {
            id: selectedJob.value.id,
            name: selectedJob.value.title,
            title: selectedJob.value.title,
            fullDescription: selectedJob.value.description,
            description: selectedJob.value.description,
            category: selectedJob.value.category,
            location: selectedJob.value.location,
            budget: `$${selectedJob.value.payment}`,
            payment: selectedJob.value.payment,
            coordinates: selectedJob.value.coordinates,
            images: selectedJob.value.images || [],
            date: selectedJob.value.date,
            userId: selectedJob.value.userId,
            postedBy: selectedJob.value.postedBy || 'Anonymous',
            skills: selectedJob.value.skills || [],
            postal_code: selectedJob.value.postal_code || ''
          };
          
          localStorage.setItem('selectedJob', JSON.stringify(jobForStorage));
        } else {
          // Store the complete job data from database
          const jobForStorage = {
            ...jobData,
            name: jobData.name || jobData.title,
            title: jobData.title || jobData.name,
            fullDescription: jobData.full_description || jobData.description,
            budget: jobData.budget || `$${jobData.payment}`,
            postedBy: jobData.posted_by || jobData.postedBy || 'Anonymous',
            date: jobData.created_at ? new Date(jobData.created_at).toLocaleDateString('en-GB') : selectedJob.value.date
          };
          
          localStorage.setItem('selectedJob', JSON.stringify(jobForStorage));
        }
        
        // Navigate to job details page
        router.push(`/job/${selectedJob.value.id}`);
        
      } catch (error) {
        console.error('Error navigating to job details:', error);
      }
    };

    const filterAndCenterMap = () => {
      if (filteredJobs.value.length > 0) {
        const avgLat = filteredJobs.value.reduce((sum, job) => sum + job.coordinates.lat, 0) / filteredJobs.value.length;
        const avgLng = filteredJobs.value.reduce((sum, job) => sum + job.coordinates.lng, 0) / filteredJobs.value.length;
        mapCenter.value = { lat: avgLat, lng: avgLng };
      }
    };

    onMounted(async () => {
      console.log('Component mounted, fetching jobs...');
      await fetchJobs();
      isGoogleMapsLoaded.value = true;
      console.log('Google Maps loaded');
    });

    return {
      apiKey,
      jobs,
      filteredJobs,
      isGoogleMapsLoaded,
      mapCenter,
      mapZoom,
      selectedJob,
      selectedCategory,
      categories,
      selectJob,
      closeJobPopup,
      viewJobDetails,
      filterAndCenterMap
    };
  }
};
</script>

<style scoped>
.map-page {
  height: 100vh;
  width: 100vw;
  position: relative;
  overflow: hidden;
}

.full-map {
  width: 100%;
  height: 100%;
}

/* Job Popup Styling */
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

/* Floating Category Filter */
.floating-filter {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  background: white;
  padding: 0.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.category-select {
  padding: 0.75rem 1.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95rem;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;
  min-width: 200px;
}

.category-select:focus {
  outline: none;
  border-color: #DC2626;
}

/* Jobs Counter Badge */
.jobs-counter {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: #DC2626;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 24px;
  font-weight: 600;
  font-size: 0.95rem;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
  z-index: 10;
}

/* Loading State */
.loading-container,
.no-jobs-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
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

/* Responsive */
@media (max-width: 768px) {
  .floating-filter {
    width: auto;
    padding: 0.5rem;
  }

  .category-select {
    min-width: 180px;
  }
}
</style>