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

    // Fetch users marked as helpers along with their helper profiles
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

    // merge - only include users who have an active helper_profile
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
          location: profile.location || user.location || 'Not specified',
          availability: profile.availability || 'Contact for availability',
          responseTime: profile.response_time || 'Usually responds within 24 hours',
          rating: Math.round(Number(stats.avg_rating) * 10) / 10 || 0,
          reviewCount: Number(stats.review_count) || 0,
          completedJobs: Number(stats.completed_jobs) || 0,
          bio: profile.bio || user.helper_bio || user.bio || '',
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

      console.log('Create chat result:', newChat);
      console.log('Create error:', createError);

      if (createError) {
        console.error('❌ Error creating helper chat:', createError);
        console.error('Error code:', createError.code);
        console.error('Error message:', createError.message);
        console.error('Error details:', createError.details);
        console.error('Error hint:', createError.hint);
        throw createError;
      }

      chatId = newChat.id;
      console.log('✅ Created new helper chat:', chatId);
    }

    // Navigate to chat
    console.log('Navigating to helper chat:', chatId);
    router.push(`/helper-chat/${chatId}`);
    closeModal();

  } catch (error) {
    console.error('❌ CHAT ERROR:', error);
    console.error('Error stack:', error.stack);
    
    let errorMsg = 'Failed to start chat. ';
    
    if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
      errorMsg += 'Database table not found. Please run the migration SQL first.';
    } else if (error.message?.includes('permission') || error.code === '42501') {
      errorMsg += 'Permission denied. Please check RLS policies.';
    } else {
      errorMsg += error.message || 'Please try again.';
    }
    
    alert(errorMsg);
  }
};

/* Render stars as a string of filled/empty stars for display */
const renderStars = (rating, max = 5) => {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = max - full - (half ? 1 : 0);
  let s = '★'.repeat(full);
  if (half) s += '☆'; // use a lighter star for half (visually distinguishable)
  s += '☆'.repeat(empty);
  return s;
};

onMounted(async () => {
  // set current user
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    currentUserId.value = sessionData?.session?.user?.id || localStorage.getItem('userId');
  } catch (err) {
    currentUserId.value = localStorage.getItem('userId');
  }
  await fetchHelpers();
});

/* --- Filtering --- */
const filteredHelpers = computed(() => {
  const term = searchTerm.value.toLowerCase().trim();
  const skill = selectedSkill.value;
  let result = helpers.value;

  if (term) {
    result = result.filter(h =>
      (h.name && h.name.toLowerCase().includes(term)) ||
      (h.title && h.title.toLowerCase().includes(term)) ||
      (h.description && h.description.toLowerCase().includes(term))
    );
  }

  if (skill) {
    result = result.filter(h => h.skills.some(s => (s.name || '').toLowerCase().includes(skill.toLowerCase())));
  }

  return result;
});

const clearFilters = () => { searchTerm.value = ''; selectedSkill.value = ''; };

</script>

<template>
  <div class="page-wrapper">
    <div class="container">
      <div class="header-section">
        <h1 class="main-title">Browse Helpers</h1>
        <p class="subtitle">Find skilled helpers ready to assist with your tasks.</p>
      </div>

      <div class="search-card">
        <div class="search-grid">
          <div class="search-group">
            <label class="search-label">Search Helpers</label>
            <input v-model="searchTerm" placeholder="Search by name, title, or description..." class="search-input" />
          </div>
          <div class="search-group">
            <label class="search-label">Filter by Skill</label>
            <select v-model="selectedSkill" class="search-select">
              <option value="">-- Select a skill --</option>
              <option v-for="skill in skillsList" :key="skill" :value="skill">{{ skill }}</option>
            </select>
          </div>
        </div>

        <div v-if="selectedSkill" class="selected-filters">
          <span class="filter-tag">Skill: {{ selectedSkill }} <button @click="selectedSkill = ''" class="remove-filter">✕</button></span>
          <button class="clear-btn" @click="clearFilters">Clear All</button>
        </div>
      </div>

      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading helpers...</p>
      </div>

      <div v-else-if="filteredHelpers.length === 0" class="empty-state">
        <p>No helpers found matching your criteria.</p>
      </div>

      <div v-else class="helpers-grid">
        <div v-for="helper in filteredHelpers" :key="helper.id" class="helper-card">
          <div class="helper-avatar">
            <img v-if="helper.avatarUrl" :src="helper.avatarUrl" :alt="helper.name" class="avatar-img" />
            <div v-else class="avatar-placeholder">{{ helper.name.charAt(0).toUpperCase() }}</div>
          </div>

          <div class="helper-content">
            <div class="helper-header">
              <div>
                <h2 class="helper-name">{{ helper.name }}</h2>
                <p class="helper-title">{{ helper.title }}</p>
              </div>
              <div class="helper-rate">{{ helper.hourlyRate }}</div>
            </div>

            <div class="helper-stats">
              <div class="stat-item">
                <span class="stars-inline" aria-hidden="true" :title="helper.rating + ' / 5'">{{ renderStars(helper.rating) }}</span>
                <span class="rating-text">{{ helper.rating }}</span>
                <span class="separator">•</span>
                <span class="review-count-inline">{{ helper.reviewCount }} reviews</span>
              </div>
              <div class="stat-item">
                <span class="jobs-count">{{ helper.completedJobs }} jobs completed</span>
              </div>
            </div>

            <p class="helper-description">{{ helper.description }}</p>

            <div class="helper-meta">
              <div class="meta-item"><span class="icon">📍</span><span>{{ helper.location }}</span></div>
              <div class="meta-item"><span class="icon">📅</span><span>{{ helper.availability }}</span></div>
            </div>

            <div class="skills-preview">
              <span v-for="skill in helper.skills.slice(0,3)" :key="skill.name + (skill.level || '')" class="skill-badge">
                {{ skill.name }}<span v-if="skill.level"> — {{ skill.level }}</span>
              </span>
              <span v-if="helper.skills.length > 3" class="more-skills">+{{ helper.skills.length - 3 }} more</span>
            </div>

            <button class="view-profile-btn" @click="viewHelperProfile(helper)">View Full Profile</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <button class="close-btn" @click="closeModal">✕</button>
        <div v-if="selectedHelper">
          <div class="modal-header">
            <div class="profile-section">
              <div class="profile-avatar-large">
                <img v-if="selectedHelper.avatarUrl" :src="selectedHelper.avatarUrl" :alt="selectedHelper.name" class="avatar-img-large" />
                <div v-else class="avatar-placeholder-large">{{ selectedHelper.name.charAt(0).toUpperCase() }}</div>
              </div>
              <div>
                <h2 class="modal-name">{{ selectedHelper.name }}</h2>
                <p class="modal-title">{{ selectedHelper.title }}</p>
                <div class="modal-stats">
                  <span class="stars">{{ renderStars(selectedHelper.rating) }}</span>
                  <span class="rating-text">{{ selectedHelper.rating }}</span>
                  <span class="separator">•</span>
                  <span>{{ selectedHelper.reviewCount }} reviews</span>
                  <span class="separator">•</span>
                  <span>{{ selectedHelper.completedJobs }} jobs</span>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-quick-info">
            <div class="info-item"><span class="icon">📍</span><div><div class="info-label">Location</div><div class="info-value">{{ selectedHelper.location }}</div></div></div>
            <div class="info-item"><span class="icon">📅</span><div><div class="info-label">Availability</div><div class="info-value">{{ selectedHelper.availability }}</div></div></div>
            <div class="info-item"><span class="icon">⏱️</span><div><div class="info-label">Response Time</div><div class="info-value">{{ selectedHelper.responseTime }}</div></div></div>
          </div>

          <div class="modal-section"><h3 class="section-title">About</h3><p class="section-text">{{ selectedHelper.bio }}</p></div>

          <div class="modal-section">
            <h3 class="section-title">Skills & Expertise</h3>
            <div class="skills-list">
              <span v-for="(skill, idx) in selectedHelper.skills" :key="skill.name + String(idx)" class="skill-tag">
                <strong>{{ skill.name }}</strong><small v-if="skill.level"> — {{ skill.level }}</small>
                <div v-if="skill.jobs != null" class="skill-meta">({{ skill.jobs }} jobs)</div>
              </span>
            </div>
          </div>

          <div class="modal-section">
            <h3 class="section-title">Experience & Qualifications</h3>
            <ul class="experience-list">
              <li v-for="(exp, index) in selectedHelper.experience" :key="index">{{ exp }}</li>
            </ul>
          </div>

          <div class="modal-section">
            <h3 class="section-title">Reviews ({{ selectedHelper.reviewCount }})</h3>
            <!-- Only show review form when selectedHelper.canLeaveReview === true -->
            <Reviews 
              :helperId="selectedHelper.userId" 
              :showForm="selectedHelper.canLeaveReview" 
              :isHelperReviewing="isCurrentUserTheHelper"
              :key="selectedHelper.userId" 
            />
            <div v-if="!selectedHelper.canLeaveReview && !selectedHelper.hasReviewed" class="review-note">
              <small>You can only leave a review after you've completed a job with this helper.</small>
            </div>
            <div v-else-if="selectedHelper.hasReviewed" class="review-note">
              <small>You've already left a review for this helper.</small>
            </div>
          </div>

          <button class="chat-btn" @click="startChat">💬 Start Chat</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* keep your existing styles and add a few for the stars/snippet */
.snippet-top { display:flex; gap:0.5rem; align-items:center; margin-bottom:0.25rem; }
.snippet-avatar { width:32px; height:32px; border-radius:50%; object-fit:cover; }
.snippet-meta { display:flex; flex-direction:column; }
.snippet-stars { color:#f59e0b; font-weight:700; font-size:0.95rem; line-height:1; }
.stars-inline { color:#f59e0b; font-weight:700; margin-right:0.5rem; }
.rating-text { font-weight:700; margin-left:0.35rem; }
.snippet-comment { margin:0; font-style:italic; color:#374151; }
.review-count-inline { color:#6b7280; margin-left:0.35rem; }
.review-note {
  margin-top: 0.5rem;
  color: #6b7280;
  font-size: 0.9rem;
}

.snippet-top { display:flex; gap:0.5rem; align-items:center; margin-bottom:0.25rem; }
.snippet-avatar { width:32px; height:32px; border-radius:50%; object-fit:cover; }
.snippet-meta { display:flex; flex-direction:column; }
.snippet-stars { color:#f59e0b; font-weight:700; font-size:0.95rem; line-height:1; }
.stars-inline { color:#f59e0b; font-weight:700; margin-right:0.5rem; }
.rating-text { font-weight:700; margin-left:0.35rem; }
.snippet-comment { margin:0; font-style:italic; color:#374151; }
.review-count-inline { color:#6b7280; margin-left:0.35rem; }

.review-snippet {
  margin: 0.75rem 0;
  padding: 0.75rem;
  background: #fff8f0;
  border: 1px solid #fde3c6;
  border-radius: 0.5rem;
  color: #4b5563;
}

.snippet-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  margin-bottom: 0.375rem;
}

.snippet-stars {
  font-size: 0.95rem;
  color: #f59e0b;
}

.snippet-rating {
  font-weight: 700;
  color: #374151;
}

.snippet-author {
  color: #6b7280;
  font-size: 0.875rem;
}

.snippet-comment {
  margin: 0;
  font-style: italic;
  color: #374151;
}

/* small helper to show review count inline */
.review-count-inline {
  color: #6b7280;
  font-weight: 500;
}

/* (Styles are the same as before - kept for continuity and to avoid styling regressions) */
* {
  box-sizing: border-box;
}

.page-wrapper {
  min-height: 100vh;
  background: linear-gradient(to bottom, #f8f9fa 0%, #e9ecef 100%);
  padding: 2rem 1rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

/* Header */
.header-section {
  text-align: center;
  margin-bottom: 3rem;
}

.main-title {
  font-size: 3.5rem;
  font-weight: 700;
  color: #6C5B7F;
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: 1.25rem;
  color: #6b7280;
  margin: 0;
}

/* Search Card */
.search-card {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  margin-bottom: 2rem;
}

.search-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .search-grid {
    grid-template-columns: 1fr;
  }
}

.search-group {
  display: flex;
  flex-direction: column;
}

.search-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.search-input,
.search-select {
  padding: 0.875rem 1rem;
  font-size: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  transition: all 0.2s;
  background: white;
}

.search-input:focus,
.search-select:focus {
  outline: none;
  border-color: #6C5B7F;
  box-shadow: 0 0 0 3px rgba(108, 91, 127, 0.1);
}

.search-input::placeholder {
  color: #9ca3af;
}

/* Selected Filters */
.selected-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #E8E3ED;
  color: #4A3F5C;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid #C7BDD6;
}

.remove-filter {
  background: none;
  border: none;
  color: #4A3F5C;
  cursor: pointer;
  font-size: 1.125rem;
  line-height: 1;
  padding: 0;
  margin-left: 0.25rem;
  transition: all 0.2s;
}

.remove-filter:hover {
  transform: scale(1.2);
  color: #6C5B7F;
}

.clear-btn {
  padding: 0.5rem 1rem;
  background: transparent;
  color: #dc2626;
  border: none;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  color: #991b1b;
  text-decoration: underline;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
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

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #6b7280;
  font-size: 1.125rem;
}

/* Helpers Grid */
.helpers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .helpers-grid {
    grid-template-columns: 1fr;
  }
}

/* Helper Card */
.helper-card {
  background: white;
  border-radius: 1rem;
  padding: 1.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #f3f4f6;
  display: flex;
  gap: 1rem;
}

.helper-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.helper-avatar {
  width: 4.5rem;
  height: 4.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  border-radius: 0.75rem;
  flex-shrink: 0;
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 2rem;
  font-weight: 600;
  color: #6b7280;
}

.helper-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.helper-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
  gap: 1rem;
}

.helper-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.25rem 0;
  line-height: 1.3;
}

.helper-title {
  font-size: 0.95rem;
  color: #6b7280;
  margin: 0;
  font-weight: 500;
}

.helper-stats {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
}

.stars {
  font-size: 1rem;
  line-height: 1;
}

.rating-text {
  font-weight: 600;
  color: #374151;
}

.jobs-count {
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

.modal-name {
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.25rem 0;
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