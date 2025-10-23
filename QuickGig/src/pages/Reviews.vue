<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { supabase } from '../supabase/config';

const props = defineProps({
  helperId: {
    type: String,
    required: true
  },
  showForm: {
    type: Boolean,
    default: true
  }
});

const reviews = ref([]);
const isLoading = ref(true);
const showReviewForm = ref(false);
const currentUserId = ref(null);
const canReview = ref(false); // whether current user is allowed to review (has completed job)
const checkingPermission = ref(false);

const reviewForm = ref({
  rating: 5,
  comment: '',
  jobTitle: '',
  job_id: null // optional: if you later enforce per-job reviews
});

const errors = ref({
  rating: '',
  comment: ''
});

const fetchReviews = async () => {
  try {
    isLoading.value = true;
    const { data: reviewsData, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        job_title,
        created_at,
        reviewer:users ( id, username, avatar_url )
      `)
      .eq('helper_id', props.helperId)
      .order('created_at', { ascending: false });

    if (reviewsError) throw reviewsError;

    reviews.value = (reviewsData || []).map(review => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      jobTitle: review.job_title,
      createdAt: review.created_at
        ? new Date(review.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        : '',
      reviewer: {
        id: review.reviewer?.id || '',
        name: review.reviewer?.username || 'Anonymous',
        avatar: review.reviewer?.avatar_url || ''
      }
    }));
  } catch (error) {
    console.error('Error fetching reviews:', error);
    reviews.value = [];
  } finally {
    isLoading.value = false;
  }
};

const averageRating = computed(() => {
  if (!reviews.value || reviews.value.length === 0) return 0;
  const total = reviews.value.reduce((sum, r) => sum + (r.rating || 0), 0);
  return Math.round((total / reviews.value.length) * 10) / 10;
});

const renderStars = (rating) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  return '⭐'.repeat(fullStars) + (hasHalfStar ? '⭐' : '');
};

// Check whether the current signed-in user has a completed job with the helper.
// Returns true if a job_completions row exists with helper_id=helperId, client_id=currentUserId, status='completed'
async function checkCanReview() {
  checkingPermission.value = true;
  canReview.value = false;

  try {
    // get current session user
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.warn('Unable to get session', sessionError);
      checkingPermission.value = false;
      currentUserId.value = null;
      return false;
    }
    const user = sessionData?.session?.user;
    if (!user || !user.id) {
      currentUserId.value = null;
      checkingPermission.value = false;
      return false;
    }
    currentUserId.value = user.id;

    // Query job_completions for a completed link
    const { data, error } = await supabase
      .from('job_completions')
      .select('id')
      .eq('helper_id', props.helperId)
      .eq('client_id', user.id)
      .eq('status', 'completed')
      .limit(1);

    if (error) {
      // Possible permission/RLS issue; treat as not allowed (fail-safe)
      console.error('Error checking job_completions for review permission:', error);
      canReview.value = false;
      checkingPermission.value = false;
      return false;
    }

    canReview.value = Array.isArray(data) && data.length > 0;
    checkingPermission.value = false;
    return canReview.value;
  } catch (err) {
    console.error('Unexpected error in checkCanReview:', err);
    checkingPermission.value = false;
    canReview.value = false;
    return false;
  }
}

const submitReview = async () => {
  errors.value = { rating: '', comment: '' };

  if (!reviewForm.value.rating || reviewForm.value.rating < 1 || reviewForm.value.rating > 5) {
    errors.value.rating = 'Please select a rating between 1 and 5';
    return;
  }
  if (!reviewForm.value.comment || !reviewForm.value.comment.trim()) {
    errors.value.comment = 'Please write a review';
    return;
  }

  try {
    // ensure user is signed in
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      alert('You must be logged in to leave a review');
      return;
    }
    const user = sessionData?.session?.user;
    if (!user || !user.id) {
      alert('You must be logged in to leave a review');
      return;
    }

    // final server-side check: attempt a quick permission check (optional)
    const allowed = await checkCanReview();
    if (!allowed) {
      alert('You can only leave a review after you have completed a job with this helper.');
      return;
    }

    const payload = {
      helper_id: props.helperId,
      reviewer_id: user.id,
      rating: reviewForm.value.rating,
      comment: reviewForm.value.comment,
      job_title: reviewForm.value.jobTitle || null,
      job_id: reviewForm.value.job_id || null
    };

    // Use upsert so the same reviewer can update their review rather than failing unique constraint
    const { data: upserted, error: upsertError } = await supabase
      .from('reviews')
      .upsert(payload, { onConflict: ['helper_id', 'reviewer_id'], returning: 'representation' });

    if (upsertError) {
      console.error('Error upserting review:', upsertError);
      if (upsertError.message && upsertError.message.toLowerCase().includes('permission')) {
        alert('Permission denied. You can only review after completing a job with this helper.');
      } else {
        alert('Failed to submit review. Please try again.');
      }
      return;
    }

    // success
    reviewForm.value = { rating: 5, comment: '', jobTitle: '', job_id: null };
    showReviewForm.value = false;
    await fetchReviews();
    alert('Review submitted successfully!');
  } catch (error) {
    console.error('Error submitting review:', error);
    alert('Failed to submit review. Please try again.');
  }
};

// keep currentUserId in sync
async function loadCurrentUser() {
  const { data: sessionData } = await supabase.auth.getSession();
  currentUserId.value = sessionData?.session?.user?.id || null;
  // check permission once we know the user
  await checkCanReview();
}

// watch for helperId changes and refresh both reviews and permission
watch(() => props.helperId, async () => {
  await fetchReviews();
  await checkCanReview();
});

// refresh on mount
onMounted(async () => {
  await loadCurrentUser();
  await fetchReviews();
});

// listen for auth changes so canReview updates when user signs in/out
supabase.auth.onAuthStateChange(async (_event, session) => {
  currentUserId.value = session?.user?.id || null;
  await checkCanReview();
});
</script>

<template>
  <div class="reviews-container">
    <div class="reviews-header">
      <div class="rating-summary">
        <div class="avg-rating">
          <span class="rating-number">{{ averageRating }}</span>
          <div class="stars-large">{{ renderStars(averageRating) }}</div>
        </div>
        <p class="review-count">{{ reviews.length }} {{ reviews.length === 1 ? 'review' : 'reviews' }}</p>
      </div>

      <!-- Show write-review button only if form allowed and user is not the helper and permission check passed -->
      <button
        v-if="showForm && currentUserId && currentUserId !== helperId"
        @click="showReviewForm = !showReviewForm"
        class="btn-add-review"
        :disabled="checkingPermission || !canReview"
        :title="(!canReview && !checkingPermission) ? 'You can only review after completing a job with this helper' : ''"
      >
        {{ showReviewForm ? 'Cancel' : '+ Write a Review' }}
      </button>
    </div>

    <!-- If user cannot review, show explanatory message -->
    <div v-if="!checkingPermission && !canReview && currentUserId && currentUserId !== helperId" class="cannot-review-message">
      <p>You can only leave a review after you've completed a job with this helper.</p>
    </div>

    <!-- Review Form -->
    <div v-if="showReviewForm" class="review-form">
      <h3 class="form-title">Share Your Experience</h3>

      <div class="form-group">
        <label>Rating *</label>
        <div class="rating-input">
          <button
            v-for="star in 5"
            :key="star"
            @click="reviewForm.rating = star"
            :class="['star-btn', { active: star <= reviewForm.rating }]"
            type="button"
          >
            ⭐
          </button>
        </div>
        <p v-if="errors.rating" class="error-text">{{ errors.rating }}</p>
      </div>

      <div class="form-group">
        <label>Job/Service (Optional)</label>
        <input
          v-model="reviewForm.jobTitle"
          type="text"
          placeholder="e.g., House Cleaning, Dog Walking"
          class="form-input"
        />
      </div>

      <div class="form-group">
        <label>Your Review *</label>
        <textarea
          v-model="reviewForm.comment"
          rows="4"
          placeholder="Tell others about your experience..."
          class="form-textarea"
          :class="{ 'input-error': errors.comment }"
        ></textarea>
        <p v-if="errors.comment" class="error-text">{{ errors.comment }}</p>
      </div>

      <div class="form-actions">
        <button @click="showReviewForm = false" class="btn-cancel">Cancel</button>
        <button @click="submitReview" class="btn-submit">Submit Review</button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading reviews...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="reviews.length === 0" class="empty-state">
      <div class="empty-icon">⭐</div>
      <p class="empty-title">No reviews yet</p>
      <p class="empty-text">Be the first to leave a review!</p>
    </div>

    <!-- Reviews List -->
    <div v-else class="reviews-list">
      <div v-for="review in reviews" :key="review.id" class="review-card">
        <div class="review-header">
          <div class="reviewer-info">
            <div class="reviewer-avatar">
              <img v-if="review.reviewer.avatar" :src="review.reviewer.avatar" :alt="review.reviewer.name" />
              <div v-else class="avatar-placeholder">
                {{ review.reviewer.name.charAt(0).toUpperCase() }}
              </div>
            </div>
            <div>
              <p class="reviewer-name">{{ review.reviewer.name }}</p>
              <p class="review-date">{{ review.createdAt }}</p>
            </div>
          </div>
          <div class="review-rating">
            {{ renderStars(review.rating) }}
            <span class="rating-number-small">{{ review.rating }}</span>
          </div>
        </div>

        <div v-if="review.jobTitle" class="job-badge">
          {{ review.jobTitle }}
        </div>

        <p class="review-comment">{{ review.comment }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reviews-container { width: 100%; }
.reviews-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; gap:1rem; flex-wrap:wrap; }
.rating-summary { display:flex; align-items:center; gap:1rem; }
.avg-rating { display:flex; flex-direction:column; align-items:center; }
.rating-number { font-size:2rem; font-weight:700; }
.stars-large { font-size:1.25rem; }
.review-count { color:#6b7280; }
.btn-add-review { padding:.6rem 1rem; background:#6C5B7F; color:white; border:none; border-radius:6px; cursor:pointer; }
.btn-add-review[disabled] { opacity:.6; cursor:not-allowed; }
.cannot-review-message { padding:.5rem 1rem; background:#fff4f4; border:1px solid #f8d7da; border-radius:6px; color:#7f1d1d; margin-bottom:1rem; }

.review-form { background:#f9fafb; border:1px solid #e5e7eb; border-radius:0.75rem; padding:1rem; margin-bottom:1rem; }
.form-title { margin:0 0 .75rem 0; font-weight:600; }

.rating-input { display:flex; gap:.5rem; }
.star-btn { background:none; border:none; font-size:1.5rem; opacity:.45; cursor:pointer; padding:0; }
.star-btn.active, .star-btn:hover { opacity:1; transform:scale(1.05); }

.form-group { margin-bottom:.75rem; display:flex; flex-direction:column; gap:.5rem; }
.form-input, .form-textarea { padding:.5rem; border:1px solid #d1d5db; border-radius:6px; width:100%; }
.input-error { border-color:#ef4444; }
.error-text { color:#ef4444; font-size:.9rem; }

.form-actions { display:flex; gap:.5rem; justify-content:flex-end; margin-top:.5rem; }
.btn-cancel { padding:.5rem .75rem; border:1px solid #d1d5db; background:white; border-radius:6px; cursor:pointer; }
.btn-submit { padding:.5rem .75rem; background:#2563eb; color:white; border:none; border-radius:6px; cursor:pointer; }

.loading-state, .empty-state { text-align:center; padding:1rem; color:#6b7280; }
.spinner { width:36px; height:36px; border:3px solid #e5e7eb; border-top-color:#6C5B7F; border-radius:50%; animation:spin 1s linear infinite; margin:0 auto .75rem; }
@keyframes spin { to { transform:rotate(360deg); } }

.reviews-list { display:flex; flex-direction:column; gap:1rem; }
.review-card { background:white; border:1px solid #e5e7eb; border-radius:8px; padding:1rem; }
.review-header { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; margin-bottom:.5rem; }
.reviewer-info { display:flex; gap:.75rem; align-items:center; }
.reviewer-avatar { width:40px; height:40px; border-radius:50%; overflow:hidden; background:#f3f4f6; display:flex; align-items:center; justify-content:center; }
.reviewer-avatar img { width:100%; height:100%; object-fit:cover; }
.avatar-placeholder { color:#9ca3af; font-weight:700; }
.reviewer-name { font-weight:600; margin:0; }
.review-date { font-size:.9rem; color:#6b7280; margin:0; }
.review-rating { font-size:1.1rem; }
.job-badge { display:inline-block; padding:.25rem .5rem; background:#E8E3ED; border-radius:9999px; color:#4A3F5C; margin-bottom:.5rem; }
.review-comment { color:#374151; margin:0; }

.rating-number-small { margin-left:.5rem; color:#6b7280; font-weight:600; }
</style>