<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
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
const isSubmitting = ref(false);
const showDeleteModal = ref(false);

// Toast notification state
const toasts = ref([]);
let toastId = 0;

// Image gallery state
const selectedImageIndex = ref(0);
const showImageModal = ref(false);

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Toast notification function
const showToast = (message, type = 'info') => {
  const id = toastId++;
  toasts.value.push({ id, message, type });
  
  // Auto remove after 4 seconds
  setTimeout(() => {
    removeToast(id);
  }, 4000);
};

const removeToast = (id) => {
  const index = toasts.value.findIndex(t => t.id === id);
  if (index > -1) {
    toasts.value.splice(index, 1);
  }
};

// Check if current user is the job poster
const isOwnListing = computed(() => {
  const currentUserId = localStorage.getItem('userId');
  return currentUserId && job.value && currentUserId === job.value.userId;
});

// Check if user is logged in
const checkLoginStatus = () => {
  isLoggedIn.value = localStorage.getItem('isLoggedIn') === 'true';
};

// Image gallery functions
const openImageModal = (index) => {
  selectedImageIndex.value = index;
  showImageModal.value = true;
};

const closeImageModal = () => {
  showImageModal.value = false;
};

const nextImage = () => {
  if (job.value.images && selectedImageIndex.value < job.value.images.length - 1) {
    selectedImageIndex.value++;
  }
};

const prevImage = () => {
  if (selectedImageIndex.value > 0) {
    selectedImageIndex.value--;
  }
};

// Handle keyboard navigation for image modal
const handleKeydown = (e) => {
  if (!showImageModal.value) return;
  
  if (e.key === 'ArrowRight') nextImage();
  if (e.key === 'ArrowLeft') prevImage();
  if (e.key === 'Escape') closeImageModal();
};

onMounted(async () => {
  checkLoginStatus();
  
  // Add keyboard event listener
  window.addEventListener('keydown', handleKeydown);
  
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

// Cleanup event listener
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
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

// View all chats for this listing (for job poster)
const viewChats = async () => {
  try {
    const currentUserId = localStorage.getItem('userId');
    
    // Navigate to chats page with filter for this job
    router.push(`/chats?jobId=${job.value.id}`);
    
  } catch (error) {
    console.error('Error viewing chats:', error);
    showToast('Failed to view chats', 'error');
  }
};

// Edit listing
const editListing = () => {
  // Store job data for editing
  localStorage.setItem('editingJob', JSON.stringify(job.value));
  router.push(`/edit-job/${job.value.id}`);
};

// Delete listing with confirmation
const confirmDelete = () => {
  showDeleteModal.value = true;
};

const deleteListing = async () => {
  try {
    isSubmitting.value = true;
    
    console.log('=== DELETING JOB ===');
    console.log('Job ID:', job.value.id);
    console.log('User ID:', localStorage.getItem('userId'));
    
    const currentUserId = localStorage.getItem('userId');
    
    // First, verify the job exists and user owns it
    const { data: existingJob, error: fetchError } = await supabase
      .from('User-Job-Request')
      .select('*')
      .eq('id', job.value.id)
      .eq('user_id', currentUserId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching job to verify:', fetchError);
      console.error('Fetch error details:', JSON.stringify(fetchError, null, 2));
      
      if (fetchError.code === 'PGRST116') {
        showToast('Job not found or you do not have permission to delete it', 'error');
      } else {
        showToast(`Unable to verify job ownership: ${fetchError.message}`, 'error');
      }
      return;
    }
    
    console.log('Job verified, proceeding with delete:', existingJob);
    
    // Delete the job from database
    const { data: deleteData, error: deleteError } = await supabase
      .from('User-Job-Request')
      .delete()
      .eq('id', job.value.id)
      .eq('user_id', currentUserId)
      .select();
    
    if (deleteError) {
      console.error('Error deleting job:', deleteError);
      console.error('Delete error details:', JSON.stringify(deleteError, null, 2));
      
      // Check if it's a permission error
      if (deleteError.code === 'PGRST301' || deleteError.message?.includes('permission')) {
        showToast('You do not have permission to delete this listing', 'error');
      } else if (deleteError.code === '42P01') {
        showToast('Database table not found. Please contact support', 'error');
      } else {
        showToast(`Failed to delete listing: ${deleteError.message}`, 'error');
      }
      return;
    }
    
    console.log('Job deleted successfully:', deleteData);
    
    // Clear from localStorage
    localStorage.removeItem('selectedJob');
    
    // Show success message
    showToast('Listing deleted successfully', 'success');
    
    // Navigate back to jobs page after a short delay
    setTimeout(() => {
      router.push('/jobs');
    }, 1000);
    
  } catch (error) {
    console.error('Unexpected error deleting listing:', error);
    console.error('Full error:', JSON.stringify(error, null, 2));
    showToast('An unexpected error occurred. Please try again', 'error');
  } finally {
    isSubmitting.value = false;
    showDeleteModal.value = false;
  }
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
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
    showToast('Unable to start chat: Job poster information missing', 'error');
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
    showToast('Failed to start chat. Please try again', 'error');
  }
};

// Carousell-style Make Offer function
const openOfferModal = () => {
  if (!isLoggedIn.value) {
    showToast('Please log in to make an offer', 'warning');
    router.push('/login');
    return;
  }
  
  // Pre-fill with the listed price
  const budgetNumber = job.value.budget.replace('$', '');
  offerAmount.value = budgetNumber;
  showOfferModal.value = true;
};

const submitOffer = async () => {
  if (!offerAmount.value || offerAmount.value <= 0) {
    showToast('Please enter a valid offer amount', 'warning');
    return;
  }
  
  if (isSubmitting.value) return;
  
  try {
    isSubmitting.value = true;
    
    const currentUserId = localStorage.getItem('userId');
    const jobPosterId = job.value.userId;
    
    console.log('=== SUBMITTING OFFER ===');
    console.log('Offer amount:', offerAmount.value);
    console.log('Offer message:', offerMessage.value);
    
    // Step 1: Check if chat already exists or create new one
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
      chatId = existingChat.id;
      console.log('Using existing chat:', chatId);
    } else {
      // Create new chat
      console.log('Creating new chat for offer...');
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert([{
          job_id: job.value.id,
          job_poster_id: jobPosterId,
          job_seeker_id: currentUserId,
          last_message: `Offered $${offerAmount.value}`,
          last_message_time: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating chat:', createError);
        throw createError;
      }
      
      chatId = newChat.id;
      console.log('Created new chat:', chatId);
    }
    
    // Step 2: Send the offer message WITH METADATA
    const offerMessageText = `Offered $${offerAmount.value}`;
    
    const { error: offerMsgError } = await supabase
      .from('messages')
      .insert([{
        chat_id: chatId,
        sender_id: currentUserId,
        message: offerMessageText,
        message_type: 'offer',           // ✅ NEW: Mark as offer
        offer_amount: offerAmount.value,  // ✅ NEW: Store amount
        offer_status: 'pending',          // ✅ NEW: Initial status
        read: false
      }]);
    
    if (offerMsgError) {
      console.error('Error sending offer message:', offerMsgError);
      throw offerMsgError;
    }
    
    console.log('Offer message sent');
    
    // Step 3: Send additional message if provided (as regular message)
    let lastMessage = offerMessageText;
    
    if (offerMessage.value.trim()) {
      const { error: additionalMsgError } = await supabase
        .from('messages')
        .insert([{
          chat_id: chatId,
          sender_id: currentUserId,
          message: offerMessage.value.trim(),
          message_type: 'regular',  // ✅ Regular message
          read: false
        }]);
      
      if (additionalMsgError) {
        console.error('Error sending additional message:', additionalMsgError);
        throw additionalMsgError;
      }
      
      console.log('Additional message sent');
      lastMessage = offerMessage.value.trim();
    }
    
    // Step 4: Update chat's last message
    await supabase
      .from('chats')
      .update({
        last_message: lastMessage,
        last_message_time: new Date().toISOString()
      })
      .eq('id', chatId);
    
    // Reset modal
    showOfferModal.value = false;
    offerAmount.value = '';
    offerMessage.value = '';
    
    // Show success toast
    showToast('Offer sent successfully!', 'success');
    
    // Navigate to the chat after a brief delay
    setTimeout(() => {
      console.log('Navigating to chat:', chatId);
      router.push(`/chat/${chatId}`);
    }, 500);
    
  } catch (error) {
    console.error('Error submitting offer:', error);
    showToast('Failed to submit offer. Please try again', 'error');
  } finally {
    isSubmitting.value = false;
  }
};

const closeOfferModal = () => {
  showOfferModal.value = false;
  offerAmount.value = '';
  offerMessage.value = '';
};
</script>

<template>
  <div class="page-wrapper">
    <!-- Toast Notifications -->
    <div class="toast-container">
      <transition-group name="toast">
        <div 
          v-for="toast in toasts" 
          :key="toast.id"
          :class="['toast', `toast-${toast.type}`]"
          @click="removeToast(toast.id)"
        >
          <div class="toast-icon">
            <svg v-if="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <svg v-else-if="toast.type === 'error'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <svg v-else-if="toast.type === 'warning'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
          <span class="toast-message">{{ toast.message }}</span>
          <button class="toast-close" @click.stop="removeToast(toast.id)">✕</button>
        </div>
      </transition-group>
    </div>

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
            <!-- Combined Overview Card -->
            <div class="job-overview-card">
              <!-- Image Gallery Section -->
              <div v-if="job.images && job.images.length > 0" class="image-gallery-wrapper">
                <div class="image-gallery-grid">
                  <!-- Main Large Image (Left) -->
                  <div class="main-image-container" @click="openImageModal(0)">
                    <img 
                      :src="job.images[0]" 
                      :alt="`${job.name} - Image 1`"
                      class="main-image"
                    />
                  </div>
                  
                  <!-- Right Column with 2 Images -->
                  <div class="side-images-column">
                    <!-- Top Right Image -->
                    <div 
                      v-if="job.images.length > 1"
                      class="side-image-container" 
                      @click="openImageModal(1)"
                    >
                      <img 
                        :src="job.images[1]" 
                        :alt="`${job.name} - Image 2`"
                        class="side-image"
                      />
                    </div>
                    
                    <!-- Bottom Right Image -->
                    <div 
                      v-if="job.images.length > 2"
                      class="side-image-container side-image-last" 
                      @click="openImageModal(2)"
                    >
                      <img 
                        :src="job.images[2]" 
                        :alt="`${job.name} - Image 3`"
                        class="side-image"
                      />
                    </div>
                    
                    <!-- Placeholder if less than 3 images -->
                    <div 
                      v-else-if="job.images.length === 2"
                      class="side-image-container side-image-last placeholder"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                    </div>
                  </div>
                </div>
                
                <!-- Show All Images Button -->
                <button class="show-all-btn" @click="openImageModal(0)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <span>Show all {{ job.images.length }} {{ job.images.length === 1 ? 'photo' : 'photos' }}</span>
                </button>
              </div>

              <!-- Title, Category & Budget Section -->
              <div class="header-section">
                <div class="job-header">
                  <h1 class="job-title">{{ job.name }}</h1>
                  <span class="job-category-badge">{{ job.category }}</span>
                </div>
                
                <div class="price-section">
                  <span class="price-label">Budget</span>
                  <span class="price-amount">{{ job.budget }}</span>
                </div>
              </div>

              <!-- Description Section -->
              <div class="description-section">
                <h2 class="section-title">Description</h2>
                <p class="description-text">{{ job.fullDescription }}</p>
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
                <span class="price-label">{{ isOwnListing ? 'Your Asking Price' : 'Asking Price' }}</span>
                <span class="price-large">{{ job.budget }}</span>
              </div>

              <!-- Action Buttons - Different for own listing vs others -->
              <div v-if="isOwnListing" class="action-buttons-own">
                <button @click="viewChats" class="view-chats-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  View Chats
                </button>
                <button @click="editListing" class="edit-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  Edit Listing
                </button>
                <button @click="confirmDelete" class="delete-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  Delete
                </button>
              </div>

              <!-- Carousell-style Action Buttons for non-owners -->
              <div v-else class="action-buttons">
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

    <!-- Image Modal/Lightbox -->
    <div v-if="showImageModal && job.images" class="image-modal-overlay" @click="closeImageModal">
      <div class="image-modal-content" @click.stop>
        <button class="modal-close-btn" @click="closeImageModal">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <button 
          v-if="selectedImageIndex > 0"
          class="modal-nav-btn prev-btn" 
          @click="prevImage"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        
        <div class="modal-image-container">
          <img 
            :src="job.images[selectedImageIndex]" 
            :alt="`${job.name} - Image ${selectedImageIndex + 1}`"
            class="modal-image"
          />
          <div class="image-counter">
            {{ selectedImageIndex + 1 }} / {{ job.images.length }}
          </div>
        </div>
        
        <button 
          v-if="selectedImageIndex < job.images.length - 1"
          class="modal-nav-btn next-btn" 
          @click="nextImage"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
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
              :disabled="isSubmitting"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Message (Optional)</label>
            <textarea 
              v-model="offerMessage"
              class="offer-textarea"
              placeholder="Add a message to the job poster..."
              rows="4"
              :disabled="isSubmitting"
            ></textarea>
          </div>

          <div class="modal-actions">
            <button @click="closeOfferModal" class="cancel-btn" :disabled="isSubmitting">
              Cancel
            </button>
            <button @click="submitOffer" class="submit-offer-btn" :disabled="isSubmitting">
              {{ isSubmitting ? 'Sending...' : 'Send Offer' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="closeDeleteModal">
      <div class="modal-content delete-modal" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">Delete Listing</h2>
          <button @click="closeDeleteModal" class="close-btn">✕</button>
        </div>

        <div class="modal-body">
          <div class="delete-warning">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p class="delete-message">Are you sure you want to delete this listing?</p>
            <p class="delete-submessage">This action cannot be undone. All related chats will remain but the listing will be permanently removed.</p>
          </div>

          <div class="modal-actions">
            <button @click="closeDeleteModal" class="cancel-btn" :disabled="isSubmitting">
              Cancel
            </button>
            <button @click="deleteListing" class="confirm-delete-btn" :disabled="isSubmitting">
              {{ isSubmitting ? 'Deleting...' : 'Delete Listing' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Toast Notification Styles */
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 300px;
  max-width: 400px;
  pointer-events: auto;
  cursor: pointer;
  transition: all 0.3s ease;
}

.toast:hover {
  transform: translateX(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.toast-success {
  border-left: 4px solid #10b981;
}

.toast-error {
  border-left: 4px solid #ef4444;
}

.toast-warning {
  border-left: 4px solid #f59e0b;
}

.toast-info {
  border-left: 4px solid #3b82f6;
}

.toast-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toast-success .toast-icon {
  color: #10b981;
}

.toast-error .toast-icon {
  color: #ef4444;
}

.toast-warning .toast-icon {
  color: #f59e0b;
}

.toast-info .toast-icon {
  color: #3b82f6;
}

.toast-message {
  flex: 1;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.4;
}

.toast-close {
  flex-shrink: 0;
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 1.125rem;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.toast-close:hover {
  color: #6b7280;
}

/* Toast Animations */
.toast-enter-active {
  animation: toastSlideIn 0.3s ease;
}

.toast-leave-active {
  animation: toastSlideOut 0.3s ease;
}

@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes toastSlideOut {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}

@media (max-width: 640px) {
  .toast-container {
    top: 0.5rem;
    right: 0.5rem;
    left: 0.5rem;
  }
  
  .toast {
    min-width: auto;
    max-width: none;
  }
}

/* All other styles */
.action-buttons-own {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.view-chats-btn,
.edit-btn,
.delete-btn {
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

.view-chats-btn {
  background: #3b82f6;
  color: white;
}

.view-chats-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.edit-btn {
  background: white;
  color: #374151;
  border: 2px solid #e5e7eb;
}

.edit-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  transform: translateY(-1px);
}

.delete-btn {
  background: white;
  color: #dc2626;
  border: 2px solid #fecaca;
}

.delete-btn:hover {
  background: #fef2f2;
  border-color: #fca5a5;
  transform: translateY(-1px);
}

.delete-modal .modal-body {
  padding: 1.5rem;
}

.delete-warning {
  text-align: center;
  padding: 1rem;
}

.delete-warning svg {
  margin: 0 auto 1rem;
}

.delete-message {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.5rem 0;
}

.delete-submessage {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
}

.confirm-delete-btn {
  flex: 1;
  padding: 0.875rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  background: #dc2626;
  color: white;
}

.confirm-delete-btn:hover {
  background: #b91c1c;
  transform: translateY(-1px);
}

.confirm-delete-btn:disabled,
.submit-offer-btn:disabled,
.cancel-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.offer-input:disabled,
.offer-textarea:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

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

.job-overview-card {
  background: white;
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.image-gallery-wrapper {
  position: relative;
  width: 100%;
  height: 450px;
  overflow: hidden;
}

.image-gallery-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 0.5rem;
  height: 100%;
}

@media (max-width: 768px) {
  .image-gallery-wrapper {
    height: 300px;
  }
  
  .image-gallery-grid {
    grid-template-columns: 1fr;
  }
  
  .side-images-column {
    display: none;
  }
}

.main-image-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: pointer;
  background: #f3f4f6;
}

.main-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.main-image-container:hover .main-image {
  transform: scale(1.05);
}

.side-images-column {
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 0.5rem;
  height: 100%;
}

.side-image-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: pointer;
  background: #f3f4f6;
}

.side-image-container.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
}

.side-image-container.placeholder svg {
  color: #d1d5db;
}

.side-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.side-image-container:hover .side-image {
  transform: scale(1.05);
}

.show-all-btn {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.show-all-btn:hover {
  background: #f9fafb;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.show-all-btn svg {
  flex-shrink: 0;
}

.header-section {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.job-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.job-title {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
  line-height: 1.3;
  flex: 1;
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
  align-items: baseline;
  gap: 0.75rem;
}

.price-label {
  font-size: 1rem;
  color: #6b7280;
  font-weight: 500;
}

.price-amount {
  font-size: 1.875rem;
  font-weight: 700;
  color: #059669;
}

.description-section {
  padding: 1.5rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 1rem 0;
}

.description-text {
  color: #4b5563;
  line-height: 1.7;
  margin: 0;
}

.info-card, .skills-card, .map-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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

.image-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

.image-modal-content {
  position: relative;
  width: 90%;
  max-width: 1200px;
  height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close-btn {
  position: absolute;
  top: -3rem;
  right: 0;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 10;
}

.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.modal-nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 10;
}

.modal-nav-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-50%) scale(1.1);
}

.prev-btn {
  left: -70px;
}

.next-btn {
  right: -70px;
}

@media (max-width: 768px) {
  .prev-btn {
    left: 10px;
  }
  
  .next-btn {
    right: 10px;
  }
  
  .modal-close-btn {
    top: 10px;
    right: 10px;
  }
  
  .job-title {
    font-size: 1.5rem;
  }

  .job-header {
    flex-direction: column;
  }
}

.modal-image-container {
  position: relative;
  max-width: 100%;
  max-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-image {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 0.5rem;
}

.image-counter {
  position: absolute;
  bottom: -2.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

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
  gap: 0.
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

@media (max-width: 768px) {
  .page-wrapper {
    padding: 0.5rem;
  }

  .action-buttons {
    grid-template-columns: 1fr;
  }
  
  .action-buttons-own {
    display: flex;
    flex-direction: column;
  }

  .modal-content {
    margin: 1rem;
  }
}
</style>