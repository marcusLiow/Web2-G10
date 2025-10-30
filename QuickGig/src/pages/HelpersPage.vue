<script setup>
import { ref, computed, onMounted } from 'vue';
import { supabase } from '../supabase/config';
import { useRouter } from 'vue-router';
import Reviews from './Reviews.vue';

const router = useRouter();

const helpers = ref([]);
const searchTerm = ref('');
const selectedSkill = ref('');
const selectedHelper = ref(null);
const showModal = ref(false);
const isLoading = ref(true);

// track current user
const currentUserId = ref(null);

const isCurrentUserTheHelper = computed(() => {
  return currentUserId.value === selectedHelper.value?.userId;
});

const skillsList = [
  'Cleaning','Carpentry','Plumbing','Electrical','Painting','Landscaping',
  'Pet Care','Moving','Web Development','Graphic Design','Writing','Tutoring',
  'Photography','Cooking','Other'
];

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

/* --- Helpers fetching --- */
const fetchHelpers = async () => {
  try {
    isLoading.value = true;

    // Fetch from public_helpers (your friend's change used 'users' table with is_helper flag)
    // Choose the one that matches your database schema
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('is_helper', true);

    if (usersError) throw usersError;
    if (!usersData || usersData.length === 0) { helpers.value = []; isLoading.value = false; return; }

    const userIds = usersData.map(u => u.id);

    // aggregated stats
    const { data: statsData, error: statsError } = await supabase.rpc('get_helper_stats');
    if (statsError) console.warn('get_helper_stats error', statsError);
    const statsMap = {};
    if (Array.isArray(statsData)) statsData.forEach(s => { statsMap[String(s.helper_id)] = s; });

    // helper_profiles - only fetch active profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('helper_profiles')
      .select('*')
      .in('user_id', userIds)
      .eq('is_active', true);
    if (profilesError) console.warn('helper_profiles fetch error', profilesError);
    const profilesMap = {};
    (profiles || []).forEach(p => { profilesMap[String(p.user_id)] = p; });

    // Fetch reviews - FIXED: avoid ambiguous relationship
    const { data: reviewsData, error: reviewsError } = await supabase
      .from('reviews')
      .select('helper_id, rating, comment, created_at, reviewer_id')
      .in('helper_id', userIds)
      .order('created_at', { ascending: false });
    
    if (reviewsError) console.warn('reviews fetch error', reviewsError);
    
    // Fetch reviewer details separately
    let reviewersMap = {};
    if (reviewsData && reviewsData.length > 0) {
      const reviewerIds = [...new Set(reviewsData.map(r => r.reviewer_id).filter(Boolean))];
      
      if (reviewerIds.length > 0) {
        const { data: reviewersData } = await supabase
          .from('users')
          .select('id, username, avatar_url')
          .in('id', reviewerIds);
        
        if (reviewersData) {
          reviewersMap = Object.fromEntries(reviewersData.map(u => [u.id, u]));
        }
      }
    }

    const latestReviewMap = {};
    (reviewsData || []).forEach(r => {
      const hid = String(r.helper_id);
      if (!latestReviewMap[hid]) {
        const reviewer = reviewersMap[r.reviewer_id] || {};
        latestReviewMap[hid] = {
          comment: r.comment,
          rating: r.rating,
          reviewerName: reviewer.username || 'Anonymous',
          reviewerAvatar: reviewer.avatar_url || '',
          createdAt: r.created_at
        };
      }
    });

    // MERGED: Filter to only include users with active helper profiles (from friend's version)
    const merged = usersData
      .filter(user => profilesMap[user.id]) // Only include users with active helper profiles
      .map(user => {
        const profile = profilesMap[user.id];
        const stats = statsMap[user.id] || { avg_rating: 0, review_count: 0, completed_jobs: 0 };
        const rawSkills = profile.skills || user.skills || [];
        return {
          id: user.id,
          userId: user.id,
          name: user.username || 'Anonymous',
          username: user.username || 'Anonymous',
          avatarUrl: user.avatar_url || '',
          title: profile.title || user.helper_title || 'Helper',
          description: profile.description || user.helper_bio || 'Available to help with various tasks',
          skills: normalizeSkills(rawSkills),
          location: profile.location || user.location || 'Not specified', // Better priority
          availability: profile.availability || 'Contact for availability',
          responseTime: profile.response_time || 'Usually responds within 24 hours',
          rating: Math.round(Number(stats.avg_rating) * 10) / 10 || 0,
          reviewCount: Number(stats.review_count) || 0,
          completedJobs: Number(stats.completed_jobs) || 0,
          bio: profile.bio || user.helper_bio || user.bio || '', // Better fallback
          experience: profile.experience || ['Contact for details'],
          latestReview: latestReviewMap[user.id] || null,
          // helper UI flags (set later when profile opened)
          canLeaveReview: false,
          hasReviewed: false
        };
      });

    helpers.value = merged;
  } catch (err) {
    console.error('fetchHelpers error:', err);
    helpers.value = [];
  } finally {
    isLoading.value = false;
  }
};

const fetchHelperStatsFor = async (helperId) => {
  try {
    if (!helperId) return;
    const { data, error } = await supabase.rpc('get_helper_stats_for', { helper_uuid: helperId });
    if (error) { console.error('get_helper_stats_for error', error); return; }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return;
    if (selectedHelper.value && selectedHelper.value.userId === helperId) {
      selectedHelper.value.rating = Number(row.avg_rating) || 0;
      selectedHelper.value.reviewCount = Number(row.review_count) || 0;
      selectedHelper.value.completedJobs = Number(row.completed_jobs) || 0;
    }
  } catch (err) {
    console.error('fetchHelperStatsFor error:', err);
  }
};

/* --- Review / eligibility checks --- */
const checkReviewEligibility = async (helperId) => {
  // default
  if (!selectedHelper.value) return;
  selectedHelper.value.canLeaveReview = false;
  selectedHelper.value.hasReviewed = false;

  try {
    // ensure we have currentUserId
    if (!currentUserId.value) {
      const { data: sessionData } = await supabase.auth.getSession();
      currentUserId.value = sessionData?.session?.user?.id || localStorage.getItem('userId');
    }
    if (!currentUserId.value) return;

    // Check helper_jobs: allow review if there's a completed or in-progress job between current user and this helper
    const { data: jobData, error: jobError } = await supabase
      .from('helper_jobs')
      .select('id,status')
      .eq('helper_id', helperId)
      .eq('client_id', currentUserId.value)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (jobError && jobError.code !== 'PGRST116') {
      console.error('helper_jobs query error:', jobError);
    }

    const jobExists = !!jobData;
    const jobAcceptable = jobData?.status === 'completed' || jobData?.status === 'in-progress';

    // Check if user already reviewed this helper
    const { data: reviewData, error: reviewError } = await supabase
      .from('reviews')
      .select('id')
      .eq('helper_id', helperId)
      .eq('reviewer_id', currentUserId.value)
      .maybeSingle();

    if (reviewError && reviewError.code !== 'PGRST116') {
      console.error('reviews query error:', reviewError);
    }

    const alreadyReviewed = !!reviewData;

    // Logic: allow review when there's an in-progress/completed job and user hasn't already reviewed.
    selectedHelper.value.canLeaveReview = jobExists && jobAcceptable && !alreadyReviewed;
    selectedHelper.value.hasReviewed = alreadyReviewed;

  } catch (err) {
    console.error('checkReviewEligibility error:', err);
  }
};

/* --- UI handlers --- */
const viewHelperProfile = async (helper) => {
  selectedHelper.value = { ...helper }; // clone to avoid mutating list entry directly
  showModal.value = true;

  // populate dynamic stats
  await fetchHelperStatsFor(helper.userId);

  // check review eligibility for this helper
  await checkReviewEligibility(helper.userId);
};

const closeModal = () => { showModal.value = false; selectedHelper.value = null; };

// KEPT FROM YOUR VERSION: Navigate to helper's profile page
const goToHelperProfile = () => {
  if (selectedHelper.value && selectedHelper.value.userId) {
    // Store userId before closing modal (which clears selectedHelper)
    const userId = selectedHelper.value.userId;
    closeModal();
    router.push(`/profile/${userId}`);
  }
};

const startChat = async () => {
  try {
    console.log('=== START CHAT DEBUG ===');
    
    // Check Supabase auth
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log('Session data:', sessionData);
    console.log('Session error:', sessionError);
    console.log('Auth user:', sessionData?.session?.user);
    console.log('Auth UID:', sessionData?.session?.user?.id);
    
    const curUserId = sessionData?.session?.user?.id || localStorage.getItem('userId');
    console.log('Using user ID:', curUserId);
    
    if (!curUserId) {
      console.error('No user ID found');
      alert('Please log in to start a chat');
      closeModal();
      router.push('/login');
      return;
    }

    const helperId = selectedHelper.value.userId;
    console.log('Helper ID:', helperId);
    
    if (!helperId) {
      console.error('Helper ID is missing');
      alert('Unable to start chat: Helper information missing');
      return;
    }
    
    if (curUserId === helperId) {
      console.log('User attempting to chat with themselves');
      alert('You cannot chat with yourself');
      return;
    }

    console.log('Checking for existing helper chat...');

    // Check if chat already exists for this helper
    const { data: existingChat, error: searchError } = await supabase
      .from('helper_chats')
      .select('id')
      .eq('helper_id', helperId)
      .eq('client_id', curUserId)
      .maybeSingle();

    console.log('Existing chat search result:', existingChat);
    console.log('Search error:', searchError);

    if (searchError && searchError.code !== 'PGRST116') {
      console.error('Error searching for chat:', searchError);
      throw searchError;
    }

    let chatId;

    if (existingChat) {
      chatId = existingChat.id;
      console.log('✅ Using existing helper chat:', chatId);
    } else {
      // Create new helper chat
      console.log('Creating new helper chat...');
      console.log('Insert data:', {
        helper_id: helperId,
        client_id: curUserId,
        last_message: 'Chat started',
        last_message_time: new Date().toISOString()
      });

      const { data: newChat, error: createError } = await supabase
        .from('helper_chats')
        .insert([{
          helper_id: helperId,
          client_id: curUserId,
          last_message: 'Chat started',
          last_message_time: new Date().toISOString()
        }])
        .select()
        .single();

      console.log('Create result:', newChat);
      console.log('Create error:', createError);

      if (createError) {
        console.error('Failed to create chat:', createError);
        alert('Failed to create chat. Please try again.');
        return;
      }

      if (!newChat || !newChat.id) {
        console.error('Chat created but no ID returned');
        alert('Failed to create chat. Please try again.');
        return;
      }

      chatId = newChat.id;
      console.log('✅ Created new helper chat:', chatId);
    }

    console.log('Navigating to helper chat:', chatId);
    closeModal();
    router.push(`/helper-chats?chatId=${chatId}`);

  } catch (err) {
    console.error('Error in startChat:', err);
    alert('An error occurred. Please try again.');
  }
};

/* --- Computed / filtering --- */
const filteredHelpers = computed(() => {
  let result = helpers.value;
  // Search filter
  if (searchTerm.value.trim()) {
    const term = searchTerm.value.toLowerCase();
    result = result.filter(h => {
      const nameMatch = h.name.toLowerCase().includes(term);
      const titleMatch = h.title.toLowerCase().includes(term);
      const descMatch = h.description.toLowerCase().includes(term);
      return nameMatch || titleMatch || descMatch;
    });
  }
  // Skill filter
  if (selectedSkill.value) {
    result = result.filter(h => {
      return h.skills.some(sk => sk.name.toLowerCase() === selectedSkill.value.toLowerCase());
    });
  }
  return result;
});

function renderStars(rating) {
  const fullStars = Math.floor(rating);
  let stars = '';
  for (let i = 0; i < fullStars; i++) stars += '★';
  for (let i = fullStars; i < 5; i++) stars += '☆';
  return stars;
}

onMounted(async () => {
  const { data } = await supabase.auth.getSession();
  currentUserId.value = data?.session?.user?.id || localStorage.getItem('userId');
  await fetchHelpers();
});
</script>

<template>
  <div class="page-wrapper">
    <!-- Header -->
    <div class="header">
      <h1 class="page-title">Find a Helper</h1>
      <p class="page-subtitle">Connect with skilled helpers in your area</p>
    </div>

    <!-- Filters -->
    <div class="filters">
      <div class="search-box">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="search-icon">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <input 
          v-model="searchTerm" 
          type="text" 
          placeholder="Search helpers by name, title, or description..." 
          class="search-input"
        />
      </div>

      <div class="skill-filter">
        <label for="skill-select" class="filter-label">Filter by skill:</label>
        <select v-model="selectedSkill" id="skill-select" class="select-input">
          <option value="">All Skills</option>
          <option v-for="skill in skillsList" :key="skill" :value="skill">{{ skill }}</option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>Loading helpers...</p>
    </div>

    <!-- No Results -->
    <div v-else-if="filteredHelpers.length === 0" class="no-results">
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-results-icon">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <h3>No helpers found</h3>
      <p>Try adjusting your search or filters</p>
    </div>

    <!-- Helpers Grid -->
    <div v-else class="helpers-grid">
      <div 
        v-for="helper in filteredHelpers" 
        :key="helper.id" 
        class="helper-card"
      >
        <!-- Card Header -->
        <div class="card-header">
          <div class="helper-avatar">
            <img v-if="helper.avatarUrl" :src="helper.avatarUrl" :alt="helper.name" class="avatar-img" />
            <div v-else class="avatar-placeholder">{{ helper.name.charAt(0).toUpperCase() }}</div>
          </div>
          <div class="helper-info">
            <h3 class="helper-name">{{ helper.name }}</h3>
            <p class="helper-title">{{ helper.title }}</p>
            <div class="helper-rating">
              <span class="stars">{{ renderStars(helper.rating) }}</span>
              <span class="rating-text">{{ helper.rating }}</span>
              <span class="review-count">({{ helper.reviewCount }})</span>
            </div>
          </div>
        </div>

        <!-- Description -->
        <p class="helper-description">{{ helper.description }}</p>

        <!-- Meta Info -->
        <div class="helper-meta">
          <div class="meta-item">
            <span class="icon">📍</span>
            <span>{{ helper.location }}</span>
          </div>
          <div class="meta-item">
            <span class="icon">✓</span>
            <span>{{ helper.completedJobs }} jobs completed</span>
          </div>
        </div>

        <!-- Skills Preview -->
        <div class="skills-preview">
          <span 
            v-for="(skill, idx) in helper.skills.slice(0, 3)" 
            :key="skill.name + String(idx)" 
            class="skill-badge"
          >
            {{ skill.name }}
          </span>
          <span v-if="helper.skills.length > 3" class="more-skills">
            +{{ helper.skills.length - 3 }} more
          </span>
        </div>

        <!-- View Profile Button -->
        <button @click="viewHelperProfile(helper)" class="view-profile-btn">
          View Profile
        </button>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal && selectedHelper" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <button @click="closeModal" class="close-btn">×</button>

        <!-- Modal Header -->
        <div class="modal-header">
          <div class="profile-section">
            <div class="profile-avatar-large">
              <img v-if="selectedHelper.avatarUrl" :src="selectedHelper.avatarUrl" :alt="selectedHelper.name" class="avatar-img-large" />
              <div v-else class="avatar-placeholder-large">{{ selectedHelper.name.charAt(0).toUpperCase() }}</div>
            </div>
            <div>
              <!-- MERGED: Name and View Profile button on same line -->
              <div class="name-and-button">
                <h2 class="modal-name">{{ selectedHelper.name }}</h2>
                <p class="modal-title">{{ selectedHelper.title }}</p>
                  <div class="modal-stats d-flex flex-column flex-md-row align-items-md-center flex-wrap">

                    <div class="d-flex align-items-center me-md-2"> <span class="stars me-1">{{ renderStars(selectedHelper.rating) }}</span>
                      <span class="rating-text">{{ selectedHelper.rating }}</span>
                    </div>

                    <div class="mt-1 mt-md-0 me-md-2"> 
                      <span class="separator d-none d-md-inline">•</span> <span>{{ selectedHelper.reviewCount }} reviews</span>
                      <span class="separator d-none d-md-inline">•</span> <span>{{ selectedHelper.completedJobs }} jobs</span>
                    </div>

                  </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Info -->
        <div class="modal-quick-info">
          <div class="info-item">
            <span class="icon">📍</span>
            <div>
              <div class="info-label">Location</div>
              <div class="info-value">{{ selectedHelper.location }}</div>
            </div>
          </div>
          <div class="info-item">
            <span class="icon">📅</span>
            <div>
              <div class="info-label">Availability</div>
              <div class="info-value">{{ selectedHelper.availability }}</div>
            </div>
          </div>
          <div class="info-item">
            <span class="icon">⏱️</span>
            <div>
              <div class="info-label">Response Time</div>
              <div class="info-value">{{ selectedHelper.responseTime }}</div>
            </div>
          </div>
        </div>

        <!-- About Section -->
        <div class="modal-section">
          <h3 class="section-title">About</h3>
          <p class="section-text">{{ selectedHelper.bio }}</p>
        </div>

        <!-- Skills Section -->
        <div class="modal-section">
          <h3 class="section-title">Skills & Expertise</h3>
          <div class="skills-list">
            <span v-for="(skill, idx) in selectedHelper.skills" :key="skill.name + String(idx)" class="skill-tag">
              <strong>{{ skill.name }}</strong>
              <small v-if="skill.level"> — {{ skill.level }}</small>
              <div v-if="skill.jobs != null" class="skill-meta">({{ skill.jobs }} jobs)</div>
            </span>
          </div>
        </div>

        <!-- Experience Section -->
        <div class="modal-section">
          <h3 class="section-title">Experience & Qualifications</h3>
          <ul class="experience-list">
            <li v-for="(exp, idx) in selectedHelper.experience" :key="idx">{{ exp }}</li>
          </ul>
        </div>

        <!-- Reviews Section -->
        <Reviews :helperId="selectedHelper.userId" />

        <!-- Chat Button -->
        <button 
          v-if="!isCurrentUserTheHelper" 
          class="chat-btn" 
          @click="startChat"
        >
          Start Chat
        </button>
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
  background: linear-gradient(to bottom, #f8f9fa 0%, #e9ecef 100%);
  padding: 2rem 1rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  font-size: 1.125rem;
  color: #6b7280;
  margin: 0;
}

.filters {
  max-width: 1200px;
  margin: 0 auto 2rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
}

.search-box {
  flex: 1;
  min-width: 250px;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}

.search-input {
  width: 100%;
  padding: 0.875rem 1rem 0.875rem 3rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: all 0.2s;
  background: white;
}

.search-input:focus {
  outline: none;
  border-color: #6C5B7F;
  box-shadow: 0 0 0 3px rgba(108, 91, 127, 0.1);
}

.skill-filter {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.select-input {
  padding: 0.875rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 1rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.select-input:focus {
  outline: none;
  border-color: #6C5B7F;
  box-shadow: 0 0 0 3px rgba(108, 91, 127, 0.1);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  color: #6b7280;
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

.no-results {
  text-align: center;
  padding: 4rem 2rem;
  color: #6b7280;
}

.no-results-icon {
  margin-bottom: 1rem;
  opacity: 0.5;
}

.no-results h3 {
  font-size: 1.5rem;
  margin: 0 0 0.5rem 0;
  color: #374151;
}

.no-results p {
  font-size: 1rem;
  margin: 0;
}

.helpers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.helper-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
}

.helper-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.helper-avatar {
  width: 4rem;
  height: 4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  border-radius: 0.5rem;
  flex-shrink: 0;
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 1.5rem;
  font-weight: 600;
  color: #6b7280;
}

.helper-info {
  flex: 1;
  min-width: 0;
}

.helper-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.25rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.helper-title {
  font-size: 0.95rem;
  color: #6b7280;
  margin: 0 0 0.5rem 0;
  font-weight: 500;
}

.helper-rating {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
}

.stars {
  color: #f59e0b;
  font-size: 1rem;
}

.rating-text {
  font-weight: 700;
  color: #374151;
}

.review-count {
  color: #6b7280;
  font-weight: 500;
}

.helper-description {
  color: #4b5563;
  line-height: 1.6;
  margin: 0 0 1rem 0;
  font-size: 0.95rem;
  flex-grow: 1;
}

.helper-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 0.5rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
}

.icon {
  font-size: 1rem;
}

.skills-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.skill-badge {
  display: inline-block;
  padding: 0.375rem 0.75rem;
  background: #E8E3ED;
  color: #4A3F5C;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border: 1px solid #C7BDD6;
}

.more-skills {
  display: inline-block;
  padding: 0.375rem 0.75rem;
  color: #6b7280;
  font-size: 0.8125rem;
  font-weight: 500;
}

.view-profile-btn {
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

.view-profile-btn:hover {
  background: #111827;
  transform: translateY(-1px);
}

/* Modal */
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

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  animation: slideUp 0.3s;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
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

.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: #f3f4f6;
  border: none;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  font-size: 1.5rem;
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

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-right: 2rem;
}

.profile-section {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.profile-avatar-large {
  width: 5rem;
  height: 5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  border-radius: 0.75rem;
  flex-shrink: 0;
  overflow: hidden;
}

.avatar-img-large {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder-large {
  font-size: 2.5rem;
  font-weight: 600;
  color: #6b7280;
}

/* MERGED: Name and button container */
.name-and-button {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

.modal-name {
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

/* MERGED: View Profile button in modal */
.view-profile-link-btn {
  padding: 0.5rem 1rem;
  background: #6C5B7F;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.view-profile-link-btn:hover {
  background: #5A4C6B;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(108, 91, 127, 0.3);
}

.modal-title {
  font-size: 1.125rem;
  color: #6b7280;
  margin: 0 0 0.5rem 0;
  font-weight: 500;
}

.modal-stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  color: #374151;
}

.separator {
  color: #d1d5db;
}

.modal-quick-info {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 0.75rem;
}

@media (max-width: 640px) {
  .modal-quick-info {
    grid-template-columns: 1fr;
  }
  
  .name-and-button {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .view-profile-link-btn {
    font-size: 0.8125rem;
    padding: 0.375rem 0.75rem;
  }
}

.info-item {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.info-label {
  font-size: 0.8125rem;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.info-value {
  font-size: 0.95rem;
  color: #111827;
  font-weight: 600;
}

.modal-section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 1rem 0;
}

.section-text {
  color: #4b5563;
  line-height: 1.7;
  margin: 0;
}

.skills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.skill-tag {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: #E8E3ED;
  color: #4A3F5C;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid #C7BDD6;
}

.skill-meta {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.experience-list {
  margin: 0;
  padding-left: 1.5rem;
  color: #4b5563;
  line-height: 1.8;
}

.experience-list li {
  margin-bottom: 0.5rem;
}

.chat-btn {
  width: 100%;
  padding: 1rem;
  background: #6C5B7F;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 1rem;
}

.chat-btn:hover {
  background: #5A4C6B;
  transform: translateY(-1px);
  box-shadow: 0 10px 15px -3px rgba(108, 91, 127, 0.3);
}
</style>