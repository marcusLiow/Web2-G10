<!-- JobDetails.vue - Place this in src/pages/JobDetails.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { GoogleMap, Marker, InfoWindow } from 'vue3-google-map';
import { supabase } from '../supabase/config';

const route = useRoute();
const router = useRouter();

const job = ref(null);
const showMap = ref(true);
const jobCoordinates = ref(null);
const showMapInfoWindow = ref(false);
const offerAmount = ref('');
const offerMessage = ref('');
const showOfferModal = ref(false);
const isLoggedIn = ref(false);

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Check if user is logged in
const checkLoginStatus = () => {
  isLoggedIn.value = localStorage.getItem('isLoggedIn') === 'true';
};

onMounted(async () => {
  checkLoginStatus();
  
  // Get job data from localStorage
  const storedJob = localStorage.getItem('selectedJob');
  if (storedJob) {
    job.value = JSON.parse(storedJob);
    
    console.log('Job data loaded:', job.value);
    
    // Check if coordinates are already in the job data (from database)
    if (job.value.coordinates && job.value.coordinates.lat && job.value.coordinates.lng) {
      jobCoordinates.value = job.value.coordinates;
      console.log('Using coordinates from database:', jobCoordinates.value);
    } 
    // Otherwise use postal code to geocode (more accurate than full address)
    else if (job.value.postal_code && apiKey) {
      console.log('Geocoding postal code:', job.value.postal_code);
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?` +
          `address=${job.value.postal_code}+Singapore&` +
          `region=sg&` +
          `key=${apiKey}`
        );
        
        const data = await response.json();
        
        if (data.status === 'OK' && data.results.length > 0) {
          jobCoordinates.value = {
            lat: data.results[0].geometry.location.lat,
            lng: data.results[0].geometry.location.lng
          };
          console.log('Geocoded coordinates from postal code:', jobCoordinates.value);
        } else {
          console.log('Postal code geocoding failed, using default');
          jobCoordinates.value = { lat: 1.3521, lng: 103.8198 };
        }
      } catch (error) {
        console.error('Error geocoding postal code:', error);
        jobCoordinates.value = { lat: 1.3521, lng: 103.8198 };
      }
    } else {
      // No coordinates, postal code, or API key - use default
      console.log('No coordinates or postal code available, using default Singapore location');
      jobCoordinates.value = { lat: 1.3521, lng: 103.8198 };
    }
  } else {
    // If no job data, redirect back to listings
    router.push('/jobs');
  }
});

const mapCenter = computed(() => 
  jobCoordinates.value || { lat: 1.3521, lng: 103.8198 } // Default to Singapore
);

const toggleMap = () => {
  showMap.value = !showMap.value;
  if (showMap.value) {
    showMapInfoWindow.value = true;
  }
};

const goBack = () => {
  router.back();
};

// Carousell-style Chat function
const startChat = async () => {
  if (!isLoggedIn.value) {
    router.push('/login');
    return;
  }
  
  const currentUserId = localStorage.getItem('userId');
  const jobPosterId = job.value.userId;
  
  console.log('=== STARTING CHAT ===');
  console.log('Current user ID:', currentUserId);
  console.log('Job poster ID:', jobPosterId);
  console.log('Job ID:', job.value.id);
  
  // Check if user is trying to chat with themselves
  if (currentUserId === jobPosterId) {
    console.log('Cannot chat with yourself');
    return;
  }
  
  if (!jobPosterId) {
    console.error('Job poster ID is missing!');
    return;
  }
  
  try {
    // Check if chat already exists
    const { data: existingChat, error: searchError } = await supabase
      .from('chats')
      .select('id')
      .eq('job_id', job.value.id)
      .eq('job_poster_id', jobPosterId)
      .eq('job_seeker_id', currentUserId)
      .maybeSingle();
    
    if (searchError) {
      console.error('Error searching for chat:', searchError);
      throw searchError;
    }
    
    let chatId;
    
    if (existingChat) {
      // Chat exists, use existing chat
      chatId = existingChat.id;
      console.log('Using existing chat:', chatId);
    } else {
      // Create new chat
      console.log('Creating new chat...');
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert([{
          job_id: job.value.id,
          job_poster_id: jobPosterId,
          job_seeker_id: currentUserId,
          last_message: 'Chat started',
          last_message_time: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating chat:', createError);
        console.error('Error details:', JSON.stringify(createError, null, 2));
        throw createError;
      }
      
      chatId = newChat.id;
      console.log('Created new chat:', chatId);
    }
    
    // Navigate to chat conversation
    console.log('Navigating to chat:', chatId);
    router.push(`/chat/${chatId}`);
    
  } catch (error) {
    console.error('Error starting chat:', error);
    console.error('Full error:', JSON.stringify(error, null, 2));
  }
};

// Carousell-style Make Offer function
const openOfferModal = () => {
  if (!isLoggedIn.value) {
    alert('Please log in to make an offer');
    router.push('/login');
    return;
  }
  
  // Pre-fill with the listed price
  const budgetNumber = job.value.budget.replace('$', '');
  offerAmount.value = budgetNumber;
  showOfferModal.value = true;
};

const submitOffer = () => {
  if (!offerAmount.value || offerAmount.value <= 0) {
    alert('Please enter a valid offer amount');
    return;
  }
  
  // Here you would typically:
  // 1. Save the offer to your database
  // 2. Notify the job poster
  // 3. Create a negotiation thread
  
  alert(`Offer submitted!\n\nAmount: $${offerAmount.value}\nMessage: ${offerMessage.value || 'No message'}\n\nThe job poster will be notified of your offer.`);
  
  // Reset and close modal
  showOfferModal.value = false;
  offerAmount.value = '';
  offerMessage.value = '';
};

const closeOfferModal = () => {
  showOfferModal.value = false;
  offerAmount.value = '';
  offerMessage.value = '';
};
</script>

<template>
  <div class="page-wrapper">
    <div class="container">
      <!-- Header with back button -->
      <div class="header">
        <button @click="goBack" class="back-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to listings
        </button>
      </div>

      <div v-if="job" class="details-container">
        <!-- Main Content Grid -->
        <div class="content-grid">
          <!-- Left Column - Job Details -->
          <div class="main-content">
            <!-- Job Header Card -->
            <div class="job-header-card">
              <div class="job-header">
                <h1 class="job-title">{{ job.name }}</h1>
                <span class="job-category-badge">{{ job.category }}</span>
              </div>
              
              <div class="price-section">
                <span class="price-label">Budget</span>
                <span class="price-amount">{{ job.budget }}</span>
              </div>
            </div>

            <!-- Job Info Card -->
            <div class="info-card">
              <h2 class="section-title">Job Details</h2>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-icon">📍</span>
                  <div>
                    <span class="info-label">Location</span>
                    <span class="info-value">{{ job.location }}</span>
                  </div>
                </div>
                <div class="info-item">
                  <span class="info-icon">📅</span>
                  <div>
                    <span class="info-label">Posted on</span>
                    <span class="info-value">{{ job.date }}</span>
                  </div>
                </div>
                <div class="info-item">
                  <span class="info-icon">👤</span>
                  <div>
                    <span class="info-label">Posted by</span>
                    <span class="info-value">{{ job.postedBy }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Description Card -->
            <div class="description-card">
              <h2 class="section-title">Description</h2>
              <p class="description-text">{{ job.fullDescription }}</p>
            </div>

            <!-- Skills Card -->
            <div class="skills-card">
              <h2 class="section-title">Required Skills</h2>
              <div class="skills-list">
                <span v-for="skill in job.skills" :key="skill" class="skill-tag">
                  {{ skill }}
                </span>
              </div>
            </div>

            <!-- Map Section -->
            <div class="map-card">
              <button @click="toggleMap" class="map-toggle-btn">
                <span class="map-icon">📍</span>
                {{ showMap ? 'Hide Location Map' : 'Show Location Map' }}
              </button>
              
              <div v-if="showMap" class="map-container">
                <div v-if="!jobCoordinates" class="map-loading">
                  Loading map...
                </div>
                <GoogleMap
                  v-else
                  :api-key="apiKey"
                  style="width: 100%; height: 400px; border-radius: 0.75rem;"
                  :center="mapCenter"
                  :zoom="15"
                >
                  <Marker 
                    :options="{ position: mapCenter }"
                    @click="showMapInfoWindow = true"
                  />
                  <InfoWindow
                    v-if="showMapInfoWindow"
                    :options="{ position: mapCenter }"
                    @closeclick="showMapInfoWindow = false"
                  >
                    <div class="map-info-window">
                      <h4>{{ job.name }}</h4>
                      <p>{{ job.location }}</p>
                    </div>
                  </InfoWindow>
                </GoogleMap>
              </div>
            </div>
          </div>

          <!-- Right Column - Action Card (Sticky) -->
          <div class="sidebar">
            <div class="action-card">
              <div class="poster-info">
                <div class="poster-avatar">
                  {{ job.postedBy.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <p class="poster-name">{{ job.postedBy }}</p>
                  <p class="poster-label">Job Poster</p>
                </div>
              </div>

              <div class="price-highlight">
                <span class="price-label">Asking Price</span>
                <span class="price-large">{{ job.budget }}</span>
              </div>

              <!-- Carousell-style Action Buttons -->
              <div class="action-buttons">
                <button @click="startChat" class="chat-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  Chat
                </button>
                <button @click="openOfferModal" class="offer-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                    <line x1="7" y1="7" x2="7.01" y2="7"></line>
                  </svg>
                  Make Offer
                </button>
              </div>

              <div class="safety-tips">
                <p class="tips-title">💡 Tips</p>
                <ul class="tips-list">
                  <li>Meet in safe, public places</li>
                  <li>Check credentials before hiring</li>
                  <li>Use secure payment methods</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Make Offer Modal -->
    <div v-if="showOfferModal" class="modal-overlay" @click="closeOfferModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">Make an Offer</h2>
          <button @click="closeOfferModal" class="close-btn">✕</button>
        </div>

        <div class="modal-body">
          <div class="offer-info">
            <p class="offer-job-title">{{ job.name }}</p>
            <p class="offer-original-price">Listed price: {{ job.budget }}</p>
          </div>

          <div class="form-group">
            <label class="form-label">Your Offer ($)</label>
            <input 
              v-model="offerAmount" 
              type="number" 
              class="offer-input"
              placeholder="Enter your offer amount"
              min="1"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Message (Optional)</label>
            <textarea 
              v-model="offerMessage"
              class="offer-textarea"
              placeholder="Add a message to the job poster..."
              rows="4"
            ></textarea>
          </div>

          <div class="modal-actions">
            <button @click="closeOfferModal" class="cancel-btn">Cancel</button>
            <button @click="submitOffer" class="submit-offer-btn">Send Offer</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-wrapper {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 1rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  margin-bottom: 1.5rem;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: white;
  color: #374151;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.back-button:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.details-container {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 1.5rem;
  align-items: start;
}

@media (max-width: 968px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
  
  .sidebar {
    position: static !important;
  }
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Job Header Card */
.job-header-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.job-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.job-title {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
  line-height: 1.3;
}

.job-category-badge {
  background: #dbeafe;
  color: #1e40af;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
}

.price-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.price-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.price-amount {
  font-size: 1.875rem;
  font-weight: 700;
  color: #059669;
}

/* Info Card */
.info-card, .description-card, .skills-card, .map-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 1rem 0;
}

.info-grid {
  display: grid;
  gap: 1rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 0.5rem;
}

.info-icon {
  font-size: 1.25rem;
}

.info-label {
  display: block;
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.125rem;
}

.info-value {
  display: block;
  font-weight: 600;
  color: #111827;
}

.description-text {
  color: #4b5563;
  line-height: 1.7;
  margin: 0;
}

/* Skills */
.skills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.skill-tag {
  padding: 0.5rem 1rem;
  background: #f3f4f6;
  color: #374151;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Map */
.map-toggle-btn {
  width: 100%;
  padding: 0.875rem;
  background: #f3f4f6;
  color: #374151;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.map-toggle-btn:hover {
  background: #e5e7eb;
  border-color: #d1d5db;
}

.map-icon {
  font-size: 1.125rem;
}

.map-container {
  margin-top: 1rem;
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.map-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
  background: #f9fafb;
  color: #6b7280;
  font-size: 1rem;
  border-radius: 0.75rem;
}

.map-info-window {
  padding: 0.5rem;
  min-width: 200px;
}

.map-info-window h4 {
  margin: 0 0 0.25rem 0;
  color: #111827;
  font-size: 1rem;
}

.map-info-window p {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

/* Sidebar */
.sidebar {
  position: sticky;
  top: 1rem;
}

.action-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.poster-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 1.5rem;
}

.poster-avatar {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 600;
}

.poster-name {
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.125rem 0;
}

.poster-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.price-highlight {
  background: #f0fdf4;
  border: 2px solid #86efac;
  border-radius: 0.5rem;
  padding: 1rem;
  text-align: center;
  margin-bottom: 1.5rem;
}

.price-large {
  display: block;
  font-size: 1.75rem;
  font-weight: 700;
  color: #059669;
  margin-top: 0.25rem;
}

/* Carousell-style Action Buttons */
.action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.chat-btn, .offer-btn {
  padding: 0.875rem 1rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: none;
}

.chat-btn {
  background: white;
  color: #374151;
  border: 2px solid #e5e7eb;
}

.chat-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  transform: translateY(-1px);
}

.offer-btn {
  background: #dc2626;
  color: white;
  border: 2px solid #dc2626;
}

.offer-btn:hover {
  background: #b91c1c;
  border-color: #b91c1c;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

/* Safety Tips */
.safety-tips {
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 0.5rem;
  padding: 1rem;
}

.tips-title {
  font-weight: 600;
  color: #92400e;
  margin: 0 0 0.5rem 0;
}

.tips-list {
  margin: 0;
  padding-left: 1.25rem;
  color: #92400e;
  font-size: 0.875rem;
  line-height: 1.5;
}

.tips-list li {
  margin-bottom: 0.25rem;
}

/* Offer Modal */
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

.modal-content {
  background: white;
  border-radius: 1rem;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s;
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

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.close-btn {
  background: #f3f4f6;
  border: none;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  font-size: 1.25rem;
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

.modal-body {
  padding: 1.5rem;
}

.offer-info {
  background: #f9fafb;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.offer-job-title {
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.5rem 0;
}

.offer-original-price {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.offer-input, .offer-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: all 0.2s;
}

.offer-input:focus, .offer-textarea:focus {
  outline: none;
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

.offer-textarea {
  resize: vertical;
  min-height: 100px;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.cancel-btn, .submit-offer-btn {
  flex: 1;
  padding: 0.875rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.cancel-btn {
  background: #f3f4f6;
  color: #374151;
}

.cancel-btn:hover {
  background: #e5e7eb;
}

.submit-offer-btn {
  background: #dc2626;
  color: white;
}

.submit-offer-btn:hover {
  background: #b91c1c;
  transform: translateY(-1px);
}
</style>