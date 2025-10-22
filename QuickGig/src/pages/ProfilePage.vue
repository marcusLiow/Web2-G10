<template>
  <div class="profile-page">
    <main class="container">
      <!-- Show loading state while data loads -->
      <div v-if="isLoading" class="loading-container">
        <div class="spinner"></div>
        <p>Loading profile...</p>
      </div>

      <!-- Only show profile once data is loaded -->
      <template v-else>
        <!-- Profile Header -->
        <div class="profile-header">
          <div class="profile-content">
            <div class="avatar-container">
              <img v-if="user.avatar_url" :src="user.avatar_url" :alt="user.username" class="avatar" />
              <div v-else class="avatar-placeholder">{{ user.username.charAt(0).toUpperCase() }}</div>
            </div>
            
            <div class="profile-info">
              <div class="profile-top">
                <div>
                  <h1 class="profile-name">{{ user.username }}</h1>
                  <div class="contact-info">
                    <div v-if="user.location" class="contact-item">
                      <span class="contact-label">Location:</span> {{ user.location }}
                    </div>
                    <div v-if="user.email" class="contact-item">
                      <span class="contact-label">Email:</span> {{ user.email }}
                    </div>
                    <div v-if="user.phone" class="contact-item">
                      <span class="contact-label">Phone:</span> {{ user.phone }}
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
                  Edit Profile
                </button>
              </div>
              
              <p v-if="user.bio" class="bio">{{ user.bio }}</p>
              <p v-else class="bio-placeholder">Add a bio to tell people about yourself...</p>
            </div>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card stat-card-jobs">
            <div class="stat-content">
              <div>
                <p class="stat-number">{{ user.stats.jobsCompleted }}</p>
                <p class="stat-label">Jobs Completed</p>
              </div>
            </div>
          </div>
          
          <div class="stat-card stat-card-earnings">
            <div class="stat-content">
              <div>
                <p class="stat-number">${{ user.stats.earnings.toLocaleString() }}</p>
                <p class="stat-label">Total Earnings</p>
              </div>
            </div>
          </div>
          
          <div class="stat-card stat-card-rating">
            <div class="stat-content">
              <div>
                <p class="stat-number">{{ user.rating.toFixed(1) }}</p>
                <p class="stat-label">Average Rating</p>
              </div>
            </div>
          </div>
          
          <div class="stat-card stat-card-listings">
            <div class="stat-content">
              <div>
                <p class="stat-number">{{ userListings.length }}</p>
                <p class="stat-label">Active Listings</p>
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
            <div class="content-body">
              <h2 class="content-title">About Me</h2>
              
              <p v-if="user.bio" class="text-normal">{{ user.bio }}</p>
              <p v-else class="text-placeholder">No bio added yet. Click "Edit Profile" to add one.</p>
              
              <div v-if="user.created_at" class="info-list-section">
                <div class="info-list">
                  <p><span class="label">Member since:</span> {{ formatDate(user.created_at) }}</p>
                </div>
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
                      <div v-else class="avatar-placeholder-small">{{ review.author.charAt(0).toUpperCase() }}</div>
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
                <div class="empty-icon-text">No Reviews</div>
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
                <div class="empty-icon-text">No Jobs</div>
                <p class="empty-title">No jobs yet</p>
                <p class="empty-text">Your completed jobs will appear here</p>
              </div>
            </div>
          </div>

          <!-- My Listings Tab -->
          <div v-if="activeTab === 'listings'" class="tab-content">
            <div class="content-header">
              <h2>My Job Listings</h2>
              <p class="subtitle">{{ userListings.length }} total listings</p>
            </div>
            <div class="content-body">
              <div v-if="loadingListings" class="loading-container">
                <div class="spinner"></div>
                <p>Loading listings...</p>
              </div>
              <div v-else-if="userListings.length > 0" class="listings-list">
                <div v-for="listing in userListings" :key="listing.id" class="listing-card">
                  <div class="listing-main">
                    <div class="listing-header-row">
                      <h3>{{ listing.title }}</h3>
                      <span :class="['listing-status-badge', getStatusClass(listing.status)]">
                        {{ listing.status.toUpperCase() }}
                      </span>
                    </div>
                    
                    <p class="listing-description">{{ listing.description }}</p>
                    
                    <div class="listing-details">
                      <div class="listing-detail-item">
                        <span class="detail-label">Location:</span>
                        <span>{{ listing.location }}</span>
                      </div>
                      <div v-if="listing.category" class="listing-detail-item">
                        <span class="detail-label">Category:</span>
                        <span>{{ listing.category }}</span>
                      </div>
                      <div class="listing-detail-item">
                        <span class="detail-label">Posted:</span>
                        <span>{{ formatDateShort(listing.created_at) }}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="listing-footer">
                    <p class="listing-payment">${{ listing.payment }}</p>
                    <div class="listing-actions">
                      <button @click="editListing(listing)" class="btn-action btn-action-edit">
                        Edit
                      </button>
                      <button @click="deleteListing(listing.id)" class="btn-action btn-action-delete">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="empty-state">
                <div class="empty-icon-text">No Listings</div>
                <p class="empty-title">No listings yet</p>
                <p class="empty-text">You haven't created any job listings yet. Start posting to find help!</p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </main>

    <!-- Edit Profile Modal (Keep this one - it's for editing user profile) -->
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
const isLoading = ref(true);
const loadingListings = ref(false);

const tabs = [
  { label: 'About', value: 'about' },
  { label: 'Skills & Expertise', value: 'skills' },
  { label: 'Reviews', value: 'reviews' },
  { label: 'Job History', value: 'jobs' },
  { label: 'My Listings', value: 'listings' }
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

const userListings = ref([]);

onMounted(async () => {
  await loadUserData();
  await loadUserListings();
});

const loadUserData = async () => {
  try {
    isLoading.value = true;
    
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      router.push('/login');
      return;
    }

    console.log('Loading user data for userId:', userId);

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error loading user data:', userError);
      throw userError;
    }

    console.log('User data loaded:', userData);

    user.id = userData.id;
    user.username = userData.username || '';
    user.email = userData.email || '';
    user.phone = userData.phone || '';
    user.location = userData.location || '';
    user.bio = userData.bio || '';
    user.avatar_url = userData.avatar_url || '';
    user.created_at = userData.created_at || '';
    user.role = userData.user_role || '';
    user.experienceLevel = userData.expertise_level || '';
    user.hourlyRate = userData.hourly_rate || null;
    
    if (userData.skills) {
      console.log('Raw skills data:', userData.skills);
      
      let skillsArray = [];
      
      if (Array.isArray(userData.skills)) {
        skillsArray = userData.skills;
      } else if (typeof userData.skills === 'object') {
        skillsArray = Object.values(userData.skills);
      }
      
      console.log('Skills array:', skillsArray);
      
      user.skills = skillsArray.map(skill => {
        if (typeof skill === 'object' && skill.name) {
          return skill;
        }
        return {
          name: typeof skill === 'string' ? skill : String(skill),
          level: userData.expertise_level || 'Beginner',
          jobs: 0
        };
      });
      
      console.log('Transformed skills:', user.skills);
    }

  } catch (error) {
    console.error('Error loading user data:', error);
    alert('Failed to load profile data: ' + (error.message || 'Unknown error'));
  } finally {
    isLoading.value = false;
  }
};

const loadUserListings = async () => {
  try {
    loadingListings.value = true;
    
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      return;
    }

    console.log('Loading listings for userId:', userId);

    const { data: listings, error } = await supabase
      .from('User-Job-Request')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading listings:', error);
      throw error;
    }

    console.log('Listings loaded:', listings);
    userListings.value = listings || [];

  } catch (error) {
    console.error('Error loading listings:', error);
    alert('Failed to load listings: ' + (error.message || 'Unknown error'));
  } finally {
    loadingListings.value = false;
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

const formatDateShort = (dateString) => {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
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

const editListing = (listing) => {
  // Store the listing data in localStorage for the edit page to use
  localStorage.setItem('editingJob', JSON.stringify(listing));
  // Navigate to the edit job page
  router.push(`/edit-job/${listing.id}`);
};

const deleteListing = async (listingId) => {
  if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
    return;
  }

  try {
    const { error } = await supabase
      .from('User-Job-Request')
      .delete()
      .eq('id', listingId);

    if (error) throw error;

    // Reload listings
    await loadUserListings();
    
    alert('Listing deleted successfully!');
  } catch (error) {
    console.error('Error deleting listing:', error);
    alert('Failed to delete listing. Please try again.');
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

const getStatusClass = (status) => {
  const statusLower = status.toLowerCase();
  if (statusLower === 'open') return 'status-open';
  if (statusLower === 'in_progress') return 'status-in-progress';
  if (statusLower === 'completed') return 'status-completed';
  if (statusLower === 'cancelled') return 'status-cancelled';
  return 'status-open';
};
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background-color: #fafafa;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.loading-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  font-size: 1.2rem;
  color: #6b7280;
  gap: 1rem;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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

.contact-label {
  font-weight: 600;
  color: #374151;
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
  transition: background 0.2s;
  font-weight: 500;
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
  border-left: 4px solid transparent;
}

.stat-card-jobs {
  border-left-color: #3b82f6;
  background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
}

.stat-card-earnings {
  border-left-color: #10b981;
  background: linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%);
}

.stat-card-rating {
  border-left-color: #f59e0b;
  background: linear-gradient(135deg, #ffffff 0%, #fffbeb 100%);
}

.stat-card-listings {
  border-left-color: #8b5cf6;
  background: linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%);
}

.stat-content {
  display: flex;
  align-items: center;
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.25rem;
  color: #111827;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
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
  overflow-x: auto;
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
  white-space: nowrap;
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

.content-title {
  font-size: 1.25rem;
  font-weight: bold;
  margin-bottom: 1rem;
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
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.text-placeholder {
  color: #9ca3af;
  font-style: italic;
  margin-bottom: 1.5rem;
}

.info-list-section {
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
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
  font-size: 1.25rem;
  font-weight: 600;
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

.listings-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.listing-card {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.listing-card:hover {
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.listing-main {
  padding: 1.5rem;
}

.listing-header-row {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.listing-header-row h3 {
  font-size: 1.25rem;
  font-weight: 600;
  flex: 1;
  min-width: 200px;
}

.listing-status-badge {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  border-radius: 9999px;
  font-weight: 600;
  white-space: nowrap;
}

.status-open {
  background: #dcfce7;
  color: #16a34a;
}

.status-in-progress {
  background: #dbeafe;
  color: #2563eb;
}

.status-completed {
  background: #e5e7eb;
  color: #374151;
}

.status-cancelled {
  background: #fee2e2;
  color: #dc2626;
}

.listing-description {
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.listing-details {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.listing-detail-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.detail-label {
  font-weight: 600;
  color: #374151;
}

.listing-footer {
  padding: 1rem 1.5rem;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.listing-payment {
  font-size: 1.5rem;
  font-weight: bold;
  color: #16a34a;
}

.listing-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-action {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action-edit {
  background: #2563eb;
  color: white;
}

.btn-action-edit:hover {
  background: #1d4ed8;
}

.btn-action-delete {
  background: #dc2626;
  color: white;
}

.btn-action-delete:hover {
  background: #b91c1c;
}

.empty-state {
  text-align: center;
  padding: 3rem 0;
}

.empty-icon-text {
  font-size: 1.5rem;
  font-weight: bold;
  color: #d1d5db;
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.empty-title {
  color: #6b7280;
  font-size: 1.125rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
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

  .listing-header-row {
    flex-direction: column;
  }

  .listing-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .listing-actions {
    width: 100%;
  }

  .btn-action {
    flex: 1;
    justify-content: center;
  }
}
</style>