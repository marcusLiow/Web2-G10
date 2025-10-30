<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '../supabase/config';

const route = useRoute();
const router = useRouter();

const user = ref(null);
const isLoading = ref(true);
const currentUserId = ref(null);
const activeListings = ref([]);
const userReviews = ref([]);

const isCurrentUser = computed(() => {
  return currentUserId.value === user.value?.id;
});

/* --- Fetch user profile data --- */
const fetchUserProfile = async () => {
  try {
    isLoading.value = true;
    const userId = route.params.id;

    if (!userId) {
      throw new Error('No user ID provided');
    }

    // Fetch user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // Fetch active job listings
    const { data: jobsData, error: jobsError } = await supabase
      .from('User-Job-Request')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (jobsError) throw jobsError;

    // Fetch reviews (where this user was the helper)
    const { data: reviewsData, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        reviewer:reviewer_id (
          id,
          username,
          avatar_url
        )
      `)
      .eq('helper_id', userId)
      .order('created_at', { ascending: false });

    if (reviewsError && reviewsError.code !== 'PGRST116') throw reviewsError;

    // Calculate stats
    const completedJobs = jobsData?.filter(job => job.status === 'completed')?.length || 0;
    const reviews = reviewsData || [];
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;

    // Transform job listings
    activeListings.value = (jobsData || []).map(job => ({
      id: job.id,
      title: job.title,
      description: job.description,
      payment: job.payment,
      category: job.category || 'Uncategorized',
      location: job.location,
      created_at: job.created_at,
      status: job.status || 'open',
      images: job.images || []
    }));

    userReviews.value = reviews;

    user.value = {
      id: userData.id,
      username: userData.username || 'Anonymous User',
      avatarUrl: userData.avatar_url,
      bio: userData.bio || 'This user hasn\'t added a bio yet.',
      location: userData.location || 'Not specified',
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: reviews.length,
      completedJobs: completedJobs,
      activeListings: activeListings.value.filter(job => job.status === 'open' || job.status === 'in_progress').length,
      joinedDate: new Date(userData.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
      })
    };

  } catch (error) {
    console.error('Error fetching user profile:', error);
    router.push('/jobs');
  } finally {
    isLoading.value = false;
  }
};

/* --- Utility functions --- */
const renderStars = (rating) => {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return '★'.repeat(full) + (half ? '☆' : '') + '☆'.repeat(empty);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const viewJobDetails = (jobId) => {
  router.push(`/job/${jobId}`);
};

/* --- Start chat functionality --- */
const startChat = async () => {
  try {
    if (!currentUserId.value) {
      alert('Please log in to start a chat');
      router.push('/login');
      return;
    }

    if (currentUserId.value === user.value.id) {
      alert('You cannot chat with yourself');
      return;
    }

    // For now, redirect to jobs page since direct user chat isn't implemented
    alert('To chat with this user, please find one of their active job listings and use the Chat button there.');
    
  } catch (error) {
    console.error('Start chat error:', error);
    alert('Failed to start chat. Please try again.');
  }
};

onMounted(async () => {
  // Get current user
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    currentUserId.value = sessionData?.session?.user?.id || localStorage.getItem('userId');
  } catch (err) {
    currentUserId.value = localStorage.getItem('userId');
  }
  await fetchUserProfile();
});
</script>

<template>
  <div class="page-wrapper">
    <div class="container">
      <!-- Back Button -->
      <button class="back-button" @click="router.back()">
        <span class="back-icon">←</span> Back
      </button>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading profile...</p>
      </div>

      <!-- Profile Content -->
      <div v-else-if="user" class="profile-content">
        <!-- Header Section -->
        <div class="header-section">
          <div class="profile-header">
            <div class="profile-avatar">
              <img 
                v-if="user.avatarUrl" 
                :src="user.avatarUrl" 
                :alt="user.username"
                class="avatar-image"
                @error="$event.target.style.display='none'"
              />
              <div v-if="!user.avatarUrl" class="avatar-placeholder">
                {{ user.username.charAt(0).toUpperCase() }}
              </div>
            </div>
            <div class="profile-info">
              <h1 class="profile-name">{{ user.username }}</h1>
              <p class="profile-title">Job Poster</p>
              <div class="rating-container">
                <span class="stars">{{ renderStars(user.rating) }}</span>
                <span class="rating-number">{{ user.rating }}</span>
                <span class="review-count">({{ user.reviewCount }} reviews)</span>
              </div>
              <p class="member-since">Member since {{ user.joinedDate }}</p>
            </div>
            <button v-if="!isCurrentUser" 
                    class="contact-btn primary" 
                    @click="startChat">
              <span class="btn-icon">💬</span>
              Chat
            </button>
          </div>

          <!-- Quick Stats -->
          <div class="quick-stats">
            <div class="stat-card">
              <div class="stat-icon">📝</div>
              <div class="stat-value">{{ user.activeListings }}</div>
              <div class="stat-label">Active Listings</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">✅</div>
              <div class="stat-value">{{ user.completedJobs }}</div>
              <div class="stat-label">Completed Jobs</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">⭐</div>
              <div class="stat-value">{{ user.rating }}/5</div>
              <div class="stat-label">Average Rating</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">📍</div>
              <div class="stat-value">{{ user.location }}</div>
              <div class="stat-label">Location</div>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div class="content-grid">
          <!-- Left Column -->
          <div class="main-column">
            <!-- About -->
            <div class="content-card">
              <h2 class="card-title">About</h2>
              <p class="bio">{{ user.bio }}</p>
            </div>

            <!-- Active Listings -->
            <div class="content-card">
              <h2 class="card-title">Active Job Listings ({{ activeListings.filter(j => j.status === 'open' || j.status === 'in_progress').length }})</h2>
              
              <div v-if="activeListings.filter(j => j.status === 'open' || j.status === 'in_progress').length === 0" class="empty-state">
                <div class="empty-icon">📋</div>
                <p>No active listings at the moment</p>
              </div>

              <div v-else class="listings-grid">
                <div v-for="job in activeListings.filter(j => j.status === 'open' || j.status === 'in_progress')" 
                     :key="job.id" 
                     class="listing-card"
                     @click="viewJobDetails(job.id)">
                  <div v-if="job.images && job.images.length > 0" class="listing-image">
                    <img :src="job.images[0]" :alt="job.title" />
                  </div>
                  <div class="listing-content">
                    <div class="listing-header">
                      <h3 class="listing-title">{{ job.title }}</h3>
                      <span class="listing-category">{{ job.category }}</span>
                    </div>
                    <p class="listing-description">{{ job.description.substring(0, 100) }}{{ job.description.length > 100 ? '...' : '' }}</p>
                    <div class="listing-footer">
                      <span class="listing-price">${{ job.payment }}</span>
                      <span class="listing-location">📍 {{ job.location }}</span>
                    </div>
                    <div class="listing-date">Posted {{ formatDate(job.created_at) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column -->
          <div class="side-column">
            <!-- Reviews -->
            <div class="content-card reviews-section">
              <h2 class="card-title">Reviews from Job Posters</h2>
              
              <div v-if="userReviews.length === 0" class="empty-state">
                <div class="empty-icon">⭐</div>
                <p>No reviews yet</p>
              </div>

              <!-- Reviews List -->
              <div v-else class="reviews-list">
                <div v-for="review in userReviews" 
                     :key="review.id" 
                     class="review-card">
                  <div class="review-header">
                    <div class="reviewer-info">
                      <div class="reviewer-avatar">
                        <img v-if="review.reviewer.avatar_url" 
                             :src="review.reviewer.avatar_url" 
                             :alt="review.reviewer.username"
                             @error="$event.target.style.display='none'"
                        />
                        <span v-if="!review.reviewer.avatar_url">
                          {{ review.reviewer.username.charAt(0).toUpperCase() }}
                        </span>
                      </div>
                      <div class="reviewer-details">
                        <span class="reviewer-name">{{ review.reviewer.username }}</span>
                        <span class="review-date">{{ formatDate(review.created_at) }}</span>
                      </div>
                    </div>
                    <div class="review-rating">
                      <div class="stars">{{ renderStars(review.rating) }}</div>
                      <div class="rating">{{ review.rating }}/5</div>
                    </div>
                  </div>
                  <p class="review-text">{{ review.comment }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Base Styles */
.page-wrapper {
  min-height: 100vh;
  background: #f8fafc;
  padding: 2rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

/* Back Button */
.back-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  color: #374151;
  font-weight: 500;
  margin-bottom: 2rem;
  cursor: pointer;
  transition: all 0.2s;
}

.back-button:hover {
  background: #f9fafb;
  transform: translateX(-2px);
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
}

.spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Header Section */
.header-section {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-bottom: 2rem;
}

.profile-avatar {
  width: 140px;
  height: 140px;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  background: #f3f4f6;
  position: relative;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 3rem;
  font-weight: 600;
}

.profile-info {
  flex: 1;
}

.profile-name {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.25rem 0;
}

.profile-title {
  font-size: 1.125rem;
  color: #6b7280;
  margin: 0 0 1rem 0;
}

.rating-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.stars {
  color: #f59e0b;
  font-size: 1.25rem;
}

.rating-number {
  font-weight: 700;
  color: #111827;
  font-size: 1.125rem;
}

.review-count {
  color: #6b7280;
  font-size: 0.95rem;
}

.member-since {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0;
}

/* Quick Stats */
.quick-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-top: 2rem;
}

.stat-card {
  background: #f8fafc;
  padding: 1.5rem;
  border-radius: 0.75rem;
  text-align: center;
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
}

.content-card {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 1.5rem 0;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

/* About Section */
.bio {
  color: #4b5563;
  line-height: 1.7;
  margin: 0;
  font-size: 1rem;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

/* Listings Grid */
.listings-grid {
  display: grid;
  gap: 1rem;
}

.listing-card {
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  overflow: hidden;
  transition: all 0.2s;
  cursor: pointer;
  background: white;
}

.listing-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #3b82f6;
}

.listing-image {
  width: 100%;
  height: 180px;
  overflow: hidden;
  background: #f3f4f6;
}

.listing-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.listing-content {
  padding: 1.25rem;
}

.listing-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.listing-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
  flex: 1;
}

.listing-category {
  background: #dbeafe;
  color: #1e40af;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.listing-description {
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0 0 1rem 0;
}

.listing-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.listing-price {
  font-size: 1.25rem;
  font-weight: 700;
  color: #059669;
}

.listing-location {
  font-size: 0.875rem;
  color: #6b7280;
}

.listing-date {
  font-size: 0.75rem;
  color: #9ca3af;
  padding-top: 0.5rem;
  border-top: 1px solid #f3f4f6;
}

/* Reviews */
.reviews-section {
  position: sticky;
  top: 2rem;
}

.reviews-list {
  margin-top: 0;
}

.review-card {
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-bottom: 1rem;
  transition: all 0.2s;
}

.review-card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.reviewer-info {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.reviewer-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.reviewer-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.reviewer-avatar span {
  color: white;
  font-weight: 600;
  font-size: 1.2rem;
}

.reviewer-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.reviewer-name {
  font-weight: 600;
  color: #111827;
  font-size: 0.95rem;
}

.review-date {
  font-size: 0.8125rem;
  color: #6b7280;
}

.review-rating {
  text-align: right;
}

.review-rating .stars {
  color: #f59e0b;
  font-size: 1rem;
  display: block;
  margin-bottom: 0.25rem;
}

.review-rating .rating {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 600;
}

.review-text {
  margin: 0;
  color: #4b5563;
  line-height: 1.6;
  font-size: 0.95rem;
}

/* Contact Button */
.contact-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
}

.contact-btn.primary {
  background: #3b82f6;
  color: white;
  border: none;
}

.contact-btn.primary:hover {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
}

.btn-icon {
  font-size: 1.25rem;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
  
  .quick-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .reviews-section {
    position: static;
  }
}

@media (max-width: 768px) {
  .profile-header {
    flex-direction: column;
    text-align: center;
  }
  
  .contact-btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .quick-stats {
    grid-template-columns: 1fr;
  }
  
  .page-wrapper {
    padding: 1rem;
  }
  
  .header-section {
    padding: 1.5rem;
  }
  
  .content-card {
    padding: 1.5rem;
  }
}
</style>