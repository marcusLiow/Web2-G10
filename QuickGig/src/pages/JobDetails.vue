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

// Profile picture state
const posterAvatarUrl = ref(null);
const posterName = ref('');

// Helper counter state
const helperSignupCount = ref(0);
const maxHelpers = ref(0);

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

// Fetch poster's profile information including profile picture
const fetchPosterProfile = async (userId) => {
  try {
    console.log('Fetching poster profile for userId:', userId);
    
    const { data, error } = await supabase
      .from('users')
      .select('username, avatar_url')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching poster profile:', error);
      return;
    }
    
    if (data) {
      posterName.value = data.username || 'Unknown User';
      posterAvatarUrl.value = data.avatar_url;
      console.log('Poster profile loaded:', data);
    }
  } catch (error) {
    console.error('Error in fetchPosterProfile:', error);
  }
};

// Get initials from poster name for fallback
const posterInitials = computed(() => {
  if (!posterName.value) return '?';
  
  const names = posterName.value.trim().split(' ');
  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase();
  }
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
});

// Navigate to poster's profile page
const goToPosterProfile = () => {
  if (job.value && job.value.userId) {
    router.push(`/profile/${job.value.userId}`);
  }
};

// Fetch helper signup count
const fetchHelperCount = async () => {
  if (!job.value?.id || !job.value?.requiresMultipleHelpers) return;
  
  try {
    // ✅ FIXED: Only count chats where an offer has been accepted
    const { data, error } = await supabase
      .from('chats')
      .select('job_seeker_id')
      .eq('job_id', job.value.id)
      .eq('offer_accepted', true);  // ✅ Only count accepted offers
    
    if (error) {
      console.error('Error fetching helper count:', error);
      return;
    }
    
    // Count unique job seekers who have had their offers accepted
    const uniqueHelpers = new Set(data?.map(chat => chat.job_seeker_id) || []);
    helperSignupCount.value = uniqueHelpers.size;
    
    console.log('Helper signup count (accepted offers only):', helperSignupCount.value);
  } catch (error) {
    console.error('Error in fetchHelperCount:', error);
  }
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
    
    // Fetch the poster's profile information
    if (job.value.userId) {
      await fetchPosterProfile(job.value.userId);
    }
    
    // Set max helpers if the job requires multiple helpers
    if (job.value.requiresMultipleHelpers && job.value.numberOfHelpers) {
      maxHelpers.value = job.value.numberOfHelpers;
      // Fetch current helper count
      await fetchHelperCount();
    }
    
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

// Format expiration date for display
const formattedExpirationDate = computed(() => {
  if (!job.value || !job.value.expiration_date) {
    return 'Never expires';
  }
  
  const expDate = new Date(job.value.expiration_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expDate.setHours(0, 0, 0, 0);
  
  // Calculate days until expiration
  const daysUntil = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
  
  if (daysUntil < 0) {
    return 'Expired';
  } else if (daysUntil === 0) {
    return 'Expires today';
  } else if (daysUntil === 1) {
    return 'Expires tomorrow';
  } else if (daysUntil <= 7) {
    return `Expires in ${daysUntil} days`;
  } else {
    return `Expires on ${expDate.toLocaleDateString('en-GB')}`;
  }
});

const expirationStatus = computed(() => {
  if (!job.value || !job.value.expiration_date) {
    return 'never';
  }
  
  const expDate = new Date(job.value.expiration_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expDate.setHours(0, 0, 0, 0);
  
  const daysUntil = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
  
  if (daysUntil < 0) return 'expired';
  if (daysUntil <= 3) return 'expiring-soon';
  return 'active';
});

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

// Contact poster (navigate to chat)
const contactPoster = async () => {
  if (!isLoggedIn.value) {
    showToast('Please log in to contact the poster', 'error');
    router.push('/login');
    return;
  }
  
  try {
    const currentUserId = localStorage.getItem('userId');
    
    // Check if chat already exists
    const { data: existingChat, error: chatError } = await supabase
      .from('chats')
      .select('id')
      .eq('job_id', job.value.id)
      .eq('job_seeker_id', currentUserId)
      .single();
    
    if (chatError && chatError.code !== 'PGRST116') {
      console.error('Error checking for existing chat:', chatError);
    }
    
    if (existingChat) {
      // Navigate to existing chat
      router.push(`/chats?chatId=${existingChat.id}`);
    } else {
      // Create new chat
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert([{
          job_id: job.value.id,
          job_poster_id: job.value.userId,
          job_seeker_id: currentUserId,
          last_message: 'Chat started',
          last_message_time: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating chat:', createError);
        showToast('Failed to start chat', 'error');
        return;
      }
      
      // Navigate to new chat
      router.push(`/chats?chatId=${newChat.id}`);
    }
  } catch (error) {
    console.error('Error in contactPoster:', error);
    showToast('Failed to start chat', 'error');
  }
};

// Make offer modal
const openOfferModal = () => {
  if (!isLoggedIn.value) {
    showToast('Please log in to make an offer', 'error');
    router.push('/login');
    return;
  }
  
  showOfferModal.value = true;
  // Extract numeric value from budget (which includes $) or use price directly
  const priceValue = job.value.budget ? job.value.budget.replace('$', '') : (job.value.price?.toString() || '');
  offerAmount.value = priceValue;
};

const closeOfferModal = () => {
  showOfferModal.value = false;
  offerAmount.value = '';
  offerMessage.value = '';
};

const submitOffer = async () => {
  if (!offerAmount.value) {
    showToast('Please enter an offer amount', 'error');
    return;
  }
  
  try {
    isSubmitting.value = true;
    const currentUserId = localStorage.getItem('userId');
    
    // Check if chat already exists
    let chatId;
    const { data: existingChat, error: chatError } = await supabase
      .from('chats')
      .select('id')
      .eq('job_id', job.value.id)
      .eq('job_seeker_id', currentUserId)
      .single();
    
    if (chatError && chatError.code !== 'PGRST116') {
      console.error('Error checking for existing chat:', chatError);
    }
    
    if (existingChat) {
      chatId = existingChat.id;
    } else {
      // Create new chat
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert([{
          job_id: job.value.id,
          job_poster_id: job.value.userId,
          job_seeker_id: currentUserId,
          last_message: `Offer: $${offerAmount.value}`,
          last_message_time: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating chat:', createError);
        showToast('Failed to submit offer', 'error');
        return;
      }
      
      chatId = newChat.id;
    }
    
    // Send offer message
    const { error: messageError } = await supabase
      .from('messages')
      .insert([{
        chat_id: chatId,
        sender_id: currentUserId,
        message: offerMessage.value || `I'd like to offer $${offerAmount.value} for this job.`,
        offer_amount: parseFloat(offerAmount.value),
        is_offer: true
      }]);
    
    if (messageError) {
      console.error('Error sending offer:', messageError);
      showToast('Failed to submit offer', 'error');
      return;
    }
    
    showToast('Offer submitted successfully!', 'success');
    closeOfferModal();
    
    // Navigate to chat
    setTimeout(() => {
      router.push(`/chats?chatId=${chatId}`);
    }, 1000);
    
  } catch (error) {
    console.error('Error submitting offer:', error);
    showToast('Failed to submit offer', 'error');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="page-wrapper">
    <!-- Toast Notifications -->
    <div class="toast-container">
      <div 
        v-for="toast in toasts" 
        :key="toast.id"
        :class="['toast', `toast-${toast.type}`]"
      >
        <span class="toast-icon">
          {{ toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ' }}
        </span>
        <span class="toast-message">{{ toast.message }}</span>
        <button @click="removeToast(toast.id)" class="toast-close">×</button>
      </div>
    </div>

    <!-- Back Button -->
    <button @click="goBack" class="back-button">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
      Back
    </button>

    <div v-if="job" class="job-container">
      <!-- Main Content Area -->
      <div class="main-content">
        <!-- Job Title and Basic Info -->
        <div class="job-header">
          <!-- Job Title at top of container -->
          <h1 class="job-header-title">{{ job.name || job.title }}</h1>
          
          <div class="header-top">
            <div class="job-meta">
              <span class="meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                {{ new Date(job.createdAt || job.date).toLocaleDateString() }}
              </span>
              <span class="meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                {{ job.postal_code }}
              </span>
              <span :class="['expiration-badge', expirationStatus]">
                {{ formattedExpirationDate }}
              </span>
            </div>
          </div>

          <!-- Helper Progress Bar (only for multi-helper jobs) -->
          <div v-if="job.requiresMultipleHelpers" class="helper-progress-section">
            <div class="helper-progress-header">
              <span class="helper-count-text">
                <strong>{{ helperSignupCount }}</strong> of <strong>{{ maxHelpers }}</strong> helpers signed up
              </span>
              <span class="helper-percentage">
                {{ Math.round((helperSignupCount / maxHelpers) * 100) }}%
              </span>
            </div>
            <div class="progress-bar">
              <div 
                class="progress-fill" 
                :style="{ width: `${Math.min((helperSignupCount / maxHelpers) * 100, 100)}%` }"
              ></div>
            </div>
            <p v-if="helperSignupCount >= maxHelpers" class="helper-full-message">
              ✓ All helper positions are filled!
            </p>
          </div>
        </div>

        <!-- Image Gallery -->
        <div v-if="job.images && job.images.length > 0" class="image-gallery">
          <div class="gallery-grid">
            <div 
              v-for="(image, index) in job.images" 
              :key="index"
              class="gallery-item"
              @click="openImageModal(index)"
            >
              <img :src="image" :alt="`Job image ${index + 1}`" />
              <div class="image-overlay">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="11" y1="8" x2="11" y2="14"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Job Description -->
        <div class="detail-section">
          <h2 class="section-title">Description</h2>
          <p class="job-description">{{ job.description }}</p>
        </div>

        <!-- Job Details Grid -->
        <div class="detail-section">
          <h2 class="section-title">Job Details</h2>
          <div class="details-grid">
            <div class="detail-item">
              <span class="detail-label">Category</span>
              <span class="detail-value">{{ job.category }}</span>
            </div>
            <div v-if="job.subcategory" class="detail-item">
              <span class="detail-label">Subcategory</span>
              <span class="detail-value">{{ job.subcategory }}</span>
            </div>
            <div v-if="job.urgency" class="detail-item">
              <span class="detail-label">Urgency</span>
              <span class="detail-value">{{ job.urgency }}</span>
            </div>
            <div v-if="job.duration" class="detail-item">
              <span class="detail-label">Duration</span>
              <span class="detail-value">{{ job.duration }}</span>
            </div>
            <div v-if="job.scheduled_date" class="detail-item">
              <span class="detail-label">Scheduled Date</span>
              <span class="detail-value">{{ new Date(job.scheduled_date).toLocaleDateString() }}</span>
            </div>
          </div>
        </div>

        <!-- Location Section -->
        <div class="detail-section">
          <div class="location-header">
            <h2 class="section-title">Location</h2>
            <button @click="toggleMap" class="toggle-map-btn">
              {{ showMap ? 'Hide Map' : 'Show Map' }}
            </button>
          </div>
          <div class="location-info">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <div>
              <p class="location-address">{{ job.location }}</p>
              <p class="location-postal">Postal Code: {{ job.postal_code }}</p>
            </div>
          </div>
          
          <div v-if="showMap && jobCoordinates" class="map-container">
            <GoogleMap
              :api-key="apiKey"
              :center="mapCenter"
              :zoom="15"
              style="width: 100%; height: 100%"
            >
              <Marker 
                :options="{ position: jobCoordinates }"
                @click="showMapInfoWindow = !showMapInfoWindow"
              />
              <InfoWindow 
                v-if="showMapInfoWindow"
                :options="{ position: jobCoordinates }"
              >
                <div style="padding: 8px;">
                  <strong>{{ job.name || job.title }}</strong>
                  <p style="margin: 4px 0 0 0; font-size: 14px;">{{ job.location }}</p>
                </div>
              </InfoWindow>
            </GoogleMap>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="sidebar">
        <div class="action-card">
          <!-- Poster Info with Profile Picture -->
          <div class="poster-info">
            <!-- Display profile picture if available, otherwise show initials -->
            <div class="poster-avatar">
              <img 
                v-if="posterAvatarUrl" 
                :src="posterAvatarUrl" 
                :alt="posterName"
                class="poster-avatar-image"
              />
              <span v-else class="poster-avatar-initials">{{ posterInitials }}</span>
            </div>
            <div class="poster-details">
              <div class="poster-name-row">
                <p class="poster-name">{{ posterName || 'Loading...' }}</p>
                <button 
                  v-if="!isOwnListing && posterName && job?.userId" 
                  @click="goToPosterProfile" 
                  class="view-poster-profile-btn"
                >
                  View Profile
                </button>
              </div>
              <p class="poster-label">Job Poster</p>
            </div>
          </div>

          <!-- Price Highlight -->
          <div class="price-highlight">
            <span style="font-size: 0.875rem; color: #059669;">Offered Price</span>
            <span class="price-large">{{ job.budget || '$' + job.price }}</span>
          </div>

          <!-- Action Buttons for non-owners -->
          <div v-if="!isOwnListing" class="action-buttons">
            <button @click="contactPoster" class="chat-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              Chat
            </button>
            <button @click="openOfferModal" class="offer-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              Make Offer
            </button>
          </div>

          <!-- Action Buttons for owners -->
          <div v-else class="action-buttons-own">
            <button @click="viewChats" class="owner-btn primary-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              View All Offers
            </button>
            <button @click="editListing" class="owner-btn secondary-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Edit Listing
            </button>
            <button @click="confirmDelete" class="owner-btn danger-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Delete Listing
            </button>
          </div>

          <!-- Safety Tips -->
          <div class="safety-tips">
            <h3 class="tips-title">💡 Safety Tips</h3>
            <ul class="tips-list">
              <li>Meet in a public place</li>
              <li>Don't pay in advance</li>
              <li>Check reviews and ratings</li>
              <li>Trust your instincts</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Offer Modal -->
    <div v-if="showOfferModal" class="modal-overlay" @click.self="closeOfferModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">Make an Offer</h2>
          <button @click="closeOfferModal" class="close-btn">×</button>
        </div>
        
        <div class="modal-body">
          <div class="offer-info">
            <p class="offer-job-title">{{ job.name || job.title }}</p>
            <p class="offer-original-price">Listed Price: {{ job.budget || '$' + job.price }}</p>
          </div>
          
          <div class="form-group">
            <label class="form-label">Your Offer Amount ($)</label>
            <input 
              v-model="offerAmount" 
              type="number" 
              class="offer-input"
              placeholder="Enter your offer"
              min="0"
              step="0.01"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Message (Optional)</label>
            <textarea 
              v-model="offerMessage" 
              class="offer-textarea"
              placeholder="Add a message to your offer..."
            ></textarea>
          </div>
          
          <div class="modal-actions">
            <button @click="closeOfferModal" class="cancel-btn">Cancel</button>
            <button @click="submitOffer" :disabled="isSubmitting" class="submit-offer-btn">
              {{ isSubmitting ? 'Submitting...' : 'Submit Offer' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">Delete Listing</h2>
          <button @click="showDeleteModal = false" class="close-btn">×</button>
        </div>
        
        <div class="modal-body">
          <p style="margin-bottom: 1.5rem; color: #374151;">
            Are you sure you want to delete this listing? This action cannot be undone.
          </p>
          
          <div class="modal-actions">
            <button @click="showDeleteModal = false" class="cancel-btn">Cancel</button>
            <button @click="deleteListing" :disabled="isSubmitting" class="submit-offer-btn">
              {{ isSubmitting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Image Modal -->
    <div v-if="showImageModal" class="modal-overlay" @click.self="closeImageModal">
      <div class="image-modal-content">
        <button @click="closeImageModal" class="modal-close-btn">×</button>
        
        <button 
          v-if="selectedImageIndex > 0"
          @click="prevImage" 
          class="modal-nav-btn modal-nav-prev"
        >
          ‹
        </button>
        
        <div class="modal-image-container">
          <img 
            :src="job.images[selectedImageIndex]" 
            :alt="`Job image ${selectedImageIndex + 1}`"
            class="modal-image"
          />
          <div class="image-counter">
            {{ selectedImageIndex + 1 }} / {{ job.images.length }}
          </div>
        </div>
        
        <button 
          v-if="selectedImageIndex < job.images.length - 1"
          @click="nextImage" 
          class="modal-nav-btn modal-nav-next"
        >
          ›
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.page-wrapper {
  min-height: 100vh;
  background: #f9fafb;
  padding: 1rem;
}

/* Toast Notifications */
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.toast {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 300px;
  max-width: 400px;
  animation: slideInRight 0.3s ease-out;
  background: white;
}

@keyframes slideInRight {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast-success {
  border-left: 4px solid #10b981;
}

.toast-error {
  border-left: 4px solid #ef4444;
}

.toast-info {
  border-left: 4px solid #3b82f6;
}

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  font-weight: bold;
  flex-shrink: 0;
}

.toast-success .toast-icon {
  background: #d1fae5;
  color: #10b981;
}

.toast-error .toast-icon {
  background: #fee2e2;
  color: #ef4444;
}

.toast-info .toast-icon {
  background: #dbeafe;
  color: #3b82f6;
}

.toast-message {
  flex: 1;
  color: #374151;
  font-size: 0.875rem;
}

.toast-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #9ca3af;
  cursor: pointer;
  padding: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: color 0.2s;
}

.toast-close:hover {
  color: #4b5563;
}

/* Back Button */
.back-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 1rem;
}

.back-button:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  transform: translateX(-2px);
}

/* Main Container */
.job-container {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 2rem;
  align-items: start;
}

/* Main Content */
.main-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Job Header */
.job-header {
  background: white;
  border-radius: 0.75rem;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.job-header-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 1.5rem 0;
  line-height: 1.3;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.header-top {
  margin-bottom: 1rem;
}

.job-title {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 1rem;
  line-height: 1.2;
}

.job-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.meta-item svg {
  flex-shrink: 0;
}

.expiration-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.expiration-badge.never {
  background: #e0e7ff;
  color: #4f46e5;
}

.expiration-badge.active {
  background: #d1fae5;
  color: #059669;
}

.expiration-badge.expiring-soon {
  background: #fed7aa;
  color: #ea580c;
}

.expiration-badge.expired {
  background: #fee2e2;
  color: #dc2626;
}

/* Helper Progress Section */
.helper-progress-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.helper-progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.helper-count-text {
  font-size: 0.875rem;
  color: #374151;
}

.helper-percentage {
  font-size: 0.875rem;
  font-weight: 600;
  color: #059669;
}

.progress-bar {
  width: 100%;
  height: 0.5rem;
  background: #e5e7eb;
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #059669 0%, #10b981 100%);
  transition: width 0.3s ease;
  border-radius: 9999px;
}

.helper-full-message {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: #d1fae5;
  border: 1px solid #86efac;
  border-radius: 0.5rem;
  color: #059669;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
}

/* Image Gallery */
.image-gallery {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.gallery-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 0.5rem;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
}

.gallery-item:hover {
  transform: scale(1.02);
}

.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  color: white;
}

.gallery-item:hover .image-overlay {
  opacity: 1;
}

/* Detail Sections */
.detail-section {
  background: white;
  border-radius: 0.75rem;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 1rem;
}

.job-description {
  color: #374151;
  line-height: 1.75;
  white-space: pre-wrap;
}

/* Details Grid */
.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.detail-value {
  font-size: 1rem;
  color: #111827;
  font-weight: 600;
}

/* Location Section */
.location-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.toggle-map-btn {
  padding: 0.5rem 1rem;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-map-btn:hover {
  background: #e5e7eb;
}

.location-info {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.location-info svg {
  flex-shrink: 0;
  color: #dc2626;
}

.location-address {
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.25rem;
}

.location-postal {
  font-size: 0.875rem;
  color: #6b7280;
}

.map-container {
  width: 100%;
  height: 400px;
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

/* Image Modal */
.image-modal-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close-btn {
  position: absolute;
  top: -3rem;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  font-size: 2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;
}

.modal-close-btn:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: scale(1.1);
}

.modal-nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  font-size: 2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;
}

.modal-nav-btn:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: translateY(-50%) scale(1.1);
}

.modal-nav-prev {
  left: -4rem;
}

.modal-nav-next {
  right: -4rem;
}

@media (max-width: 1024px) {
  .modal-nav-prev {
    left: 1rem;
  }
  
  .modal-nav-next {
    right: 1rem;
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
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 600;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.poster-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.poster-avatar-initials {
  color: white;
  font-size: 1.25rem;
  font-weight: 600;
}

.poster-details {
  flex: 1;
  min-width: 0;
}

.poster-name-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.125rem;
  flex-wrap: wrap;
}

.poster-name {
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.view-poster-profile-btn {
  padding: 0.375rem 0.75rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.view-poster-profile-btn:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
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
  gap: 0.5rem;
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

/* Owner Action Buttons */
.action-buttons-own {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.owner-btn {
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

.primary-btn {
  background: #dc2626;
  color: white;
}

.primary-btn:hover {
  background: #b91c1c;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

.secondary-btn {
  background: white;
  color: #374151;
  border: 2px solid #e5e7eb;
}

.secondary-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  transform: translateY(-1px);
}

.danger-btn {
  background: #fee2e2;
  color: #dc2626;
  border: 2px solid #fecaca;
}

.danger-btn:hover {
  background: #fecaca;
  border-color: #fca5a5;
  transform: translateY(-1px);
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

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
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

.submit-offer-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 768px) {
  .job-container {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
  }

  .page-wrapper {
    padding: 0.5rem;
  }

  .job-header {
    padding: 1.5rem;
  }

  .job-header-title {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
  }

  .poster-name-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .view-poster-profile-btn {
    font-size: 0.6875rem;
    padding: 0.3125rem 0.625rem;
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