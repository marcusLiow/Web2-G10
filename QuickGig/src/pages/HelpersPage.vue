<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
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
const isHeroCollapsed = ref(false);

// track current user
const currentUserId = ref(null);

// Handle scroll to collapse hero
const handleScroll = () => {
  const scrollPosition = window.scrollY;
  isHeroCollapsed.value = scrollPosition > 100; // Collapse after scrolling 100px
};

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
  'Ruby': 5,
  'Emerald': 4,
  'Diamond': 3,
  'Gold': 2,
  'Silver': 1,
  '': 0,
  null: 0
};

// Get tier image path
function getTierImage(tier) {
  if (!tier) return null;
  const tierLower = tier.toLowerCase();
  // You should have these images in your assets folder
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
          tier: profile.helper_tier || 'Silver',
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
  
  // Add scroll listener
  window.addEventListener('scroll', handleScroll);
});

// Cleanup scroll listener
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<template>
  <div class="page-wrapper">
    <!-- Hero Image Section -->
    <div class="hero-section" :class="{ 'collapsed': isHeroCollapsed }">
      <div class="hero-image-container">
        <!-- Replace 'your-image.jpg' with your actual image filename from src/assets -->
        <img src="@/assets/helpers.png" alt="Find Helpers" class="hero-image" />
        <div class="hero-overlay">
          <h1 class="hero-title">Find Your Perfect Helper</h1>
          <p class="hero-subtitle">Skilled professionals ready to help with your projects</p>
        </div>
      </div>
    </div>

    <!-- Search and Filter Card -->
    <div class="search-card">
      <div class="search-grid">
        <div class="search-group">
          <label class="search-label">Search Helpers</label>
          <input 
            v-model="searchTerm" 
            type="text" 
            placeholder="Search by name, title, or description..." 
            class="search-input"
          />
        </div>

        <div class="search-group">
          <label class="search-label">Filter by Skill</label>
          <select v-model="selectedSkill" class="search-select">
            <option value="">-- Select a skill --</option>
            <option v-for="skill in skillsList" :key="skill" :value="skill">{{ skill }}</option>
          </select>
        </div>

        <div class="search-group">
          <label class="search-label">Sort By</label>
          <select v-model="sortBy" class="search-select">
            <option value="rating">Rating (Highest First)</option>
            <option value="tier">Tier (Highest First)</option>
            <option value="jobs">Jobs Completed</option>
          </select>
        </div>
      </div>

      <div v-if="selectedSkill" class="selected-filters">
        <span class="filter-tag">
          Skill: {{ selectedSkill }} 
          <button @click="selectedSkill = ''" class="remove-filter">✕</button>
        </span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading helpers...</p>
    </div>

    <!-- No Results -->
    <div v-else-if="filteredHelpers.length === 0" class="empty-state">
      <p>No helpers found matching your criteria.</p>
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
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.page-wrapper {
  min-height: 100vh;
  background: linear-gradient(to bottom, #f8f9fa 0%, #e9ecef 100%);
  padding: 0 0 2rem 0;
}

/* Hero Section */
.hero-section {
  width: 100%;
  height: 400px;
  overflow: hidden;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.hero-section.collapsed {
  height: 0;
  opacity: 0;
  margin-bottom: 0;
}

.hero-image-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.3));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  text-align: center;
  padding: 2rem;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.hero-subtitle {
  font-size: 1.5rem;
  font-weight: 400;
  margin: 0;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
  max-width: 600px;
}

@media (max-width: 768px) {
  .hero-section {
    height: 300px;
  }
  
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-subtitle {
    font-size: 1.125rem;
  }
}

/* Header */
.header-section {
  text-align: center;
  margin-bottom: 2rem;
  padding: 2rem 1rem 0;
  transition: padding 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.hero-section.collapsed ~ .header-section {
  padding-top: 2rem;
}

.main-title {
  font-size: 4.5rem;
  font-weight: 400;
  color: #2563eb;
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: 1.5rem;
  font-weight: 300;
  color: #6b7280;
  margin: 0;
}

/* Search Card */
.search-card {
  max-width: 1200px;
  margin: 2rem auto 2rem;
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Add horizontal padding to content below hero */
.search-card,
.loading-state,
.empty-state,
.helpers-grid {
  padding-left: 1rem;
  padding-right: 1rem;
}

.search-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
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
  font-size: 1.1rem;
  font-weight: 400;
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
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
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
  background: #dbeafe;
  color: #1e40af;
  border-radius: 9999px;
  font-size: 1rem;
  font-weight: 400;
  border: 1px solid #93c5fd;
}

.remove-filter {
  background: none;
  border: none;
  color: #1e40af;
  cursor: pointer;
  font-size: 1.125rem;
  line-height: 1;
  padding: 0;
  margin-left: 0.25rem;
  transition: all 0.2s;
}

.remove-filter:hover {
  transform: scale(1.2);
  color: #1d4ed8;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #6b7280;
  font-size: 1.25rem;
}

.spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid #e5e7eb;
  border-top-color: #2563eb;
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
  font-size: 1.5rem;
}

/* Helpers Grid */
.helpers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
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
  flex-direction: column;
  position: relative;
  overflow: visible;
}

.helper-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
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
  font-size: 1.5rem;
  font-weight: 400;
  color: #111827;
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
}

.helper-rating {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 1rem;
}

.stars {
  color: #f59e0b;
  font-size: 1rem;
}

.rating-text {
  font-weight: 400;
  color: #374151;
}

.review-count {
  color: #6b7280;
  font-weight: 300;
}

.helper-description {
  color: #6b7280;
  line-height: 1.6;
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 300;
  flex-grow: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.helper-meta {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  color: #374151;
  font-weight: 300;
}

.icon {
  font-size: 1.125rem;
}

.skills-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.skill-badge {
  display: inline-block;
  padding: 0.5rem 0.75rem;
  background: #E8E3ED;
  color: #4A3F5C;
  border-radius: 0.375rem;
  font-size: 1rem;
  font-weight: 400;
  border: 1px solid #C7BDD6;
}

.more-skills {
  display: inline-block;
  padding: 0.5rem 0.75rem;
  color: #6b7280;
  font-size: 1rem;
  font-weight: 300;
}

.view-profile-btn {
  width: 100%;
  padding: 0.875rem;
  background: #1f2937;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 1.125rem;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s;
}

.view-profile-btn:hover {
  background: #111827;
  transform: translateY(-1px);
}
</style>