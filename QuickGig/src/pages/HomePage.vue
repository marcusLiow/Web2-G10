<template>
  <div id="app">
    <!-- Title Section -->
    <section class="title-section">
      <div class="container">
        <div class="title-content">
          <div class="title-text">
            <h1 class="main-title">
              Do you need help with<br>
              <div class="word-container">
                <transition name="slide-fade" mode="out-in">
                  <span :key="currentWord" class="changing-word">{{ currentWord }}</span>
                </transition>
              </div>
              Just <span class="request-link" @click="navigateToLogin">request</span>
            </h1>
            <p class="main-description">
              SideQuest connects you with skilled locals in your area who are ready to help with any task. 
              From home repairs to event planning, find the perfect match for your needs.
            </p>
          </div>
          <div class="title-image">
            <img src="@/assets/questcomplete.jpg" alt="Quest Complete" class="hero-image">
          </div>
        </div>
      </div>
    </section>

    <!-- Reviews Section -->
    <section class="reviews-section" ref="reviewsSection">
      <div class="reviews-full-width">
        <h2 class="reviews-title" :class="{ 'fade-in-up': reviewsVisible }">What Our Users Say</h2>
        <p class="reviews-subtitle" :class="{ 'fade-in-up': reviewsVisible }">Join thousands of satisfied users who found the help they needed</p>
        
        <div class="reviews-scroll-container" :class="{ 'fade-in-up': reviewsVisible }">
          <div class="reviews-scroll-track">
            <div 
              v-for="review in allReviews" 
              :key="review.id"
              class="small-review-card"
            >
              <div class="review-avatar">
                <img :src="review.avatar" :alt="review.name" class="avatar-image">
              </div>
              <div class="review-stars-small">
                <span v-for="n in review.rating" :key="n" class="review-star-small">★</span>
              </div>
              <p class="small-review-text">"{{ review.text }}"</p>
              <p class="small-reviewer-name">{{ review.name }}</p>
            </div>
            <!-- Duplicate for seamless loop -->
            <div 
              v-for="review in allReviews" 
              :key="`duplicate-${review.id}`"
              class="small-review-card"
            >
              <div class="review-avatar">
                <img :src="review.avatar" :alt="review.name" class="avatar-image">
              </div>
              <div class="review-stars-small">
                <span v-for="n in review.rating" :key="n" class="review-star-small">★</span>
              </div>
              <p class="small-review-text">"{{ review.text }}"</p>
              <p class="small-reviewer-name">{{ review.name }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section class="how-it-works-section" ref="howItWorksSection">
      <div class="container">
        <h2 class="section-title" :class="{ 'fade-in-up': howItWorksVisible }">How It Works</h2>
        
        <div class="steps-grid">
          <div 
            class="step-card" 
            :class="{ 'fade-in-up': howItWorksVisible }"
            style="animation-delay: 0.1s"
          >
            <div class="step-number">1</div>
            <div class="step-image">
              <img src="@/assets/post_req.png" alt="Post a request">
            </div>
            <h3 class="step-title">Post a Request</h3>
            <p class="step-description">Let others know in detail what you need done!</p>
          </div>

          <div 
            class="step-card"
            :class="{ 'fade-in-up': howItWorksVisible }"
            style="animation-delay: 0.2s"
          >
            <div class="step-number">2</div>
            <div class="step-image">
              <img src="@/assets/choose_helper.png" alt="Choose helper">
            </div>
            <h3 class="step-title">Choose the Helper</h3>
            <p class="step-description">Receive offers within seconds and look at their reviews to see who's best.</p>
          </div>

          <div 
            class="step-card"
            :class="{ 'fade-in-up': howItWorksVisible }"
            style="animation-delay: 0.3s"
          >
            <div class="step-number">3</div>
            <div class="step-image">
              <img src="@/assets/pay_safely.png" alt="Pay safely">
            </div>
            <h3 class="step-title">Pay Safely</h3>
            <p class="step-description">Only release your payment once the request is done to your satisfaction.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Secure Payments Section -->
    <section class="secure-payments-section" ref="securePaymentsSection">
      <div class="container">
        <div class="secure-content" :class="{ 'fade-in-up': securePaymentsVisible }">
          <p class="secure-label">SECURE PAYMENTS</p>
          <h2 class="secure-title">Can't get safer than this</h2>
          <p class="secure-description">
            Pick the right heroes based on real reviews and ratings. Only release payments when the quest is completed to your satisfaction.
          </p>
          <div class="secure-badge">
            <span class="powered-text">Powered by</span>
            <span class="stripe-text">stripe</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Categories Section -->
    <section class="categories-section" ref="categoriesSection">
      <div class="container">
        <h2 class="categories-title" :class="{ 'fade-in-up': categoriesVisible }">Popular Services</h2>
        <p class="categories-subtitle" :class="{ 'fade-in-up': categoriesVisible }">Whatever you need, we've got someone who can help</p>
        
        <div class="categories-grid">
          <div 
            class="category-card" 
            style="background-image: url('https://generationhomesnw.com/wp-content/uploads/Home-Maintenance.jpg');"
            :class="{ 'fade-in-up': categoriesVisible }"
            :style="{ animationDelay: '0.1s' }"
          >
            <div class="category-overlay"></div>
            <div class="category-content">
              <h3 class="category-name">Home Services</h3>
              <p class="category-description">Repairs, maintenance, and improvements</p>
            </div>
          </div>

          <div 
            class="category-card" 
            style="background-image: url('https://t4.ftcdn.net/jpg/02/67/54/81/360_F_267548196_S2gNmvRnxMl6r4hpwAm0dUjjWqEtxugG.jpg');"
            :class="{ 'fade-in-up': categoriesVisible }"
            :style="{ animationDelay: '0.15s' }"
          >
            <div class="category-overlay"></div>
            <div class="category-content">
              <h3 class="category-name">Cleaning</h3>
              <p class="category-description">Deep cleaning, regular maintenance</p>
            </div>
          </div>

          <div 
            class="category-card" 
            style="background-image: url('https://thumbs.dreamstime.com/b/food-delivery-cheerful-handsome-young-delivery-guy-holding-boxes-hot-pizza-109997703.jpg');"
            :class="{ 'fade-in-up': categoriesVisible }"
            :style="{ animationDelay: '0.2s' }"
          >
            <div class="category-overlay"></div>
            <div class="category-content">
              <h3 class="category-name">Delivery</h3>
              <p class="category-description">Pickup and drop-off services</p>
            </div>
          </div>

          <div 
            class="category-card" 
            style="background-image: url('https://www.metropolbanquet.com/wp-content/uploads/wedding-videographer.jpg');"
            :class="{ 'fade-in-up': categoriesVisible }"
            :style="{ animationDelay: '0.25s' }"
          >
            <div class="category-overlay"></div>
            <div class="category-content">
              <h3 class="category-name">Photography</h3>
              <p class="category-description">Events, portraits, product photos</p>
            </div>
          </div>

          <div 
            class="category-card" 
            style="background-image: url('https://avahr.com/wp-content/uploads/2023/02/web-graphic-designer-job-description-template.jpg');"
            :class="{ 'fade-in-up': categoriesVisible }"
            :style="{ animationDelay: '0.3s' }"
          >
            <div class="category-overlay"></div>
            <div class="category-content">
              <h3 class="category-name">Design</h3>
              <p class="category-description">Graphics, web, and creative work</p>
            </div>
          </div>

          <div 
            class="category-card" 
            style="background-image: url('https://images.ctfassets.net/9wfm2v6d5j1f/4G9jrxO5FdxjUk0AA9HJ6f/8a4804f2ca1db647927c65772986dbc7/how-to-become-a-gardener.jpg?w=1920');"
            :class="{ 'fade-in-up': categoriesVisible }"
            :style="{ animationDelay: '0.35s' }"
          >
            <div class="category-overlay"></div>
            <div class="category-content">
              <h3 class="category-name">Gardening</h3>
              <p class="category-description">Landscaping and plant care</p>
            </div>
          </div>

          <div 
            class="category-card" 
            style="background-image: url('https://www.housemoverssingapore.com/wp-content/uploads/2024/05/House-Moving.jpg');"
            :class="{ 'fade-in-up': categoriesVisible }"
            :style="{ animationDelay: '0.4s' }"
          >
            <div class="category-overlay"></div>
            <div class="category-content">
              <h3 class="category-name">Moving</h3>
              <p class="category-description">Packing, loading, and transport</p>
            </div>
          </div>

          <div 
            class="category-card" 
            style="background-color: #2563EB;"
            :class="{ 'fade-in-up': categoriesVisible }"
            :style="{ animationDelay: '0.45s' }"
          >
            <div class="category-content">
              <h3 class="category-name">Many More...</h3>
              <p class="category-description">Any needs you require</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="container">
        <div class="footer-content">
          <h3 class="footer-logo">SideQuest</h3>
          <a href="/about" class="footer-about">About Us</a>
        </div>
        <p class="footer-copyright">© 2025 SideQuest. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<script>
export default {
  name: 'HomePage',
  data() {
    return {
      words: ['cleaning', 'assembling', 'building', 'photography', 'repairs', 'organizing', 'delivery', 'design', 'moving', 'gardening'],
      currentWord: 'cleaning',
      wordIndex: 0,
      allReviews: [
        {
          id: 1,
          text: "Found someone to fix my sink in minutes! The whole process was so smooth and easy.",
          name: "Sarah M.",
          rating: 5,
          avatar: "https://cdna.artstation.com/p/assets/images/images/040/053/326/large/dot-megachx.jpg?1627714754"
        },
        {
          id: 2,
          text: "Amazing service! The photographer was professional and delivered exactly what I needed.",
          name: "James L.",
          rating: 5,
          avatar: "https://static-cse.canva.com/blob/1842077/create_pixel-art-generator_hero4x.jpg"
        },
        {
          id: 3,
          text: "Best decision ever! Got my furniture assembled quickly and the helper was super friendly.",
          name: "Maria K.",
          rating: 5,
          avatar: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSo-PZx3UOXMxP4BOMz0Dhi6f0VLbc0_iDjptWFBR77ga53f0Z_QHx-W0NwIDSWTWsrdZE&usqp=CAU"
        },
        {
          id: 4,
          text: "The gardener transformed my backyard into a paradise. Highly recommend this platform!",
          name: "Lisa T.",
          rating: 5,
          avatar: "https://pbs.twimg.com/media/FJ9-iMHXwAsQAES.png"
        },
        {
          id: 5,
          text: "Moving was stress-free thanks to the amazing helpers I found here. Will use again!",
          name: "Michael B.",
          rating: 5,
          avatar: "https://i.pinimg.com/564x/8a/fd/d8/8afdd88e6bc2e9eabd9a4f639d463c31.jpg"
        },
        {
          id: 6,
          text: "Deep cleaning service was incredible. My apartment has never looked this good!",
          name: "Ryan P.",
          rating: 5,
          avatar: "https://i.etsystatic.com/49765647/r/il/8ac30d/5688023580/il_570xN.5688023580_1dwu.jpg"
        }
      ],
      reviewsVisible: false,
      howItWorksVisible: false,
      securePaymentsVisible: false,
      categoriesVisible: false
    };
  },
  mounted() {
    this.startWordRotation();
    this.setupScrollObserver();
  },
  beforeUnmount() {
    if (this.wordInterval) {
      clearInterval(this.wordInterval);
    }
    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
    }
  },
  methods: {
    startWordRotation() {
      this.wordInterval = setInterval(() => {
        this.wordIndex = (this.wordIndex + 1) % this.words.length;
        this.currentWord = this.words[this.wordIndex];
      }, 2500);
    },
    setupScrollObserver() {
      const options = {
        threshold: 0.2,
        rootMargin: '0px'
      };

      this.scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            if (entry.target === this.$refs.reviewsSection) {
              this.reviewsVisible = true;
            } else if (entry.target === this.$refs.howItWorksSection) {
              this.howItWorksVisible = true;
            } else if (entry.target === this.$refs.securePaymentsSection) {
              this.securePaymentsVisible = true;
            } else if (entry.target === this.$refs.categoriesSection) {
              this.categoriesVisible = true;
            }
          }
        });
      }, options);

      if (this.$refs.reviewsSection) {
        this.scrollObserver.observe(this.$refs.reviewsSection);
      }
      if (this.$refs.howItWorksSection) {
        this.scrollObserver.observe(this.$refs.howItWorksSection);
      }
      if (this.$refs.securePaymentsSection) {
        this.scrollObserver.observe(this.$refs.securePaymentsSection);
      }
      if (this.$refs.categoriesSection) {
        this.scrollObserver.observe(this.$refs.categoriesSection);
      }
    },
    navigateToLogin() {
      // Check if user is logged in
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      
      if (isLoggedIn) {
        // User is logged in, go to request page
        this.$router.push('/request');
      } else {
        // User is not logged in, go to login page
        this.$router.push('/login');
      }
    }
  }
};
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  width: 100%;
  min-height: 100vh;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

/* Title Section */
.title-section {
  padding: 2rem 0 3rem;
  background: white;
}

.title-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}

.title-text {
  text-align: left;
}

.main-title {
  font-size: 5rem;
  color: #1a1a1a;
  margin-bottom: 1.5rem;
  line-height: 1.2;
  font-weight: 700;
}

.word-container {
  display: block;
  min-height: 1.2em;
}

.changing-word {
  color: #4fb6e1;
  display: inline-block;
  font-weight: 700;
}

.request-link {
  color: #4fb6e1;
  cursor: pointer;
  text-decoration: underline;
  font-weight: 700;
  transition: all 0.3s ease;
}

.request-link:hover {
  color: #3a9cc9;
  text-decoration: none;
}

.slide-fade-enter-active {
  transition: all 0.4s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s ease-in;
}

.slide-fade-enter-from {
  transform: translateY(20px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

.fade-slide-enter-active {
  transition: all 0.6s ease-out;
}

.fade-slide-leave-active {
  transition: all 0.5s ease-in;
}

.fade-slide-enter-from {
  transform: translateX(30px);
  opacity: 0;
}

.fade-slide-leave-to {
  transform: translateX(-30px);
  opacity: 0;
}

.main-description {
  font-size: 1.2rem;
  color: #666;
  line-height: 1.6;
  max-width: 600px;
}

.title-image {
  display: flex;
  justify-content: center;
  align-items: center;
}

.hero-image {
  width: 100%;
  max-width: 600px;
  height: auto;
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.hero-image:hover {
  transform: translateY(-8px);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.2);
}

/* Reviews Section */
.reviews-section {
  padding: 5rem 0;
  background: #4fb6e1;
  position: relative;
  overflow: hidden;
  width: 100%;
}

.reviews-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320"><path fill="%23ffffff" fill-opacity="0.05" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,112C672,96,768,96,864,112C960,128,1056,160,1152,165.3C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>') no-repeat bottom;
  background-size: cover;
  opacity: 0.3;
}

.reviews-full-width {
  width: 100%;
  max-width: 100%;
  padding: 0;
}

.reviews-title {
  font-size: 2.8rem;
  color: white;
  text-align: center;
  margin-bottom: 0.5rem;
  font-weight: 700;
  position: relative;
  z-index: 1;
  opacity: 0;
  transform: translateY(30px);
  padding: 0 2rem;
}

.reviews-title.fade-in-up {
  animation: fadeInUp 0.8s ease forwards;
}

.reviews-subtitle {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  margin-bottom: 3rem;
  position: relative;
  z-index: 1;
  opacity: 0;
  transform: translateY(30px);
  padding: 0 2rem;
}

.reviews-subtitle.fade-in-up {
  animation: fadeInUp 0.8s ease 0.2s forwards;
}

.reviews-scroll-container {
  position: relative;
  z-index: 1;
  overflow: hidden;
  padding: 2rem 0;
  opacity: 0;
  transform: translateY(30px);
  width: 100%;
  max-width: 100%;
}

.reviews-scroll-container.fade-in-up {
  animation: fadeInUp 0.8s ease 0.4s forwards;
}

.reviews-scroll-track {
  display: flex;
  gap: 2rem;
  animation: scrollLeftToRight 80s linear infinite;
  width: fit-content;
}

.reviews-scroll-track:hover {
  animation-play-state: paused;
}

@keyframes scrollLeftToRight {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

.small-review-card {
  background: white;
  border-radius: 16px;
  padding: 2rem 1.75rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  min-width: 320px;
  max-width: 320px;
  flex-shrink: 0;
}

.small-review-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
}

.review-avatar {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.avatar-image {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid #3a9cc9;
  box-shadow: 0 4px 12px rgba(58, 156, 201, 0.3);
}

.review-stars-small {
  margin-bottom: 1rem;
  display: flex;
  gap: 0.25rem;
  justify-content: center;
}

.review-star-small {
  color: #FFA500;
  font-size: 1.2rem;
}

.small-review-text {
  font-size: 0.95rem;
  color: #1a1a1a;
  line-height: 1.6;
  margin-bottom: 1rem;
  font-style: italic;
  min-height: 80px;
  text-align: center;
}

.small-reviewer-name {
  font-size: 0.9rem;
  color: #2a7a9e;
  font-weight: 700;
  text-align: center;
}

/* Animations */
@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Secure Payments Section */
.secure-payments-section {
  padding: 5rem 0;
  background: #1a1a1a;
  color: white;
}

.secure-content {
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
  opacity: 0;
  transform: translateY(30px);
}

.secure-content.fade-in-up {
  animation: fadeInUp 0.8s ease forwards;
}

.secure-label {
  font-size: 0.9rem;
  color: #10b981;
  font-weight: 600;
  letter-spacing: 2px;
  margin-bottom: 1rem;
}

.secure-title {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  line-height: 1.2;
}

.secure-description {
  font-size: 1.1rem;
  line-height: 1.6;
  color: #d1d5db;
  margin-bottom: 2rem;
}

.secure-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 8px;
}

.powered-text {
  font-size: 0.9rem;
  color: #9ca3af;
}

.stripe-text {
  font-size: 1.2rem;
  font-weight: 700;
  color: #6366f1;
}

/* Categories Section */
.categories-section {
  padding: 5rem 0;
  background: white;
}

.categories-title {
  font-size: 2.5rem;
  color: #1a1a1a;
  text-align: center;
  margin-bottom: 0.5rem;
  font-weight: 700;
  opacity: 0;
  transform: translateY(30px);
}

.categories-title.fade-in-up {
  animation: fadeInUp 0.8s ease forwards;
}

.categories-subtitle {
  font-size: 1.2rem;
  color: #666;
  text-align: center;
  margin-bottom: 4rem;
  opacity: 0;
  transform: translateY(30px);
}

.categories-subtitle.fade-in-up {
  animation: fadeInUp 0.8s ease 0.2s forwards;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2rem;
  max-width: 1100px;
  margin: 0 auto;
}

.category-card {
  background-size: cover;
  background-position: center;
  border-radius: 16px;
  padding: 2rem 1.5rem;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  min-height: 200px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  opacity: 0;
  transform: translateY(30px);
}

.category-card.fade-in-up {
  animation: fadeInUp 0.6s ease forwards;
}

.category-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  transition: background 0.3s ease;
}

.category-card:hover .category-overlay {
  background: rgba(79, 182, 225, 0.85);
}

.category-content {
  position: relative;
  z-index: 1;
  width: 100%;
}

.category-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(79, 182, 225, 0.3);
}

.category-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.5rem;
  transition: color 0.3s ease;
}

.category-description {
  font-size: 0.9rem;
  color: white;
  line-height: 1.5;
  transition: color 0.3s ease;
  opacity: 0.95;
}

/* Footer */
.footer {
  background: #1a1a1a;
  color: white;
  padding: 3rem 0 2rem;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #374151;
}

.footer-logo {
  font-size: 1.75rem;
  font-weight: 700;
  color: #4fb6e1;
  margin: 0;
}

.footer-about {
  color: #9ca3af;
  text-decoration: none;
  transition: color 0.3s ease;
  font-size: 0.95rem;
}

.footer-about:hover {
  color: #4fb6e1;
}

.footer-copyright {
  color: #9ca3af;
  font-size: 0.9rem;
  margin: 0;
  text-align: left;
}

/* How It Works Section */
.how-it-works-section {
  padding: 3rem 0;
  background: #f8f9fa;
}

.section-title {
  font-size: 2.8rem;
  color: #4fb6e1;
  text-align: center;
  margin-bottom: 2.5rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  opacity: 0;
  transform: translateY(30px);
}

.section-title.fade-in-up {
  animation: fadeInUp 0.8s ease forwards;
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3rem;
  max-width: 1100px;
  margin: 0 auto;
}

.step-card {
  background: white;
  border-radius: 20px;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  opacity: 0;
  transform: translateY(30px);
}

.step-card.fade-in-up {
  animation: fadeInUp 0.6s ease forwards;
}

.step-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.step-number {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 60px;
  background: white;
  border: 4px solid #4fb6e1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  font-weight: 700;
  color: #4fb6e1;
  box-shadow: 0 4px 12px rgba(79, 182, 225, 0.2);
}

.step-image {
  width: 100%;
  height: 250px;
  border-radius: 16px;
  overflow: hidden;
  margin: 2rem 0 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.step-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.step-title {
  font-size: 1.5rem;
  color: #1a1a1a;
  margin-bottom: 0.75rem;
  font-weight: 700;
}

.step-description {
  font-size: 1rem;
  color: #666;
  line-height: 1.6;
}

/* Responsive Design */
@media (max-width: 968px) {
  .title-content {
    grid-template-columns: 1fr;
    gap: 3rem;
  }

  .title-text {
    text-align: center;
  }

  .main-title {
    font-size: 3.5rem;
  }

  .main-description {
    margin: 0 auto;
  }

  .steps-grid {
    grid-template-columns: 1fr;
    gap: 4rem;
  }

  .step-card {
    max-width: 500px;
    margin: 0 auto;
  }
}

@media (max-width: 768px) {
  .container {
    padding: 0 1rem;
  }

  .title-section {
    padding: 3rem 0 2rem;
  }

  .main-title {
    font-size: 2.5rem;
  }

  .main-description {
    font-size: 1rem;
  }

  .hero-image {
    margin-top: 2rem;
  }

  .reviews-title {
    font-size: 2rem;
  }

  .reviews-subtitle {
    font-size: 1rem;
  }

  .small-review-card {
    min-width: 280px;
    max-width: 280px;
    padding: 1.5rem;
  }

  .avatar-image {
    width: 70px;
    height: 70px;
  }

  .secure-title {
    font-size: 2.5rem;
  }

  .categories-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .footer-content {
    flex-direction: column;
    gap: 1.5rem;
    text-align: center;
  }

  .section-title {
    font-size: 2rem;
  }

  .section-subtitle {
    font-size: 1.5rem;
    margin-bottom: 3rem;
  }

  .step-image {
    height: 200px;
  }
}

@media (max-width: 480px) {
  .main-title {
    font-size: 2rem;
  }

  .hero-image {
    max-width: 100%;
  }

  .reviews-title {
    font-size: 1.75rem;
  }

  .reviews-subtitle {
    font-size: 0.95rem;
  }

  .small-review-card {
    min-width: 260px;
    max-width: 260px;
    padding: 1.25rem;
  }

  .avatar-image {
    width: 60px;
    height: 60px;
  }

  .small-review-text {
    font-size: 0.9rem;
    min-height: auto;
  }

  .secure-description {
    font-size: 1rem;
  }

  .categories-title {
    font-size: 2rem;
  }

  .categories-subtitle {
    font-size: 1rem;
  }

  .categories-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .footer-content {
    flex-direction: column;
    gap: 1.5rem;
    text-align: center;
  }

  .section-title {
    font-size: 1.5rem;
  }

  .section-subtitle {
    font-size: 1.25rem;
  }

  .step-number {
    width: 50px;
    height: 50px;
    font-size: 1.5rem;
  }

  .step-title {
    font-size: 1.25rem;
  }

  .step-description {
    font-size: 0.95rem;
  }
}
</style>