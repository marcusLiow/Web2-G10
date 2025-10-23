<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { supabase } from '../supabase/config';

const props = defineProps({
  helperId: {
    type: String,
    required: true
  },
  // If you want to hide the "Write a Review" button externally
  showForm: {
    type: Boolean,
    default: true
  }
});

const reviews = ref([]);
const isLoading = ref(true);
const showReviewForm = ref(false);
const currentUserId = ref(null);

const reviewForm = ref({
  rating: 5,
  comment: '',
  jobTitle: ''
});

const errors = ref({
  rating: '',
  comment: ''
});

// Fetch reviews for this helper
const fetchReviews = async () => {
  try {
    isLoading.value = true;

    // Select reviews and include reviewer basic info (username, avatar_url)
    // Use explicit relationship alias; Supabase will resolve if FK exists
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

// Calculate average rating
const averageRating = computed(() => {
  if (!reviews.value || reviews.value.length === 0) return 0;
  const total = reviews.value.reduce((sum, review) => sum + (review.rating || 0), 0);
  return Math.round((total / reviews.value.length) * 10) / 10;
});

// Render stars
const renderStars = (rating) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  return '⭐'.repeat(fullStars) + (hasHalfStar ? '⭐' : '');
};

// Submit or update review
const submitReview = async () => {
  // Reset errors
  errors.value = { rating: '', comment: '' };

  // Validate
  if (!reviewForm.value.rating || reviewForm.value.rating < 1 || reviewForm.value.rating > 5) {
    errors.value.rating = 'Please select a rating between 1 and 5';
    return;
  }
  if (!reviewForm.value.comment.trim()) {
    errors.value.comment = 'Please write a review';
    return;
  }

  try {
    // Get authenticated user from Supabase (preferred to localStorage)
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting user:', userError);
      alert('You must be logged in to leave a review');
      return;
    }
    const user = userData?.user;
    if (!user || !user.id) {
      alert('You must be logged in to leave a review');
      return;
    }

    const payload = {
      helper_id: props.helperId,
      reviewer_id: user.id,
      rating: reviewForm.value.rating,
      comment: reviewForm.value.comment,
      job_title: reviewForm.value.jobTitle || null
    };

    // The reviews table has UNIQUE(helper_id, reviewer_id).
    // Use upsert so the user can update their review instead of INSERT failing.
    const { data: upserted, error: upsertError } = await supabase
      .from('reviews')
      .upsert(payload, { onConflict: ['helper_id', 'reviewer_id'], returning: 'representation' });

    if (upsertError) throw upsertError;

    // Reset form and refresh reviews
    reviewForm.value = { rating: 5, comment: '', jobTitle: '' };
    showReviewForm.value = false;
    await fetchReviews();

    alert('Review submitted successfully!');
  } catch (error) {
    console.error('Error submitting review:', error);
    // Show user-friendly message for common errors
    if (error?.message && error.message.includes('permission')) {
      alert('Permission denied. Make sure you are logged in.');
    } else {
      alert('Failed to submit review. Please try again.');
    }
  }
};

// Keep currentUserId in sync with supabase auth state
const loadCurrentUser = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  currentUserId.value = sessionData?.session?.user?.id || null;
};

// Watch for auth changes (user sign-in / sign-out)
supabase.auth.onAuthStateChange((_event, session) => {
  currentUserId.value = session?.user?.id || null;
});

// If helperId prop changes, refetch reviews
watch(() => props.helperId, () => {
  fetchReviews();
});

onMounted(async () => {
  await loadCurrentUser();
  fetchReviews();
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

      <button
        v-if="showForm && currentUserId && currentUserId !== helperId"
        @click="showReviewForm = !showReviewForm"
        class="btn-add-review"
      >
        {{ showReviewForm ? 'Cancel' : '+ Write a Review' }}
      </button>
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

    <!-- Reviews List -->
    <div v-else-if="reviews.length === 0" class="empty-state">
      <div class="empty-icon">⭐</div>
      <p class="empty-title">No reviews yet</p>
      <p class="empty-text">Be the first to leave a review!</p>
    </div>

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
.reviews-container {
  width: 100%;
}

.reviews-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.rating-summary {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.avg-rating {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.rating-number {
  font-size: 3rem;
  font-weight: 700;
  color: #111827;
  line-height: 1;
  margin-bottom: 0.5rem;
}

.stars-large {
  font-size: 1.5rem;
  line-height: 1;
}

.review-count {
  color: #6b7280;
  font-size: 0.95rem;
  margin: 0;
}

.btn-add-review {
  padding: 0.75rem 1.5rem;
  background: #6C5B7F;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-review:hover {
  background: #5A4C6B;
  transform: translateY(-1px);
}

/* Review Form */
.review-form {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.form-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 1.5rem 0;
  color: #111827;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.rating-input {
  display: flex;
  gap: 0.5rem;
}

.star-btn {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  opacity: 0.3;
  transition: all 0.2s;
  padding: 0;
}

.star-btn.active,
.star-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.95rem;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #6C5B7F;
  box-shadow: 0 0 0 3px rgba(108, 91, 127, 0.1);
}

.input-error {
  border-color: #ef4444 !important;
}

.error-text {
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn-cancel,
.btn-submit {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: white;
  border: 1px solid #d1d5db;
  color: #374151;
}

.btn-cancel:hover {
  background: #f9fafb;
}

.btn-submit {
  background: #6C5B7F;
  border: none;
  color: white;
}

.btn-submit:hover {
  background: #5A4C6B;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 0;
  color: #6b7280;
}

.spinner {
  width: 2.5rem;
  height: 2.5rem;
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
  padding: 3rem 0;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-title {
  font-size: 1.125rem;
  color: #6b7280;
  margin: 0 0 0.5rem 0;
}

.empty-text {
  color: #9ca3af;
  margin: 0;
}

/* Reviews List */
.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.review-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1.5rem;
  transition: box-shadow 0.2s;
}

.review-card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
}

.reviewer-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.reviewer-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.reviewer-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 1.25rem;
  font-weight: 600;
  color: #6b7280;
}

.reviewer-name {
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.25rem 0;
}

.review-date {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.review-rating {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
}

.rating-number-small {
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
}

.job-badge {
  display: inline-block;
  padding: 0.375rem 0.75rem;
  background: #E8E3ED;
  color: #4A3F5C;
  border-radius: 9999px;
  font-size: 0.8125rem;
  font-weight: 500;
  margin-bottom: 1rem;
}

.review-comment {
  color: #4b5563;
  line-height: 1.6;
  margin: 0;
}

@media (max-width: 640px) {
  .reviews-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .review-header {
    flex-direction: column;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn-cancel,
  .btn-submit {
    width: 100%;
  }
}
</style>