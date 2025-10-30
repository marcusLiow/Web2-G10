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

// Profile picture state (from File 1)
const posterAvatarUrl = ref(null);
const posterName = ref('');

// Helper counter state (merged from both files)
const helperSignupCount = ref(0);
const maxHelpers = ref(0);
const isFullyBooked = ref(false); // ✅ From File 2: Track if all positions filled

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

// MERGED: Fetch poster's profile information including profile picture (from File 1)
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

// Get initials from poster name for fallback (from File 1)
const posterInitials = computed(() => {
  if (!posterName.value) return '?';
  
  const names = posterName.value.trim().split(' ');
  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase();
  }
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
});

// Navigate to poster's profile page (from File 1)
const goToPosterProfile = () => {
  if (job.value && job.value.userId) {
    router.push(`/profile/${job.value.userId}`);
  }
};

// MERGED: Fetch helper signup count with fully booked tracking
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
    
    // ✅ From File 2: Check if job is fully booked
    isFullyBooked.value = helperSignupCount.value >= maxHelpers.value;
    
    console.log('Helper signup count (accepted offers only):', helperSignupCount.value);
    console.log('Is fully booked:', isFullyBooked.value);
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

// MERGED: Better onMounted from File 2 with database loading + File 1's profile features
onMounted(async () => {
  checkLoginStatus();
  
  // Add keyboard event listener
  window.addEventListener('keydown', handleKeydown);
  
  // ✅ From File 2: Get job ID from route params
  const jobId = route.params.id;
  
  console.log('=== JOB DETAILS DEBUG ===');
  console.log('Route params:', route.params);
  console.log('Job ID from route:', jobId);
  
  if (!jobId) {
    console.error('No job ID provided in route');
    showToast('Invalid job link', 'error');
    setTimeout(() => {
      router.push('/jobs');
    }, 1500);
    return;
  }
  
  try {
    console.log('Attempting to fetch job from database with ID:', jobId);
    
    // ✅ From File 2: Fetch job from database first
    const { data: jobData, error } = await supabase
      .from('User-Job-Request')
      .select('*')
      .eq('id', jobId)
      .single();
    
    console.log('Supabase query result:');
    console.log('- Data:', jobData);
    console.log('- Error:', error);
    
    if (error) {
      console.error('Supabase error details:');
      console.error('- Code:', error.code);
      console.error('- Message:', error.message);
      console.error('- Details:', error.details);
      console.error('- Hint:', error.hint);
      
      // ✅ From File 2: Fallback to localStorage if database fetch fails
      console.log('Attempting fallback to localStorage...');
      const storedJob = localStorage.getItem('selectedJob');
      if (storedJob) {
        const parsedJob = JSON.parse(storedJob);
        console.log('Found job in localStorage:', parsedJob);
        
        // Check if the stored job ID matches
        if (parsedJob.id == jobId) {
          job.value = parsedJob;
          console.log('Using localStorage data as fallback');
          
          // From File 1: Fetch the poster's profile information
          if (job.value.userId) {
            await fetchPosterProfile(job.value.userId);
          }
          
          // Continue with the rest of the setup
          if (job.value.requiresMultipleHelpers && job.value.numberOfHelpers) {
            maxHelpers.value = job.value.numberOfHelpers;
            await fetchHelperCount();
          }
          
          // Set up coordinates
          if (job.value.coordinates && job.value.coordinates.lat && job.value.coordinates.lng) {
            jobCoordinates.value = job.value.coordinates;
          } else if (job.value.postal_code && apiKey) {
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
            jobCoordinates.value = { lat: 1.3521, lng: 103.8198 };
          }
          
          return; // Exit early, we have our data
        }
      }
      
      showToast('Job not found', 'error');
      setTimeout(() => {
        router.push('/jobs');
      }, 1500);
      return;
    }
    
    if (!jobData) {
      console.error('No job data returned from database');
      showToast('Job not found', 'error');
      setTimeout(() => {
        router.push('/jobs');
      }, 1500);
      return;
    }
    
    console.log('Successfully fetched job from database:', jobData);
    
    // ✅ From File 2: Fetch username separately
    let postedBy = 'Unknown';
    if (jobData.user_id) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('username')
        .eq('id', jobData.user_id)
        .single();
      
      if (!userError && userData) {
        postedBy = userData.username;
      }
    }
    
    // Transform the data to match the expected format
    job.value = {
      id: jobData.id,
      name: jobData.title,
      fullDescription: jobData.description,
      budget: `$${jobData.payment}`,
      category: jobData.category || 'Uncategorized',
      location: jobData.location,
      postal_code: jobData.postal_code,
      date: new Date(jobData.created_at).toLocaleDateString('en-GB'),
      postedBy: postedBy,
      userId: jobData.user_id,
      skills: ['General'],
      images: jobData.images || [],
      coordinates: jobData.coordinates,
      expiration_date: jobData.expiration_date,
      requiresMultipleHelpers: jobData.multiple_positions || jobData.requiresMultipleHelpers || false,
      numberOfHelpers: jobData.positions_available || jobData.numberOfHelpers || 1
    };
    
    console.log('Transformed job data:', job.value);
    
    // Update localStorage with fresh data for caching
    localStorage.setItem('selectedJob', JSON.stringify(job.value));
    
    // From File 1: Fetch the poster's profile information
    if (job.value.userId) {
      await fetchPosterProfile(job.value.userId);
    }
    
    // Set max helpers if the job requires multiple helpers
    if (job.value.requiresMultipleHelpers && job.value.numberOfHelpers) {
      maxHelpers.value = job.value.numberOfHelpers;
      await fetchHelperCount();
    }
    
    // Check if coordinates are already in the job data (from database)
    if (job.value.coordinates && job.value.coordinates.lat && job.value.coordinates.lng) {
      jobCoordinates.value = job.value.coordinates;
      console.log('Using coordinates from database:', jobCoordinates.value);
    } 
    // Otherwise use postal code to geocode
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
      console.log('No coordinates or postal code available, using default Singapore location');
      jobCoordinates.value = { lat: 1.3521, lng: 103.8198 };
    }
    
  } catch (error) {
    console.error('Unexpected error loading job data:', error);
    showToast('Failed to load job details', 'error');
    setTimeout(() => {
      router.push('/jobs');
    }, 1500);
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

// MERGED: Owner management functions from File 1

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
    const { error: deleteError } = await supabase
      .from('User-Job-Request')
      .delete()
      .eq('id', job.value.id)
      .eq('user_id', currentUserId);
    
    if (deleteError) {
      console.error('Error deleting job:', deleteError);
      console.error('Delete error details:', JSON.stringify(deleteError, null, 2));
      showToast(`Failed to delete listing: ${deleteError.message}`, 'error');
      return;
    }
    
    console.log('Job deleted successfully from database');
    
    // Clear from localStorage
    localStorage.removeItem('selectedJob');
    
    showToast('Listing deleted successfully', 'success');
    
    // Navigate back to jobs list after a short delay
    setTimeout(() => {
      router.push('/jobs');
    }, 1500);
    
  } catch (error) {
    console.error('Unexpected error deleting job:', error);
    showToast('An unexpected error occurred', 'error');
  } finally {
    isSubmitting.value = false;
    showDeleteModal.value = false;
  }
};

// Start chat function
const startChat = async () => {
  try {
    if (!isLoggedIn.value) {
      showToast('Please log in to chat with the job poster', 'error');
      router.push('/login');
      return;
    }

    const currentUserId = localStorage.getItem('userId');
    const jobPosterId = job.value.userId;

    console.log('Current User ID:', currentUserId);
    console.log('Job Poster ID:', jobPosterId);

    if (currentUserId === jobPosterId) {
      showToast('You cannot chat with yourself', 'error');
      return;
    }

    // Check if chat already exists
    const { data: existingChat, error: searchError } = await supabase
      .from('chats')
      .select('id')
      .eq('job_id', job.value.id)
      .eq('job_seeker_id', currentUserId)
      .eq('job_poster_id', jobPosterId)
      .single();

    if (searchError && searchError.code !== 'PGRST116') {
      console.error('Error searching for existing chat:', searchError);
      throw searchError;
    }

    let chatId;

    if (existingChat) {
      chatId = existingChat.id;
      console.log('Using existing chat:', chatId);
    } else {
      // Create new chat
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert([{
          job_id: job.value.id,
          job_seeker_id: currentUserId,
          job_poster_id: jobPosterId,
          last_message: 'Chat started',
          last_message_time: new Date().toISOString()
        }])
        .select()
        .single();

      if (createError) {
        console.error('Error creating chat:', createError);
        showToast('Failed to start chat. Please try again.', 'error');
        return;
      }

      chatId = newChat.id;
      console.log('Created new chat:', chatId);
    }

    // Navigate to chat
    router.push(`/chats?chatId=${chatId}`);

  } catch (error) {
    console.error('Error in startChat:', error);
    showToast('An error occurred. Please try again.', 'error');
  }
};

// Submit offer function
const submitOffer = async () => {
  if (!offerAmount.value || !offerMessage.value.trim()) {
    showToast('Please fill in all fields', 'error');
    return;
  }

  try {
    isSubmitting.value = true;

    if (!isLoggedIn.value) {
      showToast('Please log in to submit an offer', 'error');
      router.push('/login');
      return;
    }

    const currentUserId = localStorage.getItem('userId');
    const jobPosterId = job.value.userId;

    // Check if chat exists
    const { data: existingChat, error: searchError } = await supabase
      .from('chats')
      .select('id')
      .eq('job_id', job.value.id)
      .eq('job_seeker_id', currentUserId)
      .eq('job_poster_id', jobPosterId)
      .single();

    if (searchError && searchError.code !== 'PGRST116') {
      throw searchError;
    }

    let chatId;

    if (existingChat) {
      chatId = existingChat.id;
    } else {
      // Create chat
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert([{
          job_id: job.value.id,
          job_seeker_id: currentUserId,
          job_poster_id: jobPosterId,
          last_message: `Offer: $${offerAmount.value}`,
          last_message_time: new Date().toISOString()
        }])
        .select()
        .single();

      if (createError) throw createError;
      chatId = newChat.id;
    }

    // Send offer message
    const { error: messageError } = await supabase
      .from('messages')
      .insert([{
        chat_id: chatId,
        sender_id: currentUserId,
        message: `💰 Offer: $${offerAmount.value}\n\n${offerMessage.value}`,
        is_offer: true,
        offer_amount: parseFloat(offerAmount.value)
      }]);

    if (messageError) throw messageError;

    // Update chat's last message
    await supabase
      .from('chats')
      .update({
        last_message: `Offer: $${offerAmount.value}`,
        last_message_time: new Date().toISOString()
      })
      .eq('id', chatId);

    showToast('Offer submitted successfully!', 'success');
    showOfferModal.value = false;
    offerAmount.value = '';
    offerMessage.value = '';

    // Navigate to chat
    setTimeout(() => {
      router.push(`/chats?chatId=${chatId}`);
    }, 1000);

  } catch (error) {
    console.error('Error submitting offer:', error);
    showToast('Failed to submit offer. Please try again.', 'error');
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
        {{ toast.message }}
      </div>
    </div>

    <div v-if="job" class="job-container">
      <!-- Main Content -->
      <div class="main-content">
        <!-- Back Button -->
        <button @click="goBack" class="back-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Back to Listings
        </button>

        <!-- Job Card -->
        <div class="job-card">
          <!-- Job Header -->
          <div class="job-header">
            <div class="job-header-content">
              <h1 class="job-header-title">{{ job.name }}</h1>
              
              <!-- MERGED: Poster info with profile picture and click to view profile -->
              <div class="poster-name-row">
                <div class="poster-profile-info" @click="goToPosterProfile" style="cursor: pointer;">
                  <div class="poster-avatar-small">
                    <img 
                      v-if="posterAvatarUrl" 
                      :src="posterAvatarUrl" 
                      :alt="posterName" 
                      class="poster-avatar-img"
                    />
                    <div v-else class="poster-avatar-initials">
                      {{ posterInitials }}
                    </div>
                  </div>
                  <div>
                    <div class="poster-small-label">Posted by</div>
                    <div class="poster-name-text">{{ posterName || job.postedBy }}</div>
                  </div>
                </div>
                <button @click="goToPosterProfile" class="view-poster-profile-btn">
                  View Profile
                </button>
              </div>
              
              <div class="job-meta">
                <span class="meta-item">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  {{ job.date }}
                </span>
                <span class="meta-item">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  {{ job.location }}
                </span>
                <span class="meta-item">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 9h4"></path>
                    <path d="M14 9h4"></path>
                    <path d="M6 18h8"></path>
                    <path d="M7 3v2"></path>
                    <path d="M17 3v2"></path>
                    <path d="M10 3 7 9h10l-3-6Z"></path>
                    <path d="M6 9v9a3 3 0 0 0 3 3v0"></path>
                    <path d="M18 9v9a3 3 0 0 1-3 3v0"></path>
                  </svg>
                  {{ job.category }}
                </span>
              </div>

              <!-- Expiration Badge -->
              <div 
                v-if="job.expiration_date" 
                :class="['expiration-badge', `expiration-${expirationStatus}`]"
              >
                {{ formattedExpirationDate }}
              </div>

              <!-- MERGED: Multiple Helpers Counter with Fully Booked Indicator -->
              <div v-if="job.requiresMultipleHelpers && maxHelpers > 0" class="helpers-counter">
                <div class="counter-info">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  <span>
                    <strong>{{ helperSignupCount }}/{{ maxHelpers }}</strong> positions filled
                  </span>
                </div>
                <!-- ✅ From File 2: Fully Booked Badge -->
                <span v-if="isFullyBooked" class="fully-booked-badge">
                  ✓ Fully Booked
                </span>
              </div>
            </div>
          </div>

          <!-- Job Description -->
          <div class="job-section">
            <h2 class="section-title">Job Description</h2>
            <p class="job-description">{{ job.fullDescription }}</p>
          </div>

          <!-- Images Gallery -->
          <div v-if="job.images && job.images.length > 0" class="job-section">
            <h2 class="section-title">Photos</h2>
            <div class="images-grid">
              <div 
                v-for="(image, index) in job.images" 
                :key="index" 
                class="image-item"
                @click="openImageModal(index)"
              >
                <img :src="image" :alt="`Job image ${index + 1}`" />
              </div>
            </div>
          </div>

          <!-- Map Section -->
          <div class="job-section">
            <div class="map-header">
              <h2 class="section-title">Location</h2>
              <button @click="toggleMap" class="toggle-map-btn">
                {{ showMap ? 'Hide Map' : 'Show Map' }}
              </button>
            </div>
            
            <div v-if="showMap" class="map-container">
              <GoogleMap
                :api-key="apiKey"
                :center="mapCenter"
                :zoom="15"
                style="width: 100%; height: 100%;"
              >
                <Marker :options="{ position: mapCenter }" @click="showMapInfoWindow = true" />
                <InfoWindow 
                  v-if="showMapInfoWindow"
                  :options="{ position: mapCenter }"
                  @closeclick="showMapInfoWindow = false"
                >
                  <div class="map-info-window">
                    <h3>{{ job.name }}</h3>
                    <p>{{ job.location }}</p>
                  </div>
                </InfoWindow>
              </GoogleMap>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="sidebar">
        <div class="action-card">
          <!-- MERGED: Poster Info with Avatar from File 1 -->
          <div class="poster-info" @click="goToPosterProfile" style="cursor: pointer;">
            <div class="poster-avatar">
              <img 
                v-if="posterAvatarUrl" 
                :src="posterAvatarUrl" 
                :alt="posterName" 
                style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"
              />
              <div v-else>
                {{ posterInitials }}
              </div>
            </div>
            <div>
              <p class="poster-name">{{ posterName || job.postedBy }}</p>
              <p class="poster-label">Job Poster</p>
            </div>
          </div>

          <!-- Price -->
          <div class="price-highlight">
            <p style="margin: 0; font-size: 0.875rem; color: #059669; font-weight: 500;">Budget</p>
            <span class="price-large">{{ job.budget }}</span>
          </div>

          <!-- MERGED: Action Buttons - Show different buttons for owner vs non-owner -->
          <div v-if="!isOwnListing" class="action-buttons">
            <button @click="startChat" class="chat-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              Chat
            </button>
            <button 
              @click="showOfferModal = true" 
              class="offer-btn"
              :disabled="isFullyBooked"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              {{ isFullyBooked ? 'Fully Booked' : 'Make Offer' }}
            </button>
          </div>

          <!-- Owner Action Buttons -->
          <div v-else class="action-buttons-own">
            <button @click="viewChats" class="owner-btn primary-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              View All Chats
            </button>
            <button @click="editListing" class="owner-btn secondary-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
              </svg>
              Edit Listing
            </button>
            <button @click="confirmDelete" class="owner-btn danger-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
              Delete Listing
            </button>
          </div>

          <!-- Safety Tips -->
          <div class="safety-tips">
            <p class="tips-title">💡 Safety Tips</p>
            <ul class="tips-list">
              <li>Meet in public places</li>
              <li>Don't share personal info</li>
              <li>Trust your instincts</li>
              <li>Report suspicious activity</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Image Modal -->
    <div v-if="showImageModal" class="image-modal-overlay" @click="closeImageModal">
      <button @click="closeImageModal" class="image-modal-close">×</button>
      <button v-if="selectedImageIndex > 0" @click.stop="prevImage" class="image-nav-btn prev-btn">
        ‹
      </button>
      <div class="image-modal-content" @click.stop>
        <img :src="job.images[selectedImageIndex]" :alt="`Image ${selectedImageIndex + 1}`" />
      </div>
      <button 
        v-if="selectedImageIndex < job.images.length - 1" 
        @click.stop="nextImage" 
        class="image-nav-btn next-btn"
      >
        ›
      </button>
      <div class="image-counter">
        {{ selectedImageIndex + 1 }} / {{ job.images.length }}
      </div>
    </div>

    <!-- Offer Modal -->
    <div v-if="showOfferModal" class="modal-overlay" @click="showOfferModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">Make an Offer</h3>
          <button @click="showOfferModal = false" class="close-btn">×</button>
        </div>
        
        <div class="modal-body">
          <div class="offer-info">
            <p class="offer-job-title">{{ job.name }}</p>
            <p class="offer-original-price">Original Budget: {{ job.budget }}</p>
          </div>

          <div class="form-group">
            <label class="form-label">Your Offer Amount ($)</label>
            <input 
              v-model="offerAmount" 
              type="number" 
              placeholder="Enter amount" 
              class="offer-input"
              min="0"
              step="0.01"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Message to Job Poster</label>
            <textarea 
              v-model="offerMessage" 
              placeholder="Explain why you're the best fit for this job..."
              class="offer-textarea"
            ></textarea>
          </div>

          <div class="modal-actions">
            <button @click="showOfferModal = false" class="cancel-btn">Cancel</button>
            <button 
              @click="submitOffer" 
              :disabled="isSubmitting || !offerAmount || !offerMessage.trim()"
              class="submit-offer-btn"
            >
              {{ isSubmitting ? 'Submitting...' : 'Submit Offer' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="showDeleteModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">Delete Listing?</h3>
          <button @click="showDeleteModal = false" class="close-btn">×</button>
        </div>
        
        <div class="modal-body">
          <p style="margin-bottom: 1.5rem; color: #6b7280;">
            Are you sure you want to delete this job listing? This action cannot be undone.
          </p>

          <div class="modal-actions">
            <button @click="showDeleteModal = false" class="cancel-btn">Cancel</button>
            <button 
              @click="deleteListing" 
              :disabled="isSubmitting"
              class="submit-offer-btn"
              style="background: #dc2626;"
            >
              {{ isSubmitting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
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
  background: #f9fafb;
  padding: 2rem 1rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* Toast Notifications */
.toast-container {
  position: fixed;
  top: 2rem;
  right: 2rem;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.toast {
  padding: 1rem 1.5rem;
  border-radius: 0.5rem;
  background: white;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  animation: slideIn 0.3s ease-out;
  min-width: 250px;
  border-left: 4px solid;
}

.toast-success {
  border-left-color: #10b981;
  color: #065f46;
}

.toast-error {
  border-left-color: #ef4444;
  color: #991b1b;
}

.toast-info {
  border-left-color: #3b82f6;
  color: #1e40af;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.job-container {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 2rem;
  align-items: start;
}

.main-content {
  min-width: 0;
}

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
  margin-bottom: 1.5rem;
}

.back-button:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  transform: translateX(-2px);
}

.job-card {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.job-header {
  padding: 2rem;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.job-header-content {
  max-width: 100%;
}

.job-header-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  color: white;
  line-height: 1.3;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

/* MERGED: Poster profile with avatar */
.poster-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.poster-profile-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.poster-avatar-small {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.poster-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.poster-avatar-initials {
  font-size: 1rem;
  font-weight: 600;
  color: white;
}

.poster-small-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 0.125rem;
}

.poster-name-text {
  font-size: 0.9375rem;
  font-weight: 600;
  color: white;
}

.view-poster-profile-btn {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.view-poster-profile-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

.job-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.95);
  font-size: 0.9375rem;
}

.expiration-badge {
  display: inline-block;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.expiration-active {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.expiration-expiring-soon {
  background: #fef3c7;
  color: #92400e;
}

.expiration-expired {
  background: #fee2e2;
  color: #991b1b;
}

.expiration-never {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

/* MERGED: Helpers counter with fully booked badge */
.helpers-counter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  color: white;
}

.counter-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
}

.fully-booked-badge {
  padding: 0.375rem 0.75rem;
  background: #10b981;
  color: white;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 600;
}

.job-section {
  padding: 2rem;
  border-bottom: 1px solid #e5e7eb;
}

.job-section:last-child {
  border-bottom: none;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 1rem 0;
}

.job-description {
  color: #4b5563;
  line-height: 1.7;
  white-space: pre-wrap;
  margin: 0;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.image-item {
  aspect-ratio: 1;
  border-radius: 0.5rem;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
}

.image-item:hover {
  transform: scale(1.05);
}

.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.toggle-map-btn {
  padding: 0.5rem 1rem;
  background: #f3f4f6;
  border: none;
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

.map-container {
  width: 100%;
  height: 400px;
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.map-info-window {
  padding: 0.5rem;
}

.map-info-window h3 {
  font-size: 1rem;
  margin: 0 0 0.25rem 0;
  color: #111827;
}

.map-info-window p {
  font-size: 0.875rem;
  margin: 0;
  color: #6b7280;
}

/* Image Modal */
.image-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 2rem;
}

.image-modal-content {
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-modal-content img {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 0.5rem;
}

.image-modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  font-size: 2rem;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  backdrop-filter: blur(10px);
}

.image-modal-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.image-nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  font-size: 2rem;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  backdrop-filter: blur(10px);
}

.image-nav-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.prev-btn {
  left: 2rem;
}

.next-btn {
  right: 2rem;
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
  overflow: hidden;
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

.offer-btn:hover:not(:disabled) {
  background: #b91c1c;
  border-color: #b91c1c;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

.offer-btn:disabled {
  background: #9ca3af;
  border-color: #9ca3af;
  cursor: not-allowed;
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

.submit-offer-btn:hover:not(:disabled) {
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

  .action-buttons {
    grid-template-columns: 1fr;
    flex-direction: column;
  }
}
</style>