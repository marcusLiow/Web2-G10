<template>
  <div class="profile-page">
    <main class="container">
      <div v-if="errorMessage" class="error-banner">
        <p>{{ errorMessage }}</p>
        <button @click="retryLoad" class="btn-retry" type="button">Retry</button>
      </div>

      <div v-else-if="!currentUserId && !isLoading" class="not-logged-in">
        <p>You are not logged in. Please <router-link to="/login">log in</router-link> to view your profile.</p>
      </div>

      <div v-if="isLoading" class="loading-container">
        <div class="spinner"></div>
        <p>Loading profile...</p>
      </div>

      <template v-else>
        <section class="profile-header">
          <div class="profile-content">
            <div class="avatar-container">
              <img v-if="user.avatar_url" :src="user.avatar_url" :alt="user.username" class="avatar" />
              <div v-else class="avatar-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
            </div>

            <div class="profile-info">
              <div class="profile-top">
                <div>
                  <h1 class="profile-name">{{ user.username || 'Anonymous' }}</h1>

                  <div class="contact-info">
                    <div v-if="helperLocation" class="contact-item">
                      <span class="contact-label">Neighbourhood:</span> {{ helperLocation }}
                    </div>
                    <div v-if="user.email" class="contact-item">
                      <span class="contact-label">Email:</span> {{ user.email }}
                    </div>
                  </div>

                  <div class="rating-container">
                    <div class="stars">
                      <span v-for="n in 5" :key="n" :class="n <= Math.round(user.rating) ? 'star-filled' : 'star-empty'">★</span>
                    </div>
                    <span class="rating-number">{{ user.rating.toFixed(1) }}</span>
                    <span class="review-count">({{ user.reviewCount }} reviews)</span>
                  </div>
                </div>

                <button @click="openEditModal" class="btn-edit" type="button">Edit Profile</button>
              </div>
              <p v-if="user.bio" class="bio">{{ user.bio }}</p>
              <p v-else class="bio-placeholder">Add a bio to tell people about yourself...</p>
            </div>
          </div>
        </section>

        <section class="stats-grid">
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
                <p class="stat-number">{{ activeListingsCount }}</p>
                <p class="stat-label">Active Listings</p>
              </div>
            </div>
          </div>
        </section>

        <section class="tabs-section">
          <!-- IMPORTANT: tab buttons explicitly type="button" and use changeTab() to avoid any form submit or scoping issues -->
          <div class="tabs-header" ref="tabsHeader">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              v-show="tab.value !== 'skills' || user.is_helper"
              type="button"
              @click="changeTab(tab.value)"
              :class="['tab-button', { active: activeTab === tab.value }]"
            >
              {{ tab.label }}
            </button>
          </div>

          <div v-if="activeTab === 'about'" class="tab-content">
            <div class="content-body">
              <h2>About Me</h2>
              <p v-if="user.bio">{{ user.bio }}</p>
              <p v-else class="text-placeholder">No bio added yet. Click "Edit Profile" to add one.</p>
            </div>
          </div>

          <div v-if="activeTab === 'skills'" class="tab-content">
            <div class="content-body">
              <h2>Skills & Expertise</h2>

              <div v-if="displayedSkills.length" class="skills-list">
                <div v-for="(skill, idx) in displayedSkills" :key="idx" class="skill-card">
                  <div class="skill-header">
                    <h3>{{ skill.name }}</h3>
                    <span class="badge" :class="getBadgeClass(skill.level)">{{ skill.level }}</span>
                  </div>
                  <p class="skill-jobs">{{ skill.jobs || 0 }} jobs completed</p>
                </div>
              </div>

              <p v-else class="text-placeholder">No skills added yet.</p>
            </div>
          </div>

          <div v-if="activeTab === 'reviews'" class="tab-content">
            <div class="content-body">
              <h2>Customer Reviews</h2>
              <div v-if="loadingReviewsMsg" class="hint">{{ loadingReviewsMsg }}</div>

              <div v-if="user.reviews && user.reviews.length" class="reviews-list">
                <div v-for="r in user.reviews" :key="r.id" class="review-card">
                  <div class="review-content">
                    <div class="review-avatar">
                      <img v-if="r.avatar" :src="r.avatar" :alt="r.author" />
                      <div v-else class="avatar-placeholder-small">{{ r.author.charAt(0).toUpperCase() }}</div>
                    </div>
                    <div class="review-body">
                      <div class="review-header">
                        <div>
                          <p class="review-author">{{ r.author }}</p>
                          <p class="review-date">{{ r.date }}</p>
                        </div>
                        <div class="stars">
                          <span v-for="s in 5" :key="s" :class="s <= r.rating ? 'star-filled' : 'star-empty'">★</span>
                        </div>
                      </div>
                      <span v-if="r.service" class="service-badge">{{ r.service }}</span>
                      <p class="review-text">{{ r.comment }}</p>
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

          <div v-if="activeTab === 'jobs'" class="tab-content">
            <div class="content-body">
              <h2>Job History</h2>
              <div v-if="completedJobs.length" class="jobs-list">
                <div v-for="job in completedJobs" :key="job.id" class="job-card">
                  <div>
                    <h3>{{ job.title }}</h3>
                    <p class="job-description">{{ job.description }}</p>
                    <p class="job-date">Posted: {{ formatDateShort(job.created_at) }}</p>
                  </div>
                  <div class="job-right">
                    <p class="job-amount">${{ job.payment }}</p>
                    <span class="status-badge status-completed">COMPLETED</span>
                  </div>
                </div>
              </div>
              <div v-else class="empty-state">
                <div class="empty-icon-text">No Jobs</div>
                <p class="empty-title">No completed jobs yet</p>
                <p class="empty-text">Your completed jobs will appear here</p>
              </div>
            </div>
          </div>

          <div v-if="activeTab === 'listings'" class="tab-content">
            <div class="content-body">
              <h2>My Job Listings</h2>

              <!-- Defensive guard: ensure activeListings is defined -->
              <div v-if="activeListings && activeListings.length" class="listings-list">
                <div v-for="listing in activeListings" :key="listing.id" class="listing-card">
                  <div class="listing-main">
                    <div class="listing-header-row">
                      <h3>{{ listing.title }}</h3>
                      <span :class="['listing-status-badge', getStatusClass(listing.status)]">{{ (listing.status || '').toUpperCase() }}</span>
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
                      <button @click="markAsCompleted(listing.id)" class="btn-action btn-action-complete" type="button">Mark as Completed</button>
                      <button @click="editListing(listing)" class="btn-action btn-action-edit" type="button">Edit</button>
                      <button @click="deleteListing(listing.id)" class="btn-action btn-action-delete" type="button">Delete</button>
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
        </section>
      </template>
    </main>

    <!-- Edit Profile Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click="closeEditModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Edit Profile</h2>
          <button @click="closeEditModal" class="close-btn" type="button">×</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>Profile Picture</label>
            <div class="avatar-upload-section">
              <div class="avatar-preview-circle">
                <input 
                  type="file" 
                  ref="avatarInput"
                  @change="handleAvatarSelect"
                  accept="image/*"
                  style="display: none;"
                />
                
                <div v-if="!avatarPreview && !user.avatar_url" class="avatar-placeholder-upload" @click="$refs.avatarInput.click()">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <p>Click to upload</p>
                </div>
                
                <div v-else class="avatar-preview-wrapper">
                  <img 
                    v-if="avatarPreview || user.avatar_url" 
                    :src="avatarPreview || user.avatar_url" 
                    alt="Profile preview" 
                    class="avatar-preview-image"
                  />
                </div>
              </div>
              
              <div class="avatar-upload-controls">
                <button type="button" @click="$refs.avatarInput.click()" class="btn-upload-avatar">
                  {{ avatarFile || user.avatar_url ? 'Change Photo' : 'Upload Photo' }}
                </button>
                <button v-if="avatarPreview || user.avatar_url" type="button" @click="removeAvatar" class="btn-remove-avatar">
                  Remove
                </button>
              </div>
              
              <span class="hint">JPG, PNG or GIF. Max size 5MB</span>
              <div v-if="avatarError" class="error-message">{{ avatarError }}</div>
            </div>
          </div>

          <div class="form-group">
            <label>Username *</label>
            <input v-model="editForm.username" type="text" />
          </div>

          <div class="form-group">
            <label>Email</label>
            <input v-model="editForm.email" type="email" placeholder="your.email@example.com" />
          </div>

          <div class="form-group">
            <label>Bio</label>
            <textarea v-model="editForm.bio" rows="4"></textarea>
          </div>

          <!-- Helper toggle -->
          <div class="form-group">
            <label>List myself as a helper</label>
            <div>
              <button type="button" :class="['helper-toggle-btn', { active: editForm.is_helper }]" @click="editForm.is_helper = !editForm.is_helper">
                <span v-if="!editForm.is_helper">Become a helper</span>
                <span v-else>Listed as helper ✓</span>
              </button>
            </div>
          </div>

          <div v-if="editForm.is_helper" class="form-section">
            <h3>Helper Profile</h3>

            <div class="form-group">
              <label>Helper Title</label>
              <input v-model="editForm.helper_title" type="text" placeholder="e.g., Car Washer" />
            </div>

            <div class="form-group">
              <label>Neighbourhood (where you serve)</label>
              <select v-model="editForm.helper_location">
                <option value="">-- Select neighbourhood --</option>
                <option v-for="n in sortedNeighbourhoods" :key="n" :value="n">{{ n }}</option>
                <option value="Other">Other...</option>
              </select>
              <input v-if="editForm.helper_location === 'Other'" v-model="editForm.helper_location_custom" placeholder="Enter neighbourhood" />
            </div>

            <div class="form-group">
              <label>Availability (days)</label>
              <div class="days-selector">
                <button 
                  v-for="day in availabilityDayOptions" 
                  :key="day.value"
                  type="button"
                  :class="['day-btn', { active: isDaySelected(day.value) }]"
                  @click="toggleDay(day.value)"
                >
                  {{ day.label }}
                </button>
              </div>
              <small class="helper-text">Select all days that apply</small>
            </div>

            <div class="form-group">
              <label>Availability (time)</label>
              <div class="time-inputs">
                <div class="time-input-group">
                  <label>From</label>
                  <input 
                    type="time" 
                    v-model="editForm.availability_time_from"
                    class="form-input time-input"
                  />
                </div>
                <span class="time-separator">to</span>
                <div class="time-input-group">
                  <label>To</label>
                  <input 
                    type="time" 
                    v-model="editForm.availability_time_to"
                    class="form-input time-input"
                  />
                </div>
              </div>
              <small class="helper-text">Set your available working hours</small>
            </div>

            <div class="form-group">
              <label>Response Time</label>
              <select v-model="editForm.response_time">
                <option value="">-- Select response time --</option>
                <option>Within 1 hour</option>
                <option>Within 2 hours</option>
                <option>Within 4 hours</option>
                <option>Within 24 hours</option>
              </select>
            </div>

            <div class="form-group">
              <label>Helper-specific Skills</label>
              <div class="skills-editor-list">
                <div v-for="(s, i) in editForm.helper_skills" :key="i" class="skill-editor-item">
                  <input v-model="s.name" placeholder="Skill name (e.g., Dog walking)" />
                  <select v-model="s.level">
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                    <option>Expert</option>
                  </select>
                  <input v-model.number="s.jobs" type="number" min="0" class="small-input" placeholder="jobs" />
                  <button @click="removeHelperSkill(i)" type="button" class="btn-remove-skill">×</button>
                </div>
                <button @click="addHelperSkill" type="button" class="btn-add-skill">+ Add helper skill</button>
              </div>
            </div>

            <div class="form-group">
              <label>Experience / Qualifications</label>
              <div v-for="(exp, idx) in editForm.experience" :key="idx" class="experience-editor-row">
                <input v-model="editForm.experience[idx]" placeholder="e.g., 5 years car washing experience" />
                <button @click="removeExperience(idx)" type="button" class="btn-remove-skill">×</button>
              </div>
              <button @click="addExperience()" type="button" class="btn-add-skill">+ Add experience</button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeEditModal" class="btn-cancel" type="button">Cancel</button>
          <button @click="saveProfile" class="btn-save" type="button">Save Changes</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { supabase } from '../supabase/config';
import { useRouter } from 'vue-router';

const router = useRouter();

const isLoading = ref(true);
const errorMessage = ref('');
const currentUserId = ref(null);
const loadingReviewsMsg = ref('');

const activeTab = ref('about');
const tabs = [
  { label: 'About', value: 'about' },
  { label: 'Skills & Expertise', value: 'skills' },
  { label: 'Reviews', value: 'reviews' },
  { label: 'Job History', value: 'jobs' },
  { label: 'My Listings', value: 'listings' }
];

function changeTab(val) {
  // debugging: log tab clicks to console
  console.log('changeTab ->', val);
  activeTab.value = val;
}

const showEditModal = ref(false);

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
  stats: { jobsCompleted: 0, earnings: 0, rating: 0 },
  skills: [],
  reviews: [],
  recentJobs: [],
  is_helper: false,
  helper_profile: null
});

const editForm = reactive({
  username: '',
  bio: '',
  avatar_url: '',
  location: '',
  email: '',
  is_helper: false,
  helper_title: '',
  helper_description: '',
  helper_location: '',
  helper_location_custom: '',
  availability_days: [],
  availability_time_from: '',
  availability_time_to: '',
  response_time: '',
  helper_bio: '',
  helper_skills: [],
  experience: []
});

const avatarFile = ref(null);
const avatarPreview = ref('');
const avatarError = ref('');

/* Options */
const sgNeighbourhoods = [
  'Alexandra','Ang Mo Kio','Bedok','Bishan','Bugis','Bukit Merah','Bukit Timah',
  'Changi','Chinatown','Clementi','Downtown','Geylang','Holland Village','Hougang',
  'Jurong East','Jurong West','Kallang','Marina Bay','Newton','Orchard','Outram',
  'Pasir Ris','Punggol','Queenstown','Redhill','Rochor','Sengkang','Serangoon',
  'Tampines','Tanglin','Tanjong Pagar','Tiong Bahru','Toa Payoh','Upper Bukit Timah',
  'Upper East Coast','West Coast'
];

const sortedNeighbourhoods = computed(() => {
  return [...sgNeighbourhoods].sort();
});

const availabilityDayOptions = [
  { label: 'Mon', value: 'Monday' },
  { label: 'Tue', value: 'Tuesday' },
  { label: 'Wed', value: 'Wednesday' },
  { label: 'Thu', value: 'Thursday' },
  { label: 'Fri', value: 'Friday' },
  { label: 'Sat', value: 'Saturday' },
  { label: 'Sun', value: 'Sunday' }
];

const userListings = ref([]);
const completedJobs = ref([]);
const userIdFromSession = ref(null);

const activeListings = computed(() => userListings.value.filter(l => l.status === 'open'));
const activeListingsCount = computed(() => activeListings.value.length);

function isDaySelected(day) {
  return editForm.availability_days.includes(day);
}

function toggleDay(day) {
  const index = editForm.availability_days.indexOf(day);
  if (index > -1) {
    editForm.availability_days.splice(index, 1);
  } else {
    editForm.availability_days.push(day);
  }
}

function addHelperSkill() { editForm.helper_skills.push({ name: '', level: 'Beginner', jobs: 0 }); }
function removeHelperSkill(i) { editForm.helper_skills.splice(i, 1); }
function addExperience() { editForm.experience.push(''); }
function removeExperience(i) { editForm.experience.splice(i, 1); }

function renderStars(n) {
  const full = Math.floor(n);
  return '★'.repeat(full);
}
function formatDateShort(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString();
}
function getBadgeClass(level) {
  if (!level) return 'beginner';
  const l = level.toLowerCase();
  if (l.includes('expert') || l.includes('advanced')) return 'expert';
  if (l.includes('intermediate')) return 'intermediate';
  return 'beginner';
}
function retryLoad() {
  errorMessage.value = '';
  loadAll();
}

/* Helpers for skills display */
function parseSkillForDisplay(item) {
  if (!item) return { name: '', level: 'Beginner', jobs: 0 };
  if (typeof item === 'object') {
    return { name: item.name ?? item.title ?? String(item), level: item.level ?? 'Beginner', jobs: (item.jobs != null) ? Number(item.jobs) : 0 };
  }
  if (typeof item === 'string') {
    try {
      const p = JSON.parse(item);
      if (p && typeof p === 'object') return parseSkillForDisplay(p);
    } catch {}
    return { name: item, level: 'Beginner', jobs: 0 };
  }
  return { name: String(item), level: 'Beginner', jobs: 0 };
}
function normalizeSkillsForDisplay(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(parseSkillForDisplay);
  if (typeof raw === 'object') {
    if (raw.name) return [parseSkillForDisplay(raw)];
    return Object.values(raw).map(parseSkillForDisplay);
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return normalizeSkillsForDisplay(parsed);
    } catch {
      return raw.split(',').map(s => parseSkillForDisplay(s.trim()));
    }
  }
  return [];
}
const displayedSkills = computed(() => {
  if (user.helper_profile && user.helper_profile.skills) return normalizeSkillsForDisplay(user.helper_profile.skills);
  if (user.skills && user.skills.length) return normalizeSkillsForDisplay(user.skills);
  return [];
});
const helperLocation = computed(() => user.helper_profile?.location || '');

/* load / refresh logic */
async function getCurrentUserId() {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id || null;
  } catch (e) {
    return localStorage.getItem('userId');
  }
}

async function loadAll() {
  isLoading.value = true;
  errorMessage.value = '';
  loadingReviewsMsg.value = '';
  try {
    const uid = await getCurrentUserId();
    currentUserId.value = uid;
    if (!uid) { isLoading.value = false; return; }

    const { data: userData, error: userError } = await supabase.from('users').select('*').eq('id', uid).maybeSingle();
    if (userError) throw userError;
    if (!userData) throw new Error('User row not found');

    user.id = userData.id;
    user.username = userData.username || '';
    user.email = userData.email || '';
    user.phone = userData.phone || '';
    user.location = userData.location || '';
    user.bio = userData.bio || '';
    user.avatar_url = userData.avatar_url || '';
    user.created_at = userData.created_at || '';
    user.is_helper = userData.is_helper || false;

    user.skills = [];
    if (userData.skills) {
      if (Array.isArray(userData.skills)) user.skills = userData.skills;
      else if (typeof userData.skills === 'string') {
        try { user.skills = JSON.parse(userData.skills); } catch { user.skills = [userData.skills]; }
      } else if (typeof userData.skills === 'object') user.skills = Object.values(userData.skills);
    }

    // helper_profiles
    const { data: profileData, error: profileError } = await supabase.from('helper_profiles').select('*').eq('user_id', uid).maybeSingle();
    if (profileError) {
      console.warn('helper_profiles select error', profileError);
      user.helper_profile = null;
    } else {
      user.helper_profile = profileData || null;
    }

    // aggregated stats via RPC if helper
    if (user.is_helper) {
      try {
        const { data: statsData } = await supabase.rpc('get_helper_stats_for', { helper_uuid: uid });
        const row = Array.isArray(statsData) ? statsData[0] : statsData;
        if (row) {
          user.rating = Number(row.avg_rating) || 0;
          user.reviewCount = Number(row.review_count) || 0;
          user.stats.jobsCompleted = Number(row.completed_jobs) || 0;
        }
      } catch (e) { console.warn('get_helper_stats_for error', e); }
    } else {
      user.rating = 0;
      user.reviewCount = 0;
    }

    await loadUserReviews(uid);
    await loadUserListings(uid);
    await loadCompletedJobs(uid);
  } catch (err) {
    console.error('loadAll error', err);
    errorMessage.value = String(err.message || err);
  } finally {
    isLoading.value = false;
  }
}

/* Reviews/listings/jobs */
async function loadUserReviews(helperId) {
  try {
    loadingReviewsMsg.value = 'Loading reviews...';
    if (!helperId) { user.reviews = []; loadingReviewsMsg.value = ''; return; }
    
    // First, get the reviews
    const { data: reviewsData, error: reviewsError } = await supabase
      .from('reviews')
      .select('id, rating, comment, job_title, created_at, reviewer_id')
      .eq('helper_id', helperId)
      .order('created_at', { ascending: false });

    if (reviewsError) {
      console.warn('reviews fetch error', reviewsError);
      user.reviews = [];
      loadingReviewsMsg.value = reviewsError.message ? `Reviews not available: ${reviewsError.message}` : 'Reviews not available';
      return;
    }

    // Then fetch reviewer details separately
    if (reviewsData && reviewsData.length > 0) {
      const reviewerIds = [...new Set(reviewsData.map(r => r.reviewer_id).filter(Boolean))];
      
      let reviewersMap = {};
      if (reviewerIds.length > 0) {
        const { data: reviewersData } = await supabase
          .from('users')
          .select('id, username, avatar_url')
          .in('id', reviewerIds);
        
        if (reviewersData) {
          reviewersMap = Object.fromEntries(reviewersData.map(u => [u.id, u]));
        }
      }

      user.reviews = reviewsData.map(r => {
        const reviewer = reviewersMap[r.reviewer_id] || {};
        return {
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          service: r.job_title,
          date: r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
          author: reviewer.username || 'Anonymous',
          avatar: reviewer.avatar_url || ''
        };
      });
    } else {
      user.reviews = [];
    }

    if (user.reviewCount > 0 && (!user.reviews || user.reviews.length === 0)) {
      loadingReviewsMsg.value = 'No review rows returned (check RLS/policies or helper_id mismatch).';
    } else {
      loadingReviewsMsg.value = '';
    }
  } catch (e) {
    console.error('loadUserReviews error', e);
    user.reviews = [];
    loadingReviewsMsg.value = 'Failed to load reviews';
  }
}

async function loadUserListings(uid) {
  try {
    if (!uid) return;
    const { data, error } = await supabase.from('User-Job-Request').select('*').eq('user_id', uid).order('created_at', { ascending: false });
    if (error) { console.warn('listings fetch error', error); userListings.value = []; return; }
    userListings.value = data || [];
  } catch (e) {
    console.error('loadUserListings error', e);
    userListings.value = [];
  }
}

async function loadCompletedJobs(uid) {
  try {
    if (!uid) return;
    const { data, error } = await supabase.from('User-Job-Request').select('*').eq('user_id', uid).eq('status', 'completed').order('created_at', { ascending: false });
    if (error) { console.warn('completed jobs fetch error', error); completedJobs.value = []; return; }
    completedJobs.value = data || [];
    user.stats.jobsCompleted = completedJobs.value.length;
  } catch (e) {
    console.error('loadCompletedJobs error', e);
    completedJobs.value = [];
  }
}

/* Edit modal helpers */
function openEditModal() {
  editForm.username = user.username;
  editForm.bio = user.bio || '';
  editForm.avatar_url = user.avatar_url || '';
  editForm.location = user.location || '';
  editForm.email = user.email || '';
  editForm.is_helper = user.is_helper || false;
  editForm.helper_title = user.helper_profile?.title || user.helper_title || '';
  editForm.helper_description = user.helper_profile?.description || '';
  editForm.helper_location = user.helper_profile?.location || '';
  editForm.helper_location_custom = editForm.helper_location && !sgNeighbourhoods.includes(editForm.helper_location) ? editForm.helper_location : '';
  editForm.response_time = user.helper_profile?.response_time || '';
  editForm.helper_bio = user.bio || '';
  editForm.helper_skills = user.helper_profile?.skills ? normalizeSkillsForDisplay(user.helper_profile.skills) : (user.skills || []);
  editForm.experience = Array.isArray(user.helper_profile?.experience) ? user.helper_profile.experience.slice() : (user.experience || []);
  
  // Parse availability
  const availability = user.helper_profile?.availability || '';
  const parts = availability.split(' • ');
  
  // Parse days
  editForm.availability_days = [];
  if (parts[0]) {
    const daysPart = parts[0];
    availabilityDayOptions.forEach(opt => {
      if (daysPart.includes(opt.value) || daysPart.includes(opt.label)) {
        editForm.availability_days.push(opt.value);
      }
    });
  }
  
  // Parse time
  editForm.availability_time_from = '';
  editForm.availability_time_to = '';
  if (parts[1]) {
    const timePart = parts[1];
    const timeMatch = timePart.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (timeMatch) {
      editForm.availability_time_from = timeMatch[1];
      editForm.availability_time_to = timeMatch[2];
    }
  }
  
  // Set avatar preview
  avatarPreview.value = user.avatar_url || '';
  avatarFile.value = null;
  avatarError.value = '';
  
  showEditModal.value = true;
}

function closeEditModal() {
  showEditModal.value = false;
  avatarFile.value = null;
  avatarPreview.value = '';
  avatarError.value = '';
}

// Avatar upload methods
function handleAvatarSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  avatarError.value = '';
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    avatarError.value = 'Please select a valid image file';
    return;
  }
  
  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    avatarError.value = 'Image size must be less than 5MB';
    return;
  }
  
  avatarFile.value = file;
  
  // Create preview
  const reader = new FileReader();
  reader.onload = (e) => {
    avatarPreview.value = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removeAvatar() {
  avatarFile.value = null;
  avatarPreview.value = '';
  editForm.avatar_url = '';
  avatarError.value = '';
}

async function uploadAvatar() {
  if (!avatarFile.value && !avatarPreview.value) {
    return null;
  }
  
  if (!avatarFile.value) {
    return editForm.avatar_url || null;
  }
  
  try {
    const file = avatarFile.value;
    const fileExt = file.name.split('.').pop();
    const fileName = `avatar-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `avatars/${fileName}`;
    
    console.log('Uploading avatar:', filePath);
    
    const { data, error } = await supabase.storage
      .from('job-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) throw error;
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('job-images')
      .getPublicUrl(filePath);
    
    console.log('Avatar uploaded successfully:', urlData.publicUrl);
    return urlData.publicUrl;
    
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw new Error(`Failed to upload avatar: ${error.message}`);
  }
}

/* Save profile & helper_profiles upsert */
async function saveProfile() {
  try {
    const session = await supabase.auth.getSession();
    const uid = session?.data?.session?.user?.id;
    if (!uid) {
      alert('You must be signed in to save your profile');
      return;
    }

    if (!editForm.username || !editForm.username.trim()) {
      alert('Username is required');
      return;
    }

    // Upload avatar if a new one was selected
    let avatarUrl = editForm.avatar_url;
    if (avatarFile.value) {
      avatarUrl = await uploadAvatar();
    }

    let finalHelperLocation = '';
    if (editForm.helper_location === 'Other') finalHelperLocation = (editForm.helper_location_custom || '').trim();
    else finalHelperLocation = editForm.helper_location || null;

    // Build availability string
    const availabilityParts = [];
    
    // Days part
    if (editForm.availability_days.length > 0) {
      const sortedDays = editForm.availability_days.sort((a, b) => {
        const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return order.indexOf(a) - order.indexOf(b);
      });
      availabilityParts.push(sortedDays.join(', '));
    }
    
    // Time part
    if (editForm.availability_time_from && editForm.availability_time_to) {
      availabilityParts.push(`${editForm.availability_time_from} - ${editForm.availability_time_to}`);
    }
    
    const availabilityCombined = availabilityParts.join(' • ') || null;

    // Update users table
    const { error: uErr } = await supabase.from('users').update({
      username: editForm.username,
      bio: editForm.is_helper ? (editForm.helper_bio || null) : (editForm.bio || null),
      avatar_url: avatarUrl || null,
      email: editForm.email || null,
      is_helper: editForm.is_helper,
      updated_at: new Date().toISOString()
    }).eq('id', uid);

    if (uErr) throw uErr;

    if (editForm.is_helper) {
      const helperPayload = {
        user_id: uid,
        title: editForm.helper_title || editForm.username,
        description: editForm.helper_description || null,
        skills: editForm.helper_skills.map(s => ({ name: s.name, level: s.level || 'Beginner', jobs: s.jobs || 0 })),
        availability: availabilityCombined,
        response_time: editForm.response_time || null,
        bio: editForm.helper_bio || null,
        experience: Array.isArray(editForm.experience) ? editForm.experience : [],
        location: finalHelperLocation || null,
        is_active: true,
        updated_at: new Date().toISOString()
      };

      const { error: hpErr } = await supabase.from('helper_profiles').upsert(helperPayload, { onConflict: 'user_id', returning: 'representation' });
      if (hpErr) throw hpErr;
    } else {
      // When unlisting as helper, set is_active to false in helper_profiles
      const { error: disableErr } = await supabase.from('helper_profiles').update({ is_active: false }).eq('user_id', uid);
      if (disableErr) console.warn('disable helper_profiles error', disableErr);
    }

    await loadAll();
    closeEditModal();
    alert('Profile updated successfully!');
  } catch (err) {
    console.error('saveProfile error', err);
    alert('Failed to save profile: ' + (err.message || err));
  }
}

/* lifecycle */
onMounted(() => { loadAll(); });

/* Small helper stubs for actions used in template (implement as needed) */
// Mark job as completed
async function markAsCompleted(jobId) {
  if (!jobId) {
    alert('Invalid job ID');
    return;
  }
  
  if (!confirm('Are you sure you want to mark this job as completed? It will be moved to your Job History.')) {
    return;
  }
  
  try {
    const userId = currentUserId.value;
    
    // Update the status to completed
    const { data, error } = await supabase
      .from('User-Job-Request')
      .update({ 
        status: 'completed'
      })
      .eq('id', jobId)
      .eq('user_id', userId)
      .select();

    if (error) {
      console.error('Error marking job as completed:', error);
      alert(`Failed to mark job as completed: ${error.message}`);
      return;
    }
    
    if (!data || data.length === 0) {
      alert('Job not found or you do not have permission to update it.');
      return;
    }
    
    alert('Job marked as completed successfully!');
    
    // Refresh the listings and completed jobs
    await loadUserListings(userId);
    await loadCompletedJobs(userId);
    
  } catch (error) {
    console.error('Unexpected error marking job as completed:', error);
    alert('An unexpected error occurred. Please try again.');
  }
}

// Edit listing - navigate to edit page
function editListing(listing) {
  if (!listing || !listing.id) {
    alert('Invalid listing');
    return;
  }
  
  // Navigate to the edit page with the listing ID
  router.push(`/edit-job/${listing.id}`);
}

// Delete listing
async function deleteListing(jobId) {
  if (!jobId) {
    alert('Invalid job ID');
    return;
  }
  
  if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
    return;
  }
  
  try {
    const userId = currentUserId.value;
    
    // Delete the job
    const { error } = await supabase
      .from('User-Job-Request')
      .delete()
      .eq('id', jobId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting job:', error);
      alert(`Failed to delete job: ${error.message}`);
      return;
    }
    
    alert('Job deleted successfully!');
    
    // Refresh the listings
    await loadUserListings(userId);
    
  } catch (error) {
    console.error('Unexpected error deleting job:', error);
    alert('An unexpected error occurred. Please try again.');
  }
}
function getStatusClass(status) { if (!status) return ''; const s = String(status).toLowerCase(); if (s === 'open') return 'status-open'; if (s === 'in_progress' || s === 'in-progress') return 'status-in-progress'; if (s === 'completed') return 'status-completed'; if (s === 'cancelled') return 'status-cancelled'; return ''; }
</script>

<style scoped>
/* Combined styles: kept concise but include your existing visual styles */
.container { max-width:1200px; margin:0 auto; padding:2rem 1rem; }
.loading-container, .not-logged-in, .error-banner { text-align:center; padding:2rem; }
.spinner { width:48px; height:48px; border:4px solid #eee; border-top-color:#6C5B7F; border-radius:50%; animation:spin .8s linear infinite; margin:0 auto 1rem; }
@keyframes spin { to { transform:rotate(360deg); } }

.profile-header { background:#fff; padding:1.25rem; border-radius:8px; margin-bottom:1rem; box-shadow:0 1px 4px rgba(0,0,0,.05); }
.profile-content { display:flex; gap:1rem; align-items:flex-start; }
.avatar-container { width:128px; height:128px; border-radius:50%; overflow:hidden; background:#f3f4f6; display:flex; align-items:center; justify-content:center; }
.avatar { width:100%; height:100%; object-fit:cover; }
.avatar-placeholder { font-size:4rem; color:#9ca3af; }
.profile-info { flex:1; min-width:300px; }
.profile-top { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; margin-bottom:1rem; }
.profile-name { font-size:2rem; margin:0 0 .5rem 0; font-weight:700; }
.contact-info { display:flex; flex-wrap:wrap; gap:1rem; color:#6b7280; margin-bottom:.75rem; }
.contact-item { display:flex; gap:.25rem; align-items:center; }
.contact-label { font-weight:600; color:#374151; }

.rating-container { display:flex; align-items:center; gap:.5rem; margin-bottom:.5rem; }
.stars { display:flex; gap:.125rem; }
.star-filled { color:#fbbf24; }
.star-empty { color:#d1d5db; }

.btn-edit { padding:.5rem 1rem; border:1px solid #d1d5db; border-radius:.375rem; background:white; cursor:pointer; font-weight:500; }

.stats-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:1rem; margin-bottom:1.5rem; }
.stat-card { background:#fff; padding:1rem; border-radius:.5rem; box-shadow:0 1px 3px rgba(0,0,0,.08); border-left:4px solid transparent; }
.stat-card-jobs { border-left-color:#3b82f6; }
.stat-card-earnings { border-left-color:#10b981; }
.stat-card-rating { border-left-color:#f59e0b; }
.stat-card-listings { border-left-color:#8b5cf6; }
.stat-number { font-size:1.5rem; font-weight:700; margin:0; }
.stat-label { font-size:.9rem; color:#6b7280; margin-top:.25rem; }

.tabs-section { margin-top: 1.5rem; }

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

.tab-content { background:white; border-radius:0 0 .5rem .5rem; box-shadow:0 1px 3px rgba(0,0,0,.08); margin-top:0; }
.content-body { padding:1.5rem; }

.skill-card { border:1px solid #e5e7eb; padding:1rem; border-radius:.5rem; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center; }
.skill-header { display:flex; align-items:center; gap:1rem; }
.badge { padding:.25rem .75rem; border-radius:9999px; font-weight:600; }
.badge.expert { background:#2563eb; color:white; }
.badge.intermediate { background:#e5e7eb; color:#374151; }
.badge.beginner { background:white; border:1px solid #d1d5db; color:#374151; }

.reviews-list { display:flex; flex-direction:column; gap:1.25rem; }
.review-card { padding-bottom:1rem; border-bottom:1px solid #e5e7eb; }
.review-content { display:flex; gap:1rem; }
.review-avatar { width:40px; height:40px; border-radius:50%; overflow:hidden; background:#e5e7eb; display:flex; align-items:center; justify-content:center; }
.avatar-placeholder-small { color:#9ca3af; font-weight:700; }
.review-body { flex:1; }
.review-header { display:flex; justify-content:space-between; align-items:start; gap:.5rem; }
.review-author { font-weight:600; }
.service-badge { display:inline-block; padding:.25rem .5rem; background:#eff6ff; color:#2563eb; border-radius:9999px; margin:.5rem 0; }

.jobs-list, .listings-list { display:flex; flex-direction:column; gap:1rem; }
.job-card, .listing-card { border:1px solid #e5e7eb; padding:1rem; border-radius:.5rem; }
.job-card { display:flex; justify-content:space-between; align-items:start; }
.job-right { display:flex; flex-direction:column; align-items:flex-end; gap:.5rem; }
.job-amount { font-size:1.25rem; font-weight:700; color:#2563eb; }
.status-badge { padding:.25rem .75rem; border-radius:9999px; font-size:.75rem; font-weight:600; }
.status-completed { background:#dcfce7; color:#166534; }
.status-open { background:#dbeafe; color:#1e40af; }
.status-in-progress { background:#fef3c7; color:#92400e; }
.status-cancelled { background:#fee2e2; color:#991b1b; }

.listing-main { margin-bottom:1rem; }
.listing-header-row { display:flex; justify-content:space-between; align-items:start; gap:1rem; margin-bottom:.5rem; }
.listing-status-badge { padding:.25rem .75rem; border-radius:9999px; font-size:.75rem; font-weight:600; }
.listing-details { display:flex; flex-wrap:wrap; gap:1rem; margin-top:.75rem; color:#6b7280; }
.listing-detail-item { display:flex; gap:.25rem; }
.detail-label { font-weight:600; }
.listing-footer { display:flex; justify-content:space-between; align-items:center; border-top:1px solid #e5e7eb; padding-top:1rem; }
.listing-payment { font-size:1.5rem; font-weight:700; color:#2563eb; }
.listing-actions { display:flex; gap:.5rem; }
.btn-action { padding:.5rem .75rem; border-radius:.375rem; font-size:.875rem; cursor:pointer; border:1px solid transparent; }
.btn-action-complete { background:#dcfce7; color:#166534; border-color:#86efac; }
.btn-action-edit { background:#dbeafe; color:#1e40af; border-color:#93c5fd; }
.btn-action-delete { background:#fee2e2; color:#991b1b; border-color:#fca5a5; }

.empty-state { text-align:center; padding:3rem 1rem; }
.empty-icon-text { font-size:3rem; color:#d1d5db; margin-bottom:1rem; }
.empty-title { font-size:1.25rem; font-weight:600; margin-bottom:.5rem; }
.empty-text { color:#6b7280; }

.form-group { margin-bottom:1rem; display:flex; flex-direction:column; gap:.5rem; }
.form-group label { font-weight:500; }
.form-group input, .form-group textarea, .form-group select { padding:.5rem .75rem; border:1px solid #d1d5db; border-radius:.375rem; }
.hint { font-size:.875rem; color:#6b7280; }

.helper-toggle-btn { padding:.5rem 1rem; border-radius:999px; border:1px solid #d1d5db; background:white; cursor:pointer; }
.helper-toggle-btn.active { background:#6C5B7F; color:white; border-color:#6C5B7F; }

.form-section { border-top:1px solid #e5e7eb; padding-top:1rem; margin-top:1rem; }

.skills-editor-list { display:flex; flex-direction:column; gap:.5rem; }
.skill-editor-item { display:flex; gap:.5rem; align-items:center; }
.small-input { width:80px; }
.btn-add-skill { padding:.4rem .6rem; border-radius:.375rem; border:1px dashed #d1d5db; background:white; cursor:pointer; }
.btn-remove-skill { padding:.25rem .5rem; border-radius:.375rem; background:#fee2e2; border:1px solid #fca5a5; cursor:pointer; }

.experience-editor-row { display:flex; gap:.5rem; margin-bottom:.5rem; }

.modal-overlay { 
  position:fixed; 
  inset:0; 
  background:rgba(0,0,0,.5); 
  display:flex; 
  align-items:center; 
  justify-content:center; 
  z-index:9999;
  padding:1rem; 
}
.modal-content { background:white; border-radius:.5rem; max-width:800px; width:100%; max-height:90vh; overflow:auto; }
.modal-header { padding:1.25rem; border-bottom:1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center; position:sticky; top:0; background:white; z-index:10; }
.close-btn { background:none; border:none; font-size:2rem; cursor:pointer; color:#6b7280; line-height:1; }
.modal-body { padding:1.25rem; }
.modal-footer { padding:1rem; border-top:1px solid #e5e7eb; display:flex; justify-content:flex-end; gap:.75rem; position:sticky; bottom:0; background:#fff; }
.btn-save { padding:.5rem 1rem; background:#2563eb; color:white; border:none; border-radius:.375rem; cursor:pointer; }
.btn-cancel { padding:.5rem 1rem; background:white; border:1px solid #d1d5db; border-radius:.375rem; cursor:pointer; }
.btn-retry { padding:.5rem 1rem; background:#2563eb; color:white; border:none; border-radius:.375rem; cursor:pointer; }

.avatar-upload-section {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.avatar-preview-circle {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #e5e7eb;
  background: #f9fafb;
  flex-shrink: 0;
}

.avatar-placeholder-upload {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #9ca3af;
  transition: all 0.3s;
}

.avatar-placeholder-upload:hover {
  background: #f3f4f6;
  color: #6b7280;
}

.avatar-placeholder-upload svg {
  margin-bottom: 0.5rem;
}

.avatar-placeholder-upload p {
  font-weight: 500;
  font-size: 0.875rem;
}

.avatar-preview-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.avatar-preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-upload-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.btn-upload-avatar {
  padding: 0.5rem 1rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
  width: 100%;
}

.btn-upload-avatar:hover {
  background: #1d4ed8;
}

.btn-remove-avatar {
  padding: 0.5rem 1rem;
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  width: 100%;
}

.btn-remove-avatar:hover {
  background: #fecaca;
}

/* Remove zoom control styles - no longer needed */

/* Days selector */
.days-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.day-btn {
  padding: 0.5rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  background: white;
  color: #6b7280;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.day-btn:hover {
  border-color: #2563eb;
  color: #2563eb;
}

.day-btn.active {
  background: #2563eb;
  border-color: #2563eb;
  color: white;
}

/* Time inputs */
.time-inputs {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.time-input-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.time-input-group label {
  font-size: 0.875rem;
  color: #6b7280;
}

.time-input {
  padding: 0.5rem 0.75rem;
}

.time-separator {
  color: #6b7280;
  font-weight: 500;
  margin-top: 1.5rem;
}

/* Dropdown always down */
.suggestions-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem) !important;
  bottom: auto !important;
  left: 0;
  right: 0;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  max-height: 300px;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

@media (max-width:768px) {
  .profile-content { flex-direction:column; }
  .skill-card { flex-direction:column; align-items:flex-start; gap:.5rem; }
  .listing-footer { flex-direction:column; align-items:stretch; gap:1rem; }
  .listing-actions { flex-direction:column; }
  
  .avatar-upload-section {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .avatar-preview-circle {
    width: 120px;
    height: 120px;
  }
  
  .avatar-upload-controls {
    width: 100%;
  }
  
  .time-inputs {
    flex-direction: column;
    align-items: stretch;
  }
  
  .time-separator {
    margin-top: 0;
    text-align: center;
  }
}
</style>