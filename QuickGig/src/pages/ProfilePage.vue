<template>
  <div class="profile-page">
    <main class="container">
      <!-- Error / Not logged in / Loading states -->
      <div v-if="errorMessage" class="error-banner">
        <p>{{ errorMessage }}</p>
        <button @click="retryLoad" class="btn-retry">Retry</button>
      </div>

      <div v-else-if="!currentUserId && !isLoading" class="not-logged-in">
        <p>You are not logged in. Please <router-link to="/login">log in</router-link> to view your profile.</p>
      </div>

      <div v-if="isLoading" class="loading-container">
        <div class="spinner"></div>
        <p>Loading profile...</p>
      </div>

      <!-- Profile -->
      <template v-else>
        <div class="profile-header">
          <div class="profile-content">
            <div class="avatar-container">
              <img v-if="user.avatar_url" :src="user.avatar_url" :alt="user.username" class="avatar" />
              <div v-else class="avatar-placeholder">{{ user.username ? user.username.charAt(0).toUpperCase() : '?' }}</div>
            </div>

            <div class="profile-info">
              <div class="profile-top">
                <div>
                  <h1 class="profile-name">{{ user.username || 'Anonymous' }}</h1>

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
                      <span v-for="n in 5" :key="n" :class="n <= Math.round(user.rating) ? 'star-filled' : 'star-empty'">★</span>
                    </div>
                    <span class="rating-number">{{ user.rating.toFixed(1) }}</span>
                    <span class="review-count">({{ user.reviewCount }} reviews)</span>
                  </div>
                </div>

                <div>
                  <button @click="openEditModal" class="btn-edit">Edit Profile</button>
                </div>
              </div>

              <p v-if="user.bio" class="bio">{{ user.bio }}</p>
              <p v-else class="bio-placeholder">Add a bio to tell people about yourself...</p>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="stats-grid">
          <div class="stat-card">
            <p class="stat-number">{{ user.stats.jobsCompleted }}</p>
            <p class="stat-label">Jobs Completed</p>
          </div>
          <div class="stat-card">
            <p class="stat-number">${{ user.stats.earnings.toLocaleString() }}</p>
            <p class="stat-label">Total Earnings</p>
          </div>
          <div class="stat-card">
            <p class="stat-number">{{ user.rating.toFixed(1) }}</p>
            <p class="stat-label">Average Rating</p>
          </div>
          <div class="stat-card">
            <p class="stat-number">{{ activeListingsCount }}</p>
            <p class="stat-label">Active Listings</p>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs-section">
          <div class="tabs-header">
            <button v-for="tab in tabs" :key="tab.value" @click="activeTab = tab.value" :class="['tab-button', { active: activeTab === tab.value }]">
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
              <div v-if="user.skills && user.skills.length">
                <div v-for="(skill, i) in user.skills" :key="i" class="skill-card">
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
              <div v-if="user.reviews && user.reviews.length">
                <div v-for="r in user.reviews" :key="r.id" class="review-card">
                  <div class="review-header">
                    <strong>{{ r.author }}</strong> — <small>{{ r.date }}</small>
                    <div class="stars-inline">{{ renderStars(r.rating) }} <span class="rating-number-small">{{ r.rating }}</span></div>
                  </div>
                  <p class="review-text">{{ r.comment }}</p>
                </div>
              </div>
              <div v-else class="empty-state">
                <p>No reviews yet</p>
              </div>
            </div>
          </div>

          <div v-if="activeTab === 'jobs'" class="tab-content">
            <div class="content-body">
              <h2>Job History</h2>
              <div v-if="completedJobs.length">
                <div v-for="job in completedJobs" :key="job.id" class="job-card">
                  <div>
                    <h3>{{ job.title || 'Job' }}</h3>
                    <p class="job-date">{{ formatDateShort(job.created_at) }}</p>
                  </div>
                  <div>
                    <span class="status-badge status-completed">COMPLETED</span>
                  </div>
                </div>
              </div>
              <div v-else><p>No completed jobs yet.</p></div>
            </div>
          </div>

          <div v-if="activeTab === 'listings'" class="tab-content">
            <div class="content-body">
              <h2>My Listings</h2>
              <div v-if="activeListings.length">
                <div v-for="l in activeListings" :key="l.id" class="listing-card">
                  <h3>{{ l.title }}</h3>
                  <p>{{ l.description }}</p>
                </div>
              </div>
              <div v-else><p>No active listings.</p></div>
            </div>
          </div>
        </div>
      </template>
    </main>

    <!-- Edit Profile Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click="closeEditModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Edit Profile</h2>
          <button @click="closeEditModal" class="close-btn">×</button>
        </div>

        <div class="modal-body">
          <!-- Basic user fields -->
          <div class="form-row">
            <label>Username *</label>
            <input v-model="editForm.username" type="text" />
          </div>

          <div class="form-row">
            <label>Bio</label>
            <textarea v-model="editForm.bio" rows="3"></textarea>
          </div>

          <!-- Location selection (user-level retained) -->
          <div class="form-row">
            <label>Your general location (optional)</label>
            <select v-model="editForm.location_select">
              <option value="">-- Select Location --</option>
              <option v-for="loc in locationOptions" :key="loc" :value="loc">{{ loc }}</option>
              <option value="Other">Other...</option>
            </select>
            <input v-if="editForm.location_select === 'Other'" v-model="editForm.location_custom" placeholder="Enter your city or area" />
          </div>

          <!-- Nicer helper toggle button -->
          <div class="form-row helper-toggle-row">
            <div>
              <label class="helper-toggle-label">List myself as a helper</label>
              <p class="hint">Make your profile discoverable in Browse Helpers.</p>
            </div>
            <button
              type="button"
              :class="['helper-toggle-btn', { active: editForm.is_helper }]"
              @click="editForm.is_helper = !editForm.is_helper"
              aria-pressed="editForm.is_helper"
            >
              <span v-if="!editForm.is_helper">Become a helper</span>
              <span v-else>Listed as helper ✓</span>
            </button>
          </div>

          <!-- Helper-specific form (visible when editForm.is_helper is true) -->
          <div v-if="editForm.is_helper" class="helper-form-section">
            <h3>Helper Profile</h3>

            <div class="form-row">
              <label>Helper Title</label>
              <input v-model="editForm.helper_title" type="text" placeholder="e.g., Car Washer" />
            </div>

            <div class="form-row">
              <label>Short Description</label>
              <input v-model="editForm.helper_description" type="text" placeholder="Short description for listing" />
            </div>

            <!-- Helper location (neighbourhood dropdown for Singapore) -->
            <div class="form-row">
              <label>Neighbourhood (where you serve)</label>
              <select v-model="editForm.helper_location">
                <option value="">-- Select neighbourhood --</option>
                <option v-for="n in sgNeighbourhoods" :key="n" :value="n">{{ n }}</option>
                <option value="Other">Other...</option>
              </select>
              <input v-if="editForm.helper_location === 'Other'" v-model="editForm.helper_location_custom" placeholder="Enter neighbourhood" />
            </div>

            <!-- Availability: day & time dropdowns -->
            <div class="form-row availability-row">
              <label>Availability (days)</label>
              <select v-model="editForm.availability_day">
                <option value="">-- Select days --</option>
                <option v-for="d in availabilityDayOptions" :key="d" :value="d">{{ d }}</option>
                <option value="Custom">Custom...</option>
              </select>
              <input v-if="editForm.availability_day === 'Custom'" v-model="editForm.availability_day_custom" placeholder="e.g., Mon, Wed, Fri" />
            </div>

            <div class="form-row availability-row">
              <label>Availability (time)</label>
              <select v-model="editForm.availability_time">
                <option value="">-- Select time --</option>
                <option v-for="t in availabilityTimeOptions" :key="t" :value="t">{{ t }}</option>
                <option value="Custom">Custom...</option>
              </select>
              <input v-if="editForm.availability_time === 'Custom'" v-model="editForm.availability_time_custom" placeholder="e.g., 9:00 - 17:00" />
            </div>

            <div class="form-row">
              <label>Response Time</label>
              <select v-model="editForm.response_time">
                <option value="">-- Select response time --</option>
                <option>Within 1 hour</option>
                <option>Within 2 hours</option>
                <option>Within 4 hours</option>
                <option>Within 24 hours</option>
              </select>
            </div>

            <div class="form-row">
              <label>Public Helper Bio</label>
              <textarea v-model="editForm.helper_bio" rows="3" placeholder="Detailed bio shown on your helper profile"></textarea>
            </div>

            <!-- Helper-specific skills: manage list of structured skills -->
            <div class="form-row">
              <label>Helper-specific Skills</label>
              <div class="skills-editor-list">
                <div v-for="(s, i) in editForm.helper_skills" :key="i" class="skill-editor-item">
                  <input v-model="s.name" placeholder="Skill name (e.g., Car Washing)" />
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

            <!-- Experience list -->
            <div class="form-row">
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
          <button @click="closeEditModal" class="btn-cancel">Cancel</button>
          <button @click="saveProfile" class="btn-save">Save Changes</button>
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

const activeTab = ref('about');
const tabs = [
  { label: 'About', value: 'about' },
  { label: 'Skills & Expertise', value: 'skills' },
  { label: 'Reviews', value: 'reviews' },
  { label: 'Job History', value: 'jobs' },
  { label: 'My Listings', value: 'listings' }
];

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

/* Edit form */
const editForm = reactive({
  username: '',
  bio: '',
  location_select: '',
  location_custom: '',
  location: '',

  is_helper: false,

  helper_title: '',
  helper_description: '',
  helper_location: '',
  helper_location_custom: '',
  availability_day: '',
  availability_day_custom: '',
  availability_time: '',
  availability_time_custom: '',
  response_time: '',
  helper_bio: '',
  helper_skills: [], // [{ name, level, jobs }]
  experience: []
});

/* Options */
const locationOptions = [
  'Downtown','Marina Bay','Orchard','Newton','Tanglin','Bukit Timah',
  'Holland Village','Kallang','Geylang','Bugis','Rochor','Tanjong Pagar',
  'Chinatown','Outram','Tiong Bahru','Toa Payoh','Bishan','Serangoon',
  'Ang Mo Kio','Hougang','Punggol','Sengkang','Pasir Ris','Tampines',
  'Changi','Jurong East','Jurong West','Clementi','West Coast','Queenstown',
  'Bukit Merah','Alexandra','Redhill','Bedok','Upper East Coast','Upper Bukit Timah'
];

const sgNeighbourhoods = locationOptions; // reuse for helper location dropdown

const availabilityDayOptions = [
  'Weekdays','Weekends','Weekdays & Weekends','Mon-Fri','Sat-Sun'
];

const availabilityTimeOptions = [
  'Morning (8am - 12pm)','Afternoon (12pm - 5pm)','Evening (5pm - 9pm)','Anytime','Specific hours'
];

const userListings = ref([]);
const completedJobs = ref([]);
const userIdFromSession = ref(null);

const activeListings = computed(() => userListings.value.filter(l => l.status === 'open'));
const activeListingsCount = computed(() => activeListings.value.length);

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

async function getCurrentUserId() {
  try {
    const { data } = await supabase.auth.getSession();
    const id = data?.session?.user?.id;
    if (id) return id;
  } catch (e) {
    console.warn('supabase.auth.getSession failed', e);
  }
  return localStorage.getItem('userId');
}

/* ---------- load / refresh logic ---------- */
async function loadAll() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const uid = await getCurrentUserId();
    currentUserId.value = uid || null;
    if (!uid) { isLoading.value = false; return; }
    userIdFromSession.value = uid;

    // load users row
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (userError) throw userError;
    if (!userData) throw new Error('User row not found');

    // populate local user
    user.id = userData.id;
    user.username = userData.username || '';
    user.email = userData.email || '';
    user.phone = userData.phone || '';
    user.location = userData.location || '';
    user.bio = userData.bio || '';
    user.avatar_url = userData.avatar_url || '';
    user.created_at = userData.created_at || '';
    user.is_helper = userData.is_helper || false;

    // normalize skills
    if (userData.skills) {
      let skillsArray = [];
      if (Array.isArray(userData.skills)) skillsArray = userData.skills;
      else if (typeof userData.skills === 'string') {
        try { skillsArray = JSON.parse(userData.skills); } catch { skillsArray = [userData.skills]; }
      } else if (typeof userData.skills === 'object') skillsArray = Object.values(userData.skills);
      user.skills = skillsArray.map(s => (typeof s === 'object' ? s : { name: String(s), level: 'Beginner', jobs: 0 }));
    } else user.skills = [];

    // load helper_profiles (maybe single)
    const { data: profileData, error: profileError } = await supabase
      .from('helper_profiles')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();

    if (!profileError && profileData) {
      user.helper_profile = profileData;
      // reflect in edit form
      editForm.is_helper = true;

      // availability parsing (stored as "DAY • TIME")
      if (profileData.availability) {
        const parts = String(profileData.availability).split('•').map(p => p.trim());
        if (parts.length === 2) {
          editForm.availability_day = availabilityDayOptions.includes(parts[0]) ? parts[0] : '';
          if (!editForm.availability_day) editForm.availability_day_custom = parts[0];
          editForm.availability_time = availabilityTimeOptions.includes(parts[1]) ? parts[1] : '';
          if (!editForm.availability_time) editForm.availability_time_custom = parts[1];
        } else {
          editForm.availability_day_custom = profileData.availability;
        }
      }

      editForm.helper_title = profileData.title || '';
      editForm.helper_description = profileData.description || '';
      editForm.helper_location = profileData.location || '';
      if (editForm.helper_location && !sgNeighbourhoods.includes(editForm.helper_location)) editForm.helper_location = 'Other';
      if (editForm.helper_location === 'Other') editForm.helper_location_custom = profileData.location || '';
      editForm.response_time = profileData.response_time || '';
      editForm.helper_bio = profileData.bio || '';
      editForm.experience = Array.isArray(profileData.experience) ? profileData.experience.slice() : [];
      editForm.helper_skills = Array.isArray(profileData.skills)
        ? profileData.skills.map(s => ({ name: s.name || s, level: s.level || 'Beginner', jobs: s.jobs || 0 }))
        : [];
      // set location_select from user's location if present
      editForm.location_select = user.location && locationOptions.includes(user.location) ? user.location : (user.location ? 'Other' : '');
      if (editForm.location_select === 'Other') editForm.location_custom = user.location;
    } else {
      // no profile
      editForm.is_helper = user.is_helper;
      editForm.helper_title = userData.helper_title || '';
      editForm.helper_description = userData.helper_bio || '';
      editForm.helper_skills = user.skills.map(s => ({ name: s.name || s, level: s.level || 'Beginner', jobs: s.jobs || 0 }));
      editForm.experience = [];
      editForm.location_select = user.location && locationOptions.includes(user.location) ? user.location : (user.location ? 'Other' : '');
      if (editForm.location_select === 'Other') editForm.location_custom = user.location;
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
      } catch (e) {
        console.warn('Could not fetch helper stats RPC', e);
      }
    } else {
      user.rating = 0;
      user.reviewCount = 0;
    }

    // load reviews, listings, jobs
    await loadUserReviews(uid);
    await loadUserListings(uid);
    await loadCompletedJobs(uid);
  } catch (err) {
    console.error('Error loading profile:', err);
    errorMessage.value = String(err.message || err);
  } finally {
    isLoading.value = false;
  }
}

/* ---------- Reviews / listings / jobs loaders ---------- */
async function loadUserReviews(helperId) {
  try {
    if (!helperId) { user.reviews = []; return; }
    const { data: reviewsData, error } = await supabase
      .from('reviews')
      .select(`id, rating, comment, job_title, created_at, reviewer:users(id, username, avatar_url)`)
      .eq('helper_id', helperId)
      .order('created_at', { ascending: false });
    if (error) { console.warn('reviews fetch error', error); user.reviews = []; return; }
    user.reviews = (reviewsData || []).map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      service: r.job_title,
      date: r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
      author: r.reviewer?.username || 'Anonymous',
      avatar: r.reviewer?.avatar_url || ''
    }));
  } catch (e) {
    console.error('loadUserReviews error', e);
    user.reviews = [];
  }
}

async function loadUserListings(uid) {
  try {
    if (!uid) return;
    const { data, error } = await supabase
      .from('User-Job-Request')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
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
    const { data, error } = await supabase
      .from('User-Job-Request')
      .select('*')
      .eq('user_id', uid)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });
    if (error) { console.warn('completed jobs fetch error', error); completedJobs.value = []; return; }
    completedJobs.value = data || [];
    user.stats.jobsCompleted = completedJobs.value.length;
  } catch (e) {
    console.error('loadCompletedJobs error', e);
    completedJobs.value = [];
  }
}

/* ---------- Edit modal helpers ---------- */
function openEditModal() {
  editForm.username = user.username;
  editForm.bio = user.bio;
  editForm.location = user.location;
  // helper fields already populated by loadAll
  showEditModal.value = true;
}

function closeEditModal() {
  showEditModal.value = false;
}

function addHelperSkill() {
  editForm.helper_skills.push({ name: '', level: 'Beginner', jobs: 0 });
}
function removeHelperSkill(i) {
  editForm.helper_skills.splice(i, 1);
}
function addExperience() {
  editForm.experience.push('');
}
function removeExperience(i) {
  editForm.experience.splice(i, 1);
}

/* ---------- Save profile & helper profile upsert ---------- */
async function saveProfile() {
  try {
    const uid = user.id || await getCurrentUserId();
    if (!uid) throw new Error('Missing user id');

    // Validate username
    if (!editForm.username || !editForm.username.trim()) {
      alert('Username is required');
      return;
    }

    // Determine user-level location value
    let finalLocation = '';
    if (editForm.location_select === 'Other') {
      finalLocation = (editForm.location_custom || '').trim();
    } else {
      finalLocation = editForm.location_select || '';
    }

    // helper location final value
    let finalHelperLocation = '';
    if (editForm.helper_location === 'Other') {
      finalHelperLocation = (editForm.helper_location_custom || '').trim();
    } else {
      finalHelperLocation = editForm.helper_location || '';
    }

    // Determine availability string (we store as "DAY • TIME")
    let dayPart = editForm.availability_day === 'Custom' ? (editForm.availability_day_custom || '') : (editForm.availability_day || '');
    let timePart = editForm.availability_time === 'Custom' ? (editForm.availability_time_custom || '') : (editForm.availability_time || '');
    const availabilityParts = [];
    if (dayPart && String(dayPart).trim()) availabilityParts.push(String(dayPart).trim());
    if (timePart && String(timePart).trim()) availabilityParts.push(String(timePart).trim());
    const availabilityCombined = availabilityParts.join(' • ');

    // Prepare payload for users table
    const updatePayload = {
      username: editForm.username,
      bio: editForm.bio || null,
      location: finalLocation || null,
      is_helper: !!editForm.is_helper,
      helper_title: editForm.helper_title || null,
      helper_bio: editForm.helper_bio || null,
      updated_at: new Date().toISOString()
    };

    // Update users row
    const { error: uErr } = await supabase.from('users').update(updatePayload).eq('id', uid);
    if (uErr) throw uErr;

    // Upsert helper_profiles if is_helper true
    if (editForm.is_helper) {
      const helperPayload = {
        user_id: uid,
        title: editForm.helper_title || editForm.username,
        description: editForm.helper_description || editForm.helper_bio || null,
        skills: editForm.helper_skills.map(s => ({ name: s.name, level: s.level, jobs: s.jobs || 0 })),
        availability: availabilityCombined || null,
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
      // If toggled off, mark helper_profiles as inactive (non-fatal)
      const { error: disableErr } = await supabase.from('helper_profiles').update({ is_active: false }).eq('user_id', uid);
      if (disableErr) console.warn('Could not disable helper profile', disableErr);
    }

    // Refresh UI state
    await loadAll();
    closeEditModal();
    alert('Profile updated successfully!');
  } catch (err) {
    console.error('saveProfile error', err);
    alert('Failed to save profile: ' + (err.message || err));
  }
}

/* ---------- lifecycle ---------- */
onMounted(() => {
  loadAll();
});
</script>

<style scoped>
/* Keep your existing styles and add helper button + form styles */
.container { max-width:1200px; margin:0 auto; padding:2rem 1rem; }
.loading-container, .not-logged-in, .error-banner { text-align:center; padding:2rem; }
.spinner { width:48px; height:48px; border:4px solid #eee; border-top-color:#6C5B7F; border-radius:50%; animation:spin .8s linear infinite; margin:0 auto 1rem; }
@keyframes spin { to { transform:rotate(360deg); } }

.profile-header { background:#fff; padding:1.25rem; border-radius:8px; margin-bottom:1rem; box-shadow:0 1px 4px rgba(0,0,0,.05); }
.profile-content { display:flex; gap:1rem; align-items:flex-start; }
.avatar-container { width:96px; height:96px; border-radius:50%; overflow:hidden; background:#f3f4f6; display:flex; align-items:center; justify-content:center; }
.avatar { width:100%; height:100%; object-fit:cover; }
.avatar-placeholder { font-size:2.5rem; color:#9ca3af; }
.profile-info { flex:1; }
.profile-top { display:flex; justify-content:space-between; align-items:flex-start; }
.profile-name { font-size:1.75rem; margin:0; }
.contact-info { display:flex; gap:1rem; color:#6b7280; margin:0.5rem 0; }
.btn-edit { padding:.5rem .75rem; border-radius:6px; border:1px solid #ddd; background:white; cursor:pointer; }

.stats-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:1rem; margin-bottom:1rem; }
.stat-card { background:#fff; padding:1rem; border-radius:8px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,.04); }
.stat-number { font-weight:700; font-size:1.25rem; margin:0; }
.tab-button { padding:.5rem 1rem; border:none; background:transparent; cursor:pointer; }
.tab-button.active { border-bottom:2px solid #6C5B7F; color:#6C5B7F; }

/* Modal */
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); display:flex; align-items:center; justify-content:center; z-index:50; }
.modal-content { width:720px; max-width:95%; background:#fff; border-radius:8px; overflow:auto; }
.modal-header { display:flex; justify-content:space-between; padding:1rem; border-bottom:1px solid #eee; }
.modal-body { padding:1rem; display:flex; flex-direction:column; gap:1rem; max-height:70vh; overflow:auto; }
.modal-footer { padding:1rem; display:flex; justify-content:flex-end; gap:.5rem; border-top:1px solid #eee; }
.close-btn { background:none;border:none;font-size:1.25rem; cursor:pointer; }

/* forms */
.form-row { display:flex; flex-direction:column; gap:.5rem; }
.form-row input[type="text"], .form-row textarea, .form-row select { padding:.5rem .75rem; border:1px solid #d1d5db; border-radius:6px; width:100%; }
.helper-toggle-row { display:flex; justify-content:space-between; align-items:center; gap:1rem; }
.helper-toggle-label { font-weight:600; }
.helper-toggle-btn { padding:.5rem 1rem; border-radius:999px; border:1px solid #d1d5db; background:#fff; cursor:pointer; }
.helper-toggle-btn.active { background:#6C5B7F; color:#fff; border-color:#6C5B7F; }

.helper-form-section { background:#fafafa; padding:1rem; border-radius:6px; border:1px solid #f0f0f0; }

/* skills editor */
.skills-editor-list { display:flex; flex-direction:column; gap:.5rem; }
.skill-editor-item { display:flex; gap:.5rem; align-items:center; }
.skill-editor-item input[type="text"] { flex:1; }
.small-input { width:70px; padding:.4rem; border:1px solid #d1d5db; border-radius:6px; }
.btn-remove-skill { background:#fee2e2; border:1px solid #fca5a5; padding:.25rem .5rem; border-radius:6px; cursor:pointer; }
.btn-add-skill { background:#fff; border:1px dashed #d1d5db; padding:.4rem .6rem; border-radius:6px; cursor:pointer; }

/* experience editor */
.experience-editor-row { display:flex; gap:.5rem; align-items:center; }

/* hints */
.hint { font-size:0.85rem; color:#6b7280; margin-top:0.25rem; }

/* small utilities */
.btn-cancel, .btn-save { padding:.5rem .75rem; border-radius:6px; cursor:pointer; }
.btn-save { background:#2563eb; color:#fff; border:none; }
.btn-cancel { background:#fff; border:1px solid #d1d5db; }

/* review / job / listing small styles kept minimal */
.skill-card { border:1px solid #eee; padding:.75rem; border-radius:8px; margin-bottom:.5rem; }
.review-card { border-bottom:1px solid #eee; padding:.75rem 0; }
.job-card, .listing-card { border:1px solid #eee; padding:.75rem; border-radius:8px; margin-bottom:.5rem; }
.status-badge { background:#d1fae5; color:#065f46; padding:.25rem .5rem; border-radius:9999px; font-weight:600; }

/* Keep your existing styles and add helper button + form styles */
.container { max-width:1200px; margin:0 auto; padding:2rem 1rem; }
.loading-container, .not-logged-in, .error-banner { text-align:center; padding:2rem; }
.spinner { width:48px; height:48px; border:4px solid #eee; border-top-color:#6C5B7F; border-radius:50%; animation:spin .8s linear infinite; margin:0 auto 1rem; }
@keyframes spin { to { transform:rotate(360deg); } }

.profile-header { background:#fff; padding:1.25rem; border-radius:8px; margin-bottom:1rem; box-shadow:0 1px 4px rgba(0,0,0,.05); }
.profile-content { display:flex; gap:1rem; align-items:flex-start; }
.avatar-container { width:96px; height:96px; border-radius:50%; overflow:hidden; background:#f3f4f6; display:flex; align-items:center; justify-content:center; }
.avatar { width:100%; height:100%; object-fit:cover; }
.avatar-placeholder { font-size:2.5rem; color:#9ca3af; }
.profile-info { flex:1; }
.profile-top { display:flex; justify-content:space-between; align-items:flex-start; }
.profile-name { font-size:1.75rem; margin:0; }
.contact-info { display:flex; gap:1rem; color:#6b7280; margin:0.5rem 0; }
.btn-edit { padding:.5rem .75rem; border-radius:6px; border:1px solid #ddd; background:white; cursor:pointer; }

.stats-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:1rem; margin-bottom:1rem; }
.stat-card { background:#fff; padding:1rem; border-radius:8px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,.04); }
.stat-number { font-weight:700; font-size:1.25rem; margin:0; }
.tab-button { padding:.5rem 1rem; border:none; background:transparent; cursor:pointer; }
.tab-button.active { border-bottom:2px solid #6C5B7F; color:#6C5B7F; }

/* Modal */
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); display:flex; align-items:center; justify-content:center; z-index:50; }
.modal-content { width:720px; max-width:95%; background:#fff; border-radius:8px; overflow:auto; }
.modal-header { display:flex; justify-content:space-between; padding:1rem; border-bottom:1px solid #eee; }
.modal-body { padding:1rem; display:flex; flex-direction:column; gap:1rem; max-height:70vh; overflow:auto; }
.modal-footer { padding:1rem; display:flex; justify-content:flex-end; gap:.5rem; border-top:1px solid #eee; }
.close-btn { background:none;border:none;font-size:1.25rem; cursor:pointer; }

/* forms */
.form-row { display:flex; flex-direction:column; gap:.5rem; }
.form-row input[type="text"], .form-row textarea, .form-row select { padding:.5rem .75rem; border:1px solid #d1d5db; border-radius:6px; width:100%; }
.helper-toggle-row { display:flex; justify-content:space-between; align-items:center; gap:1rem; }
.helper-toggle-label { font-weight:600; }
.helper-toggle-btn { padding:.5rem 1rem; border-radius:999px; border:1px solid #d1d5db; background:#fff; cursor:pointer; }
.helper-toggle-btn.active { background:#6C5B7F; color:#fff; border-color:#6C5B7F; }

.helper-form-section { background:#fafafa; padding:1rem; border-radius:6px; border:1px solid #f0f0f0; }

/* skills editor */
.skills-editor-list { display:flex; flex-direction:column; gap:.5rem; }
.skill-editor-item { display:flex; gap:.5rem; align-items:center; }
.skill-editor-item input[type="text"] { flex:1; }
.small-input { width:70px; padding:.4rem; border:1px solid #d1d5db; border-radius:6px; }
.btn-remove-skill { background:#fee2e2; border:1px solid #fca5a5; padding:.25rem .5rem; border-radius:6px; cursor:pointer; }
.btn-add-skill { background:#fff; border:1px dashed #d1d5db; padding:.4rem .6rem; border-radius:6px; cursor:pointer; }

/* experience editor */
.experience-editor-row { display:flex; gap:.5rem; align-items:center; }

/* hints */
.hint { font-size:0.85rem; color:#6b7280; margin-top:0.25rem; }

/* small utilities */
.btn-cancel, .btn-save { padding:.5rem .75rem; border-radius:6px; cursor:pointer; }
.btn-save { background:#2563eb; color:#fff; border:none; }
.btn-cancel { background:#fff; border:1px solid #d1d5db; }

/* review / job / listing small styles kept minimal */
.skill-card { border:1px solid #eee; padding:.75rem; border-radius:8px; margin-bottom:.5rem; }
.review-card { border-bottom:1px solid #eee; padding:.75rem 0; }
.job-card, .listing-card { border:1px solid #eee; padding:.75rem; border-radius:8px; margin-bottom:.5rem; }
.status-badge { background:#d1fae5; color:#065f46; padding:.25rem .5rem; border-radius:9999px; font-weight:600; }

/* Keep your existing styles and add helper button + form styles */
.container { max-width:1200px; margin:0 auto; padding:2rem 1rem; }
.loading-container, .not-logged-in, .error-banner { text-align:center; padding:2rem; }
.spinner { width:48px; height:48px; border:4px solid #eee; border-top-color:#6C5B7F; border-radius:50%; animation:spin .8s linear infinite; margin:0 auto 1rem; }
@keyframes spin { to { transform:rotate(360deg); } }

.profile-header { background:#fff; padding:1.25rem; border-radius:8px; margin-bottom:1rem; box-shadow:0 1px 4px rgba(0,0,0,.05); }
.profile-content { display:flex; gap:1rem; align-items:flex-start; }
.avatar-container { width:96px; height:96px; border-radius:50%; overflow:hidden; background:#f3f4f6; display:flex; align-items:center; justify-content:center; }
.avatar { width:100%; height:100%; object-fit:cover; }
.avatar-placeholder { font-size:2.5rem; color:#9ca3af; }
.profile-info { flex:1; }
.profile-top { display:flex; justify-content:space-between; align-items:flex-start; }
.profile-name { font-size:1.75rem; margin:0; }
.contact-info { display:flex; gap:1rem; color:#6b7280; margin:0.5rem 0; }
.btn-edit { padding:.5rem .75rem; border-radius:6px; border:1px solid #ddd; background:white; cursor:pointer; }

.stats-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:1rem; margin-bottom:1rem; }
.stat-card { background:#fff; padding:1rem; border-radius:8px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,.04); }
.stat-number { font-weight:700; font-size:1.25rem; margin:0; }
.tab-button { padding:.5rem 1rem; border:none; background:transparent; cursor:pointer; }
.tab-button.active { border-bottom:2px solid #6C5B7F; color:#6C5B7F; }

/* Modal */
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); display:flex; align-items:center; justify-content:center; z-index:50; }
.modal-content { width:720px; max-width:95%; background:#fff; border-radius:8px; overflow:auto; }
.modal-header { display:flex; justify-content:space-between; padding:1rem; border-bottom:1px solid #eee; }
.modal-body { padding:1rem; display:flex; flex-direction:column; gap:1rem; max-height:70vh; overflow:auto; }
.modal-footer { padding:1rem; display:flex; justify-content:flex-end; gap:.5rem; border-top:1px solid #eee; }
.close-btn { background:none;border:none;font-size:1.25rem; cursor:pointer; }

/* forms */
.form-row { display:flex; flex-direction:column; gap:.5rem; }
.form-row input[type="text"], .form-row textarea, .form-row select { padding:.5rem .75rem; border:1px solid #d1d5db; border-radius:6px; width:100%; }
.helper-toggle-row { display:flex; justify-content:space-between; align-items:center; gap:1rem; }
.helper-toggle-label { font-weight:600; }
.helper-toggle-btn { padding:.5rem 1rem; border-radius:999px; border:1px solid #d1d5db; background:#fff; cursor:pointer; }
.helper-toggle-btn.active { background:#6C5B7F; color:#fff; border-color:#6C5B7F; }

.helper-form-section { background:#fafafa; padding:1rem; border-radius:6px; border:1px solid #f0f0f0; }

/* skills editor */
.skills-editor-list { display:flex; flex-direction:column; gap:.5rem; }
.skill-editor-item { display:flex; gap:.5rem; align-items:center; }
.skill-editor-item input[type="text"] { flex:1; }
.small-input { width:70px; padding:.4rem; border:1px solid #d1d5db; border-radius:6px; }
.btn-remove-skill { background:#fee2e2; border:1px solid #fca5a5; padding:.25rem .5rem; border-radius:6px; cursor:pointer; }
.btn-add-skill { background:#fff; border:1px dashed #d1d5db; padding:.4rem .6rem; border-radius:6px; cursor:pointer; }

/* experience editor */
.experience-editor-row { display:flex; gap:.5rem; align-items:center; }

/* hints */
.hint { font-size:0.85rem; color:#6b7280; margin-top:0.25rem; }

/* small utilities */
.btn-cancel, .btn-save { padding:.5rem .75rem; border-radius:6px; cursor:pointer; }
.btn-save { background:#2563eb; color:#fff; border:none; }
.btn-cancel { background:#fff; border:1px solid #d1d5db; }

/* review / job / listing small styles kept minimal */
.skill-card { border:1px solid #eee; padding:.75rem; border-radius:8px; margin-bottom:.5rem; }
.review-card { border-bottom:1px solid #eee; padding:.75rem 0; }
.job-card, .listing-card { border:1px solid #eee; padding:.75rem; border-radius:8px; margin-bottom:.5rem; }
.status-badge { background:#d1fae5; color:#065f46; padding:.25rem .5rem; border-radius:9999px; font-weight:600; }

/* Minimal styles so the page renders; you can merge with your existing styles */
.container { max-width:1200px; margin:0 auto; padding:2rem 1rem; }
.loading-container, .not-logged-in, .error-banner { text-align:center; padding:2rem; }
.spinner { width:48px; height:48px; border:4px solid #eee; border-top-color:#6C5B7F; border-radius:50%; animation:spin .8s linear infinite; margin:0 auto 1rem; }
@keyframes spin { to { transform:rotate(360deg); } }

.profile-header { background:#fff; padding:1.25rem; border-radius:8px; margin-bottom:1rem; box-shadow:0 1px 4px rgba(0,0,0,.05); }
.profile-content { display:flex; gap:1rem; align-items:flex-start; }
.avatar-container { width:96px; height:96px; border-radius:50%; overflow:hidden; background:#f3f4f6; display:flex; align-items:center; justify-content:center; }
.avatar { width:100%; height:100%; object-fit:cover; }
.avatar-placeholder { font-size:2.5rem; color:#9ca3af; }
.profile-info { flex:1; }
.profile-top { display:flex; justify-content:space-between; align-items:flex-start; }
.profile-name { font-size:1.75rem; margin:0; }
.contact-info { display:flex; gap:1rem; color:#6b7280; margin:0.5rem 0; }
.btn-edit { padding:.5rem .75rem; border-radius:6px; border:1px solid #ddd; background:white; cursor:pointer; }

.stats-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:1rem; margin-bottom:1rem; }
.stat-card { background:#fff; padding:1rem; border-radius:8px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,.04); }
.stat-number { font-weight:700; font-size:1.25rem; margin:0; }
.tab-button { padding:.5rem 1rem; border:none; background:transparent; cursor:pointer; }
.tab-button.active { border-bottom:2px solid #6C5B7F; color:#6C5B7F; }

.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); display:flex; align-items:center; justify-content:center; z-index:50; }
.modal-content { width:720px; max-width:95%; background:#fff; border-radius:8px; overflow:auto; }
.modal-header { display:flex; justify-content:space-between; padding:1rem; border-bottom:1px solid #eee; }
.modal-body { padding:1rem; }
.modal-footer { padding:1rem; display:flex; justify-content:flex-end; gap:.5rem; border-top:1px solid #eee; }
.close-btn { background:none;border:none;font-size:1.25rem; cursor:pointer; }

.skill-card { border:1px solid #eee; padding:.75rem; border-radius:8px; margin-bottom:.5rem; }
.review-card { border-bottom:1px solid #eee; padding:.75rem 0; }
.job-card, .listing-card { border:1px solid #eee; padding:.75rem; border-radius:8px; margin-bottom:.5rem; }
.status-badge { background:#d1fae5; color:#065f46; padding:.25rem .5rem; border-radius:9999px; font-weight:600; }

.error-banner { background:#fee2e2; color:#7f1d1d; border:1px solid #fca5a5; border-radius:8px; }
.btn-retry { margin-top:.5rem; padding:.4rem .75rem; background:#fff; border:1px solid #ddd; cursor:pointer; }

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

/* Skills Editor Styles */
.form-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.btn-add-skill {
  padding: 0.5rem 1rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-add-skill:hover {
  background: #1d4ed8;
}

.empty-skills-message {
  padding: 2rem;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 0.375rem;
  text-align: center;
}

.empty-skills-message p {
  color: #6b7280;
  font-size: 0.875rem;
}

.skills-editor-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.skill-editor-item {
  display: flex;
  gap: 0.5rem;
  align-items: start;
  padding: 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
}

.skill-inputs {
  flex: 1;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.skill-input-group {
  flex: 1;
  min-width: 200px;
}

.skill-name-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.skill-name-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.skill-level-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background: white;
}

.skill-level-select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.btn-remove-skill {
  padding: 0.25rem;
  background: none;
  border: none;
  color: #dc2626;
  font-size: 1.5rem;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  transition: background 0.2s;
  flex-shrink: 0;
}

.btn-remove-skill:hover {
  background: #fee2e2;
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

  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .skill-inputs {
    flex-direction: column;
  }

  .skill-input-group {
    min-width: 100%;
  }
}


/* Mark as Completed button styling */
.btn-action-complete {
  background: #059669;
  color: white;
}

.btn-action-complete:hover {
  background: #047857;
}

.job-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
  line-height: 1.5;
}

.status-completed {
  background: #d1fae5;
  color: #065f46;
}

</style>