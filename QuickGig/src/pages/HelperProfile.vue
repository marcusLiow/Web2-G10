<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '../supabase/config';
import { useToast } from '../composables/useToast';
import Reviews from './Reviews.vue';

const toast = useToast();

const route = useRoute();
const router = useRouter();

const helper = ref(null);
const isLoading = ref(true);
const currentUserId = ref(null);

const isCurrentUserTheHelper = computed(() => {
  return currentUserId.value === helper.value?.userId;
});

/* --- Skill normalization utilities --- */
function parseSkill(item) {
  if (item == null) return { name: 'Unknown' };
  if (typeof item === 'object') {
    return { name: item.name || item.title || String(item), level: item.level ?? null, jobs: item.jobs ?? null };
  }
  if (typeof item === 'string') {
    try {
      const parsed = JSON.parse(item);
      if (parsed && typeof parsed === 'object') {
        return { name: parsed.name || parsed.title || String(parsed), level: parsed.level ?? null, jobs: parsed.jobs ?? null };
      }
    } catch (e) {}
    return { name: item };
  }
  return { name: String(item) };
}

function normalizeSkills(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(parseSkill);
  return [parseSkill(raw)];
}

/* --- Helper data fetching --- */
const fetchHelperProfile = async () => {
  try {
    isLoading.value = true;
    const helperId = route.params.id;

    if (!helperId) {
      throw new Error('No helper ID provided');
    }

    // Fetch user data and helper profile simultaneously
    const [userResponse, profileResponse, statsResponse] = await Promise.all([
      // Basic user info
      supabase
        .from('users')
        .select('*')
        .eq('id', helperId)
        .single(),
      
      // Helper profile
      supabase
        .from('helper_profiles')
        .select('*')
        .eq('user_id', helperId)
        .eq('is_active', true)
        .single(),

      // Helper stats
      supabase.rpc('get_helper_stats_for', { helper_uuid: helperId })
    ]);

    if (userResponse.error) throw userResponse.error;
    if (profileResponse.error && profileResponse.error.code !== 'PGRST116') throw profileResponse.error;
    if (statsResponse.error) throw statsResponse.error;

    const userData = userResponse.data;
    const profileData = profileResponse.data || {};
    const statsData = Array.isArray(statsResponse.data) ? statsResponse.data[0] : statsResponse.data;

    // Fetch reviews
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
      .eq('helper_id', helperId)
      .order('created_at', { ascending: false });

    if (reviewsError) throw reviewsError;

    // Combine all data
    helper.value = {
      userId: userData.id,
      username: userData.username || 'Anonymous',
      avatarUrl: userData.avatar_url,
      title: profileData.title || userData.helper_title || 'Helper',
      bio: profileData.bio || userData.helper_bio || 'Available to help with various tasks',
      skills: normalizeSkills(profileData.skills || userData.skills || []),
      location: profileData.location || userData.location || 'Not specified',
      availability: profileData.availability || 'Contact for availability',
      responseTime: profileData.response_time || 'Usually responds within 24 hours',
      experience: profileData.experience || ['Contact for details'],
      rating: Math.round(Number(statsData?.avg_rating || 0) * 10) / 10,
      reviewCount: Number(statsData?.review_count || 0),
      completedJobs: Number(statsData?.completed_jobs || 0),
      reviews: reviewsData || [],
      joinedDate: new Date(userData.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
      }),
      canLeaveReview: false,
      hasReviewed: false
    };
    
    await checkReviewEligibility(helperId);

  } catch (error) {
    console.error('Error fetching helper profile:', error);
    router.push('/helpers');
  } finally {
    isLoading.value = false;
  }
};

/* --- Review eligibility check --- */
const checkReviewEligibility = async (helperId) => {
  if (!helper.value) return;
  helper.value.canLeaveReview = false;
  helper.value.hasReviewed = false;

  try {
    // Get current user
    if (!currentUserId.value) {
      const { data: sessionData } = await supabase.auth.getSession();
      currentUserId.value = sessionData?.session?.user?.id || localStorage.getItem('userId');
    }
    if (!currentUserId.value) return;

    // Check for completed or in-progress jobs
    const { data: jobData, error: jobError } = await supabase
      .from('helper_jobs')
      .select('id,status')
      .eq('helper_id', helperId)
      .eq('client_id', currentUserId.value)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (jobError && jobError.code !== 'PGRST116') throw jobError;

    const jobExists = !!jobData;
    const jobAcceptable = jobData?.status === 'completed' || jobData?.status === 'in-progress';

    // Check for existing review
    const { data: reviewData, error: reviewError } = await supabase
      .from('reviews')
      .select('id')
      .eq('helper_id', helperId)
      .eq('reviewer_id', currentUserId.value)
      .maybeSingle();

    if (reviewError && reviewError.code !== 'PGRST116') throw reviewError;

    const alreadyReviewed = !!reviewData;

    helper.value.canLeaveReview = jobExists && jobAcceptable && !alreadyReviewed;
    helper.value.hasReviewed = alreadyReviewed;

  } catch (err) {
    console.error('checkReviewEligibility error:', err);
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

/* --- Start chat functionality --- */
const startChat = async () => {
  try {
    if (!currentUserId.value) {
      toast.warning('Please log in to start a chat', 'Login Required', 8000);
      router.push('/login');
      return;
    }

    if (currentUserId.value === helper.value.userId) {
      toast.info('You cannot chat with yourself', 'Invalid Action', 8000);
      return;
    }

    // Check for existing chat
    const { data: existingChat, error: searchError } = await supabase
      .from('helper_chats')
      .select('id')
      .eq('helper_id', helper.value.userId)
      .eq('client_id', currentUserId.value)
      .maybeSingle();

    if (searchError && searchError.code !== 'PGRST116') throw searchError;

    let chatId;

    if (existingChat) {
      chatId = existingChat.id;
    } else {
      // Create new chat
      const { data: newChat, error: createError } = await supabase
        .from('helper_chats')
        .insert([{
          helper_id: helper.value.userId,
          client_id: currentUserId.value,
          last_message: 'Chat started',
          last_message_time: new Date().toISOString()
        }])
        .select()
        .single();

      if (createError) throw createError;
      chatId = newChat.id;
    }

    router.push(`/helper-chat/${chatId}`);
  } catch (error) {
    console.error('Start chat error:', error);
    toast.error('Failed to start chat. Please try again.', 'Chat Error', 8000);
  }
};

onMounted(async () => {
  // set current user
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    currentUserId.value = sessionData?.session?.user?.id || localStorage.getItem('userId');
  } catch (err) {
    currentUserId.value = localStorage.getItem('userId');
  }
  await fetchHelperProfile();
});
</script>

<template>
  <div class="page-wrapper">
    <div class="container">
      <!-- Back Button -->
      <button class="back-button" @click="router.push('/helpers')">
        <span class="back-icon">←</span> Back to Helpers
      </button>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading profile...</p>
      </div>

      <!-- Profile Content -->
      <div v-else-if="helper" class="profile-content">
        <!-- Header Section -->
        <div class="header-section">
          <div class="profile-header">
            <div class="profile-avatar">
              <img 
                v-if="helper.avatarUrl" 
                :src="helper.avatarUrl" 
                :alt="helper.username"
                class="avatar-image"
                @error="$event.target.style.display='none'"
              />
              <div v-if="!helper.avatarUrl || $event?.target?.style?.display === 'none'" 
                   class="avatar-placeholder">
                {{ helper.username.charAt(0).toUpperCase() }}
              </div>
            </div>
            <div class="profile-info">
              <h1 class="profile-name">{{ helper.username }}</h1>
              <p class="profile-title">{{ helper.title }}</p>
              <div class="rating-container">
                <span class="stars">{{ renderStars(helper.rating) }}</span>
                <span class="rating-number">{{ helper.rating }}</span>
                <span class="review-count">({{ helper.reviewCount }} reviews)</span>
              </div>
              <p class="member-since">Member since {{ helper.joinedDate }}</p>
            </div>
            <button v-if="!isCurrentUserTheHelper" 
                    class="contact-btn primary" 
                    @click="startChat">
              <span class="btn-icon">💬</span>
              Chat
            </button>
          </div>

          <!-- Quick Stats -->
          <div class="quick-stats">
            <div class="stat-card">
              <div class="stat-icon">📊</div>
              <div class="stat-value">{{ helper.completedJobs }}</div>
              <div class="stat-label">Jobs Completed</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">⭐</div>
              <div class="stat-value">{{ helper.rating }}/5</div>
              <div class="stat-label">Average Rating</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">📍</div>
              <div class="stat-value">{{ helper.location }}</div>
              <div class="stat-label">Location</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">⏱️</div>
              <div class="stat-value">{{ helper.responseTime }}</div>
              <div class="stat-label">Response Time</div>
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
              <p class="bio">{{ helper.bio }}</p>
            </div>

            <!-- Skills -->
            <div class="content-card">
              <h2 class="card-title">Skills & Expertise</h2>
              <div class="skills-grid">
                <div v-for="skill in helper.skills" 
                     :key="skill.name" 
                     class="skill-card">
                  <div class="skill-header">
                    <span class="skill-icon">✨</span>
                    <span class="skill-name">{{ skill.name }}</span>
                  </div>
                  <div class="skill-details">
                    <span v-if="skill.level" class="skill-level">
                      <span class="label-icon">📊</span>
                      {{ skill.level }}
                    </span>
                    <span v-if="skill.jobs" class="skill-jobs">
                      <span class="label-icon">💼</span>
                      {{ skill.jobs }} {{ skill.jobs === 1 ? 'job' : 'jobs' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Experience -->
            <div class="content-card">
              <h2 class="card-title">Experience</h2>
              <ul class="experience-list">
                <li v-for="(exp, index) in helper.experience" 
                    :key="index">{{ exp }}</li>
              </ul>
            </div>
          </div>

          <!-- Right Column -->
          <div class="side-column">
            <!-- Reviews -->
            <div class="content-card reviews-section">
              <h2 class="card-title">Reviews</h2>
              <Reviews 
                :helperId="helper.userId"
                :showForm="helper.canLeaveReview"
                :isHelperReviewing="isCurrentUserTheHelper"
                :key="helper.userId"
              />
              
              <div v-if="!helper.canLeaveReview && !helper.hasReviewed" 
                   class="review-note">
                <small>Complete a job with this helper to leave a review</small>
              </div>
              
              <!-- Reviews List -->
              <div v-if="helper.reviews.length > 0" class="reviews-list">
                <div v-for="review in helper.reviews" 
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
                        <span v-if="!review.reviewer.avatar_url || $event?.target?.style?.display === 'none'">
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
  border-top-color: #6C5B7F;
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
  background: #6C5B7F;
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

/* Skills Grid - UPDATED */
.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.skill-card {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1rem;
  transition: all 0.3s ease;
  cursor: default;
}

.skill-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #6C5B7F;
}

.skill-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.skill-icon {
  font-size: 1.25rem;
}

.skill-name {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  flex: 1;
}

.skill-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid #d1d5db;
}

.skill-level,
.skill-jobs {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.label-icon {
  font-size: 0.875rem;
}

.skill-level {
  color: #059669;
}

.skill-jobs {
  color: #3b82f6;
}

/* Experience */
.experience-list {
  margin: 0;
  padding-left: 1.5rem;
  color: #4b5563;
  line-height: 1.8;
}

.experience-list li {
  margin-bottom: 0.75rem;
}

/* Reviews */
.reviews-section {
  position: sticky;
  top: 2rem;
}

.review-note {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  text-align: center;
  color: #6b7280;
  font-style: italic;
  margin-bottom: 1.5rem;
}

.reviews-list {
  margin-top: 1.5rem;
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
  background: #6C5B7F;
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
  background: #4f46e5;
  color: white;
  border: none;
}

.contact-btn.primary:hover {
  background: #4338ca;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(79, 70, 229, 0.3);
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
  
  .skills-grid {
    grid-template-columns: 1fr;
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