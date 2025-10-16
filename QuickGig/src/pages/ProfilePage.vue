<template>
  <div class="profile-page">
    
    <main class="container">
      <!-- Profile Header -->
      <div class="profile-header">
        <div class="profile-content">
          <div class="avatar-container">
            <img v-if="user.avatar_url" :src="user.avatar_url" :alt="user.username" class="avatar" />
            <div v-else class="avatar-placeholder">{{ user.username ? user.username.charAt(0).toUpperCase() : '👤' }}</div>
          </div>
          
          <div class="profile-info">
            <div class="profile-top">
              <div>
                <h1 class="profile-name">{{ user.username || 'Your Name' }}</h1>
                <div class="contact-info">
                  <div v-if="user.location" class="contact-item">
                    <span>📍</span> {{ user.location }}
                  </div>
                  <div v-if="user.email" class="contact-item">
                    <span>✉️</span> {{ user.email }}
                  </div>
                  <div v-if="user.phone" class="contact-item">
                    <span>📞</span> {{ user.phone }}
                  </div>
                </div>
                <div v-if="user.reviewCount > 0" class="rating-container">
                  <div class="stars">
                    <span v-for="star in 5" :key="star" :class="star <= user.rating ? 'star-filled' : 'star-empty'">★</span>
                  </div>
                  <span class="rating-number">{{ user.rating }}</span>
                  <span class="review-count">({{ user.reviewCount }} reviews)</span>
                </div>
              </div>
              
              <button @click="openEditModal" class="btn-edit">
                <span>✏️</span> Edit Profile
              </button>
            </div>
            
            <p v-if="user.bio" class="bio">{{ user.bio }}</p>
            <p v-else class="bio-placeholder">Add a bio to tell people about yourself...</p>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">💼</div>
            <div>
              <p class="stat-number">{{ user.stats.jobsCompleted }}</p>
              <p class="stat-label">Jobs Completed</p>
            </div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">💰</div>
            <div>
              <p class="stat-number">${{ user.stats.earnings.toLocaleString() }}</p>
              <p class="stat-label">Total Earnings</p>
            </div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">🏆</div>
            <div>
              <p class="stat-number">{{ user.rating.toFixed(1) }}</p>
              <p class="stat-label">Average Rating</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs Section -->
      <div class="tabs-section">
        <div class="tabs-header">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            @click="activeTab = tab.value"
            :class="['tab-button', { active: activeTab === tab.value }]"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- About Tab -->
        <div v-if="activeTab === 'about'" class="tab-content">
          <div class="content-header">
            <h2>About Me</h2>
          </div>
          <div class="content-body">
            <p v-if="user.bio" class="text-normal">{{ user.bio }}</p>
            <p v-else class="text-placeholder">No bio added yet. Click "Edit Profile" to add one.</p>
            <div class="info-list">
              <p><span class="label">Member since:</span> {{ formatDate(user.created_at) }}</p>
              <p><span class="label">Response rate:</span> 98%</p>
              <p><span class="label">Response time:</span> Within 1 hour</p>
            </div>
            
            <!-- Logout Button in About Tab -->
            <div class="logout-container">
              <button @click="handleLogout" class="btn-logout-inline">
                Logout
              </button>
            </div>
          </div>
        </div>

        <!-- Skills Tab -->
        <div v-if="activeTab === 'skills'" class="tab-content">
          <div class="content-header">
            <h2>Skills & Expertise</h2>
            <p class="subtitle">Services I offer to the community</p>
          </div>
          <div class="content-body">
            <div v-if="user.skills.length > 0" class="skills-list">
              <div v-for="(skill, index) in user.skills" :key="index" class="skill-card">
                <div class="skill-header">
                  <h3>{{ skill.name }}</h3>
                  <span :class="['badge', getBadgeClass(skill.level)]">{{ skill.level }}</span>
                </div>
                <p class="skill-jobs">{{ skill.jobs }} jobs completed</p>
              </div>
            </div>
            <p v-else class="text-placeholder">No skills added yet.</p>
          </div>
        </div>

        <!-- Reviews Tab -->
        <div v-if="activeTab === 'reviews'" class="tab-content">
          <div class="content-header">
            <h2>Customer Reviews</h2>
            <p class="subtitle">{{ user.reviewCount }} total reviews</p>
          </div>
          <div class="content-body">
            <div v-if="user.reviews.length > 0" class="reviews-list">
              <div v-for="review in user.reviews" :key="review.id" class="review-card">
                <div class="review-content">
                  <div class="review-avatar">
                    <img v-if="review.avatar" :src="review.avatar" :alt="review.author" />
                    <div v-else class="avatar-placeholder-small">👤</div>
                  </div>
                  <div class="review-body">
                    <div class="review-header">
                      <div>
                        <p class="review-author">{{ review.author }}</p>
                        <p class="review-date">{{ review.date }}</p>
                      </div>
                      <div class="stars">
                        <span v-for="star in 5" :key="star" :class="star <= review.rating ? 'star-filled' : 'star-empty'">★</span>
                      </div>
                    </div>
                    <span class="service-badge">{{ review.service }}</span>
                    <p class="review-text">{{ review.comment }}</p>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <div class="empty-icon">⭐</div>
              <p class="empty-title">No reviews yet</p>
              <p class="empty-text">Reviews will appear here when customers rate your service</p>
            </div>
          </div>
        </div>

        <!-- Jobs Tab -->
        <div v-if="activeTab === 'jobs'" class="tab-content">
          <div class="content-header">
            <h2>Job History</h2>
            <p class="subtitle">Recent completed jobs</p>
          </div>
          <div class="content-body">
            <div v-if="user.recentJobs.length > 0" class="jobs-list">
              <div v-for="job in user.recentJobs" :key="job.id" class="job-card">
                <div>
                  <h3>{{ job.title }}</h3>
                  <p class="job-client">Client: {{ job.client }}</p>
                  <p class="job-date">{{ job.date }}</p>
                </div>
                <div class="job-right">
                  <p class="job-amount">${{ job.amount }}</p>
                  <span class="status-badge">{{ job.status }}</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <div class="empty-icon">💼</div>
              <p class="empty-title">No jobs yet</p>
              <p class="empty-text">Your completed jobs will appear here</p>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Edit Profile Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click="closeEditModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Edit Profile</h2>
          <button @click="closeEditModal" class="close-btn">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>Profile Photo URL</label>
            <input v-model="editForm.avatar_url" type="text" placeholder="https://example.com/photo.jpg" />
            <p class="hint">Enter a URL to your profile photo</p>
          </div>

          <div class="form-group">
            <label>Username *</label>
            <input 
              v-model="editForm.username" 
              type="text" 
              placeholder="Your username"
              :class="{ 'input-error': errors.username }"
            />
            <p v-if="errors.username" class="error-message">{{ errors.username }}</p>
          </div>

          <div class="form-group">
            <label>Location</label>
            <input v-model="editForm.location" type="text" placeholder="City, Country" />
          </div>

          <div class="form-group">
            <label>Email *</label>
            <input 
              v-model="editForm.email" 
              type="email" 
              placeholder="your.email@example.com"
              disabled
            />
            <p class="hint">Email cannot be changed</p>
          </div>

          <div class="form-group">
            <label>Phone</label>
            <input v-model="editForm.phone" type="tel" placeholder="+65 1234 5678" />
          </div>

          <div class="form-group">
            <label>Bio</label>
            <textarea v-model="editForm.bio" rows="4" placeholder="Tell people about yourself and your skills..."></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeEditModal" class="btn-cancel">Cancel</button>
          <button @click="saveProfile" class="btn-save">Save Changes</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { supabase } from '../supabase/config';
import { useRouter } from 'vue-router';

const router = useRouter();
const activeTab = ref('about');
const showEditModal = ref(false);

const tabs = [
  { label: 'About', value: 'about' },
  { label: 'Skills & Expertise', value: 'skills' },
  { label: 'Reviews', value: 'reviews' },
  { label: 'Job History', value: 'jobs' }
];

const user = reactive({
  id: '',
  username: '',
  avatar_url: '',
  rating: 0,
  reviewCount: 0,
  location: '',
  email: '',
  phone: '',
  bio: '',
  created_at: '',
  role: '',
  experienceLevel: '',
  hourlyRate: null,
  stats: {
    jobsCompleted: 0,
    earnings: 0,
    rating: 0,
  },
  skills: [],
  reviews: [],
  recentJobs: [],
});

const editForm = reactive({
  username: '',
  avatar_url: '',
  location: '',
  email: '',
  phone: '',
  bio: '',
});

const errors = reactive({
  username: '',
  email: '',
});

onMounted(async () => {
  await loadUserData();
});


const loadUserData = async () => {
  try {
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      router.push('/login');
      return;
    }

    // Fetch from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    user.id = userData.id;
    user.username = userData.username || '';
    user.email = userData.email || '';
    user.phone = userData.phone || '';
    user.location = userData.location || '';
    user.bio = userData.bio || '';
    user.avatar_url = userData.avatar_url || '';
    user.created_at = userData.created_at || '';

    // Fetch from profiles table for adventurer-specific data
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Only process profile data if found (not all users have profiles)
    if (!profileError && profileData) {
      user.role = profileData.role || '';
      user.experienceLevel = profileData.experience_level || '';
      user.hourlyRate = profileData.hourly_rate || null;
      
      // Transform skills array into the format expected by the UI
      if (profileData.skills && Array.isArray(profileData.skills)) {
        user.skills = profileData.skills.map(skill => {
          // If skill is already an object with name, level, jobs, keep it
          if (typeof skill === 'object' && skill.name) {
            return skill;
          }
          // Otherwise, transform string skill into object format
          return {
            name: skill,
            level: profileData.experience_level || 'Beginner',
            jobs: 0 // Default to 0 jobs completed
          };
        });
      }
    }

  } catch (error) {
    console.error('Error loading user data:', error);
    alert('Failed to load profile data');
  }
};

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long'
  });
};

const openEditModal = () => {
  editForm.username = user.username;
  editForm.avatar_url = user.avatar_url;
  editForm.location = user.location;
  editForm.email = user.email;
  editForm.phone = user.phone;
  editForm.bio = user.bio;
  errors.username = '';
  errors.email = '';
  showEditModal.value = true;
};

const closeEditModal = () => {
  showEditModal.value = false;
};

const saveProfile = async () => {
  errors.username = '';
  
  if (!editForm.username || !editForm.username.trim()) {
    errors.username = 'Username is required';
    return;
  }
  
  try {
    const { error } = await supabase
      .from('users')
      .update({
        username: editForm.username,
        avatar_url: editForm.avatar_url,
        location: editForm.location,
        phone: editForm.phone,
        bio: editForm.bio,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) throw error;

    user.username = editForm.username;
    user.avatar_url = editForm.avatar_url;
    user.location = editForm.location;
    user.phone = editForm.phone;
    user.bio = editForm.bio;

    localStorage.setItem('username', user.username);
    if (user.avatar_url) {
      localStorage.setItem('avatarUrl', user.avatar_url);
    }

    window.dispatchEvent(new Event('user-logged-in'));
    
    closeEditModal();
    alert('Profile updated successfully!');
  } catch (error) {
    console.error('Error saving profile:', error);
    alert('Failed to save profile. Please try again.');
  }
};

const handleLogout = async () => {
  if (!confirm('Are you sure you want to log out?')) {
    return;
  }
  
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('username');
    localStorage.removeItem('avatarUrl');
    
    window.dispatchEvent(new Event('user-logged-out'));
    
    router.push('/');
  } catch (error) {
    console.error('Error logging out:', error);
    alert('Error logging out. Please try again.');
  }
};

const getBadgeClass = (level) => {
  if (!level) return 'beginner';
  const levelLower = level.toLowerCase();
  if (levelLower.includes('expert') || levelLower.includes('advanced')) return 'expert';
  if (levelLower.includes('intermediate')) return 'intermediate';
  return 'beginner';
};
</script>

<style scoped>
/* Keep ALL your original styles here */
.profile-page {
  min-height: 100vh;
  background-color: #fafafa;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.profile-header {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.profile-content {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.avatar-container {
  width: 128px;
  height: 128px;
  border-radius: 50%;
  background: #e5e7eb;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 4rem;
  color: #9ca3af;
}

.profile-info {
  flex: 1;
  min-width: 300px;
}

.profile-top {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.profile-name {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.contact-info {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.75rem;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.rating-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.stars {
  display: flex;
  gap: 0.125rem;
}

.star-filled {
  color: #fbbf24;
  font-size: 1rem;
}

.star-empty {
  color: #d1d5db;
  font-size: 1rem;
}

.rating-number {
  font-weight: 600;
}

.review-count {
  font-size: 0.875rem;
  color: #6b7280;
}

.btn-edit {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.2s;
}

.btn-edit:hover {
  background: #f9fafb;
}

.bio {
  color: #6b7280;
  line-height: 1.6;
}

.bio-placeholder {
  color: #9ca3af;
  font-style: italic;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  padding: 1.5rem;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 0.5rem;
  background: #dbeafe;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: bold;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
}

.tabs-section {
  margin-top: 1.5rem;
}

.tabs-header {
  display: flex;
  gap: 0.5rem;
  background: white;
  border-radius: 0.5rem 0.5rem 0 0;
  border-bottom: 1px solid #e5e7eb;
}

.tab-button {
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  background: transparent;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  color: #6b7280;
  transition: color 0.2s;
}

.tab-button:hover {
  color: #374151;
}

.tab-button.active {
  border-bottom-color: #2563eb;
  color: #2563eb;
}

.tab-content {
  background: white;
  border-radius: 0 0 0.5rem 0.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.content-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.content-header h2 {
  font-size: 1.25rem;
  font-weight: bold;
}

.subtitle {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.content-body {
  padding: 1.5rem;
}

.text-normal {
  color: #6b7280;
  margin-bottom: 1rem;
  line-height: 1.6;
}

.text-placeholder {
  color: #9ca3af;
  font-style: italic;
  margin-bottom: 1rem;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-list p {
  font-size: 0.875rem;
}

.label {
  font-weight: 600;
}

/* Logout Button */
.logout-container {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
  text-align: center;
}

.btn-logout-inline {
  padding: 0.75rem 2rem;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-logout-inline:hover {
  background: #b91c1c;
}

.skills-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.skill-card {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  transition: box-shadow 0.2s;
}

.skill-card:hover {
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.skill-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.skill-header h3 {
  font-weight: 600;
}

.badge {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  border-radius: 9999px;
  font-weight: 500;
}

.badge.expert {
  background: #2563eb;
  color: white;
}

.badge.intermediate {
  background: #e5e7eb;
  color: #374151;
}

.badge.beginner {
  background: white;
  border: 1px solid #d1d5db;
  color: #374151;
}

.skill-jobs {
  font-size: 0.875rem;
  color: #6b7280;
}

.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.review-card {
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.review-card:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.review-content {
  display: flex;
  gap: 1rem;
}

.review-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.review-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder-small {
  color: #9ca3af;
  font-size: 1.5rem;
}

.review-body {
  flex: 1;
}

.review-header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.review-author {
  font-weight: 600;
}

.review-date {
  font-size: 0.875rem;
  color: #6b7280;
}

.service-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  background: #eff6ff;
  color: #2563eb;
  border-radius: 9999px;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.review-text {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;
}

.jobs-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.job-card {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  transition: box-shadow 0.2s;
}

.job-card:hover {
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.job-card h3 {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.job-client,
.job-date {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

.job-right {
  text-align: right;
}

.job-amount {
  font-size: 1.125rem;
  font-weight: bold;
  color: #16a34a;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  background: #dcfce7;
  color: #16a34a;
  border-radius: 9999px;
  margin-top: 0.25rem;
  font-weight: 500;
}

.empty-state {
  text-align: center;
  padding: 3rem 0;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-title {
  color: #6b7280;
  font-size: 1.125rem;
  margin-bottom: 0.5rem;
}

.empty-text {
  color: #9ca3af;
  font-size: 0.875rem;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 0.5rem;
  max-width: 42rem;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: bold;
}

.close-btn {
  background: none;
  border: none;
  color: #6b7280;
  font-size: 2rem;
  cursor: pointer;
  width: 32px;
  height: 32px;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #374151;
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.input-error {
  border-color: #ef4444 !important;
}

.input-error:focus {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
}

.error-message {
  color: #ef4444;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.form-group textarea {
  resize: vertical;
}

.hint {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  position: sticky;
  bottom: 0;
}

.btn-cancel {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  color: #374151;
  background: white;
  cursor: pointer;
}

.btn-cancel:hover {
  background: #f9fafb;
}

.btn-save {
  padding: 0.5rem 1rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
}

.btn-save:hover {
  background: #1d4ed8;
}

@media (max-width: 768px) {
  .profile-content {
    flex-direction: column;
  }
  
  .profile-top {
    flex-direction: column;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .tabs-header {
    overflow-x: auto;
  }
  
  .job-card {
    flex-direction: column;
    align-items: start;
  }
  
  .job-right {
    text-align: left;
  }
}
</style>