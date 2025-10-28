<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '../supabase/config';
import Reviews from './Reviews.vue';

const route = useRoute();
const router = useRouter();

const helper = ref(null);
const isLoading = ref(true);
const currentUserId = ref(null);

// Parse skill object
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

function renderStars(rating) {
  const fullStars = Math.floor(rating);
  let stars = '';
  for (let i = 0; i < fullStars; i++) stars += '★';
  for (let i = fullStars; i < 5; i++) stars += '☆';
  return stars;
}

// Fetch helper profile data
const fetchHelperProfile = async (userId) => {
  try {
    isLoading.value = true;

    // Fetch user data
    const { data: userData, error: userError } = await supabase
      .from('public_helpers')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) throw userError;
    if (!userData) {
      router.push('/helpers');
      return;
    }

    // Fetch helper stats
    const { data: statsData, error: statsError } = await supabase.rpc('get_helper_stats_for', { helper_uuid: userId });
    if (statsError) console.warn('get_helper_stats_for error', statsError);
    const stats = (Array.isArray(statsData) ? statsData[0] : statsData) || { avg_rating: 0, review_count: 0, completed_jobs: 0 };

    // Fetch helper profile
    const { data: profileData, error: profileError } = await supabase
      .from('helper_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (profileError) console.warn('helper_profiles fetch error', profileError);

    const profile = profileData || null;
    const rawSkills = (profile && profile.skills) || userData.skills || [];

    helper.value = {
      id: userData.id,
      userId: userData.id,
      name: userData.username || 'Anonymous',
      username: userData.username || 'Anonymous',
      avatarUrl: userData.avatar_url || '',
      title: (profile && profile.title) || userData.helper_title || 'Helper',
      description: (profile && profile.description) || userData.helper_bio || 'Available to help with various tasks',
      skills: normalizeSkills(rawSkills),
      location: userData.location || 'Not specified',
      availability: (profile && profile.availability) || 'Contact for availability',
      responseTime: (profile && profile.response_time) || 'Usually responds within 24 hours',
      rating: Math.round(Number(stats.avg_rating) * 10) / 10 || 0,
      reviewCount: Number(stats.review_count) || 0,
      completedJobs: Number(stats.completed_jobs) || 0,
      bio: (profile && profile.bio) || userData.helper_bio || '',
      experience: (profile && profile.experience) || ['Contact for details']
    };

  } catch (err) {
    console.error('fetchHelperProfile error:', err);
    router.push('/helpers');
  } finally {
    isLoading.value = false;
  }
};

// Start chat with helper
const startChat = async () => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const curUserId = sessionData?.session?.user?.id || localStorage.getItem('userId');
    
    if (!curUserId) {
      alert('Please log in to start a chat');
      router.push('/login');
      return;
    }

    const helperId = helper.value.userId;
    
    if (curUserId === helperId) {
      alert('You cannot chat with yourself');
      return;
    }

    // Check if chat already exists
    const { data: existingChat, error: searchError } = await supabase
      .from('helper_chats')
      .select('id')
      .eq('helper_id', helperId)
      .eq('client_id', curUserId)
      .maybeSingle();

    if (searchError && searchError.code !== 'PGRST116') {
      throw searchError;
    }

    let chatId;

    if (existingChat) {
      chatId = existingChat.id;
    } else {
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

      if (createError) {
        alert('Failed to create chat. Please try again.');
        return;
      }

      chatId = newChat.id;
    }

    router.push(`/helper-chats?chatId=${chatId}`);

  } catch (err) {
    console.error('Error in startChat:', err);
    alert('An error occurred. Please try again.');
  }
};

const goBack = () => {
  router.back();
};

onMounted(async () => {
  const { data } = await supabase.auth.getSession();
  currentUserId.value = data?.session?.user?.id || localStorage.getItem('userId');
  
  const userId = route.params.userId;
  if (userId) {
    await fetchHelperProfile(userId);
  } else {
    router.push('/helpers');
  }
});
</script>

<template>
  <div class="page-wrapper">
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>Loading profile...</p>
    </div>

    <!-- Profile Content -->
    <div v-else-if="helper" class="container">
      <!-- Back Button -->
      <button @click="goBack" class="back-button">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        Back
      </button>

      <div class="profile-card">
        <!-- Profile Header -->
        <div class="profile-header">
          <div class="profile-avatar-large">
            <img v-if="helper.avatarUrl" :src="helper.avatarUrl" :alt="helper.name" class="avatar-img-large" />
            <div v-else class="avatar-placeholder-large">{{ helper.name.charAt(0).toUpperCase() }}</div>
          </div>
          <div class="profile-info">
            <h1 class="profile-name">{{ helper.name }}</h1>
            <p class="profile-title">{{ helper.title }}</p>
            <div class="profile-stats">
              <span class="stars">{{ renderStars(helper.rating) }}</span>
              <span class="rating-text">{{ helper.rating }}</span>
              <span class="separator">•</span>
              <span>{{ helper.reviewCount }} reviews</span>
              <span class="separator">•</span>
              <span>{{ helper.completedJobs }} jobs</span>
            </div>
          </div>
        </div>

        <!-- Quick Info -->
        <div class="quick-info">
          <div class="info-item">
            <span class="icon">📍</span>
            <div>
              <div class="info-label">Location</div>
              <div class="info-value">{{ helper.location }}</div>
            </div>
          </div>
          <div class="info-item">
            <span class="icon">📅</span>
            <div>
              <div class="info-label">Availability</div>
              <div class="info-value">{{ helper.availability }}</div>
            </div>
          </div>
          <div class="info-item">
            <span class="icon">⏱️</span>
            <div>
              <div class="info-label">Response Time</div>
              <div class="info-value">{{ helper.responseTime }}</div>
            </div>
          </div>
        </div>

        <!-- About Section -->
        <div class="section">
          <h3 class="section-title">About</h3>
          <p class="section-text">{{ helper.bio }}</p>
        </div>

        <!-- Skills Section -->
        <div class="section">
          <h3 class="section-title">Skills & Expertise</h3>
          <div class="skills-list">
            <span v-for="(skill, idx) in helper.skills" :key="skill.name + String(idx)" class="skill-tag">
              <strong>{{ skill.name }}</strong>
              <small v-if="skill.level"> — {{ skill.level }}</small>
              <div v-if="skill.jobs != null" class="skill-meta">({{ skill.jobs }} jobs)</div>
            </span>
          </div>
        </div>

        <!-- Experience Section -->
        <div class="section">
          <h3 class="section-title">Experience & Qualifications</h3>
          <ul class="experience-list">
            <li v-for="(exp, idx) in helper.experience" :key="idx">{{ exp }}</li>
          </ul>
        </div>

        <!-- Reviews Section -->
        <Reviews :helperId="helper.userId" />

        <!-- Chat Button -->
        <button 
          v-if="currentUserId !== helper.userId" 
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

.container {
  max-width: 900px;
  margin: 0 auto;
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

.profile-card {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.profile-header {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #e5e7eb;
}

.profile-avatar-large {
  width: 6rem;
  height: 6rem;
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

.profile-info {
  flex: 1;
}

.profile-name {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem 0;
}

.profile-title {
  font-size: 1.25rem;
  color: #6b7280;
  margin: 0 0 0.75rem 0;
  font-weight: 500;
}

.profile-stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  color: #374151;
}

.stars {
  color: #f59e0b;
  font-size: 1.125rem;
}

.rating-text {
  font-weight: 700;
  color: #374151;
}

.separator {
  color: #d1d5db;
}

.quick-info {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 0.75rem;
}

@media (max-width: 640px) {
  .quick-info {
    grid-template-columns: 1fr;
  }
  
  .profile-header {
    flex-direction: column;
    text-align: center;
  }
}

.info-item {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.icon {
  font-size: 1.25rem;
}

.info-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.info-value {
  font-size: 1rem;
  color: #111827;
  font-weight: 600;
}

.section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.25rem;
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