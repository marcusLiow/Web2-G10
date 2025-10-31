<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '../supabase/config';
import Reviews from './Reviews.vue';

const router = useRouter();

const helpers = ref([]);
const searchTerm = ref('');
const selectedSkill = ref('');
const sortBy = ref('rating'); // 'tier', 'rating', 'jobs'
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

// Tier order for sorting (highest to lowest)
const tierOrder = {
  'Diamond': 4,
  'Sapphire': 3,
  'Ruby': 2,
  'Emerald': 1,
  '': 0,
  null: 0
};

// Get tier image path
function getTierImage(tier) {
  if (!tier) return null;
  const tierLower = tier.toLowerCase();
  return `/src/assets/${tierLower}.png`;
}

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

    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('is_helper', true);

    if (usersError) throw usersError;
    if (!usersData || usersData.length === 0) { helpers.value = []; isLoading.value = false; return; }

    const userIds = usersData.map(u => u.id);

    const { data: statsData, error: statsError } = await supabase.rpc('get_helper_stats');
    if (statsError) console.warn('get_helper_stats error', statsError);
    const statsMap = {};
    if (Array.isArray(statsData)) statsData.forEach(s => { statsMap[String(s.helper_id)] = s; });

    const { data: profiles, error: profilesError } = await supabase
      .from('helper_profiles')
      .select('*')
      .in('user_id', userIds)
      .eq('is_active', true);
    if (profilesError) console.warn('helper_profiles fetch error', profilesError);
    const profilesMap = {};
    (profiles || []).forEach(p => { profilesMap[String(p.user_id)] = p; });

    const { data: reviewsData, error: reviewsError } = await supabase
      .from('reviews')
      .select('helper_id, rating, comment, created_at, reviewer_id')
      .in('helper_id', userIds)
      .order('created_at', { ascending: false });
    
    if (reviewsError) console.warn('reviews fetch error', reviewsError);
    
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

    const merged = usersData
      .filter(user => profilesMap[user.id])
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
          completedJobs: profile.jobs_completed || 0,
          bio: profile.bio || user.helper_bio || user.bio || '',
          experience: profile.experience || ['Contact for details'],
          latestReview: latestReviewMap[user.id] || null,
          canLeaveReview: false,
          hasReviewed: false,
          tier: profile.helper_tier || 'Emerald',
          tierXP: profile.helper_xp || 0
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

// Navigate directly to helper profile page
const viewHelperProfile = (helper) => {
  router.push(`/helper/${helper.userId}`);
};

const filteredHelpers = computed(() => {
  let result = helpers.value;
  if (searchTerm.value.trim()) {
    const term = searchTerm.value.toLowerCase();
    result = result.filter(h => {
      const nameMatch = h.name.toLowerCase().includes(term);
      const titleMatch = h.title.toLowerCase().includes(term);
      const descMatch = h.description.toLowerCase().includes(term);
      return nameMatch || titleMatch || descMatch;
    });
  }
  if (selectedSkill.value) {
    result = result.filter(h => {
      return h.skills.some(sk => sk.name.toLowerCase() === selectedSkill.value.toLowerCase());
    });
  }
  
  // Apply sorting
  if (sortBy.value === 'tier') {
    result = [...result].sort((a, b) => {
      const tierA = tierOrder[a.tier] || 0;
      const tierB = tierOrder[b.tier] || 0;
      if (tierB !== tierA) return tierB - tierA; // Higher tier first
      return b.tierXP - a.tierXP; // If same tier, sort by XP
    });
  } else if (sortBy.value === 'rating') {
    result = [...result].sort((a, b) => b.rating - a.rating);
  } else if (sortBy.value === 'jobs') {
    result = [...result].sort((a, b) => b.completedJobs - a.completedJobs);
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

      <div class="sort-filter">
        <label for="sort-select" class="filter-label">Sort by:</label>
        <select v-model="sortBy" id="sort-select" class="select-input">
          <option value="rating">Rating (Highest First)</option>
          <option value="tier">Tier (Highest First)</option>
          <option value="jobs">Jobs Completed</option>
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
        <!-- Tier Badge (Top Right Corner) -->
        <div v-if="helper.tier" class="tier-badge-corner">
          <img :src="getTierImage(helper.tier)" :alt="helper.tier" class="tier-badge-img" :title="helper.tier" />
        </div>

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

        <!-- View Profile Button - Now goes directly to full profile -->
        <button @click="viewHelperProfile(helper)" class="view-profile-btn">
          View Profile
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

.sort-filter {
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
  position: relative;
  overflow: visible;
}

.helper-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
}

/* Tier Badge in Top Right Corner */
.tier-badge-corner {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 48px;
  height: 48px;
  z-index: 10;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
  transition: transform 0.2s;
}

.helper-card:hover .tier-badge-corner {
  transform: scale(1.1);
}

.tier-badge-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
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
</style>