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
              QuickGig connects you with skilled locals in your area who are ready to help with any task. 
              From home repairs to event planning, find the perfect match for your needs.
            </p>
          </div>
          <div class="title-image">
            <div class="reviews-container">
              <div class="review-card">
                <div class="stars">
                  <span class="star">★</span>
                  <span class="star">★</span>
                  <span class="star">★</span>
                  <span class="star">★</span>
                  <span class="star">★</span>
                </div>
                <p class="review-text">"Found someone to fix my sink in minutes! The whole process was so smooth and easy."</p>
                <p class="reviewer-name">- Sarah M.</p>
              </div>
              
              <div class="review-card">
                <div class="stars">
                  <span class="star">★</span>
                  <span class="star">★</span>
                  <span class="star">★</span>
                  <span class="star">★</span>
                  <span class="star">★</span>
                </div>
                <p class="review-text">"Amazing service! The photographer was professional and delivered exactly what I needed."</p>
                <p class="reviewer-name">- James L.</p>
              </div>
              
              <div class="review-card">
                <div class="stars">
                  <span class="star">★</span>
                  <span class="star">★</span>
                  <span class="star">★</span>
                  <span class="star">★</span>
                  <span class="star">★</span>
                </div>
                <p class="review-text">"Best decision ever! Got my furniture assembled quickly and the helper was super friendly."</p>
                <p class="reviewer-name">- Maria K.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section class="how-it-works-section">
      <div class="container">
        <h2 class="section-title">How It Works</h2>
        
        <div class="steps-grid">
          <div class="step-card">
            <div class="step-number">1</div>
            <div class="step-image">
              <img src="https://www.reuters.com/resizer/v2/ZA4VDDIHVJMDHKFQZDTQGY5FLQ.jpg?auth=fcc8692434f2e20349dcd96036b2c6ff745c2a0e31480e8641e6a0886e34c54c&width=2965&quality=80" alt="Post a request" />
            </div>
            <h3 class="step-title">Post a Request</h3>
            <p class="step-description">Let others know in detail what you need done!</p>
          </div>

          <div class="step-card">
            <div class="step-number">2</div>
            <div class="step-image">
              <img src="https://www.reuters.com/resizer/v2/ZA4VDDIHVJMDHKFQZDTQGY5FLQ.jpg?auth=fcc8692434f2e20349dcd96036b2c6ff745c2a0e31480e8641e6a0886e34c54c&width=2965&quality=80" alt="Choose helper" />
            </div>
            <h3 class="step-title">Choose the Helper</h3>
            <p class="step-description">Receive offers within seconds and look at their reviews to see who's best.</p>
          </div>

          <div class="step-card">
            <div class="step-number">3</div>
            <div class="step-image">
              <img src="https://www.reuters.com/resizer/v2/ZA4VDDIHVJMDHKFQZDTQGY5FLQ.jpg?auth=fcc8692434f2e20349dcd96036b2c6ff745c2a0e31480e8641e6a0886e34c54c&width=2965&quality=80" alt="Pay safely" />
            </div>
            <h3 class="step-title">Pay Safely</h3>
            <p class="step-description">Only release your payment once the request is done to your satisfaction.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Secure Payments Section -->
    <section class="secure-payments-section">
      <div class="container">
        <div class="secure-content">
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
    <section class="categories-section">
      <div class="container">
        <h2 class="categories-title">Popular Services</h2>
        <p class="categories-subtitle">Whatever you need, we've got someone who can help</p>
        
        <div class="categories-grid">
          <div class="category-card" style="background-image: url('https://generationhomesnw.com/wp-content/uploads/Home-Maintenance.jpg');">
            <div class="category-overlay"></div>
            <div class="category-content">
              <h3 class="category-name">Home Services</h3>
              <p class="category-description">Repairs, maintenance, and improvements</p>
            </div>
          </div>

          <div class="category-card" style="background-image: url('https://t4.ftcdn.net/jpg/02/67/54/81/360_F_267548196_S2gNmvRnxMl6r4hpwAm0dUjjWqEtxugG.jpg');">
            <div class="category-overlay"></div>
            <div class="category-content">
              <h3 class="category-name">Cleaning</h3>
              <p class="category-description">Deep cleaning, regular maintenance</p>
            </div>
          </div>

          <div class="category-card" style="background-image: url('https://thumbs.dreamstime.com/b/food-delivery-cheerful-handsome-young-delivery-guy-holding-boxes-hot-pizza-109997703.jpg');">
            <div class="category-overlay"></div>
            <div class="category-content">
              <h3 class="category-name">Delivery</h3>
              <p class="category-description">Pickup and drop-off services</p>
            </div>
          </div>

          <div class="category-card" style="background-image: url('https://www.metropolbanquet.com/wp-content/uploads/wedding-videographer.jpg');">
            <div class="category-overlay"></div>
            <div class="category-content">
              <h3 class="category-name">Photography</h3>
              <p class="category-description">Events, portraits, product photos</p>
            </div>
          </div>

          <div class="category-card" style="background-image: url('https://avahr.com/wp-content/uploads/2023/02/web-graphic-designer-job-description-template.jpg');">
            <div class="category-overlay"></div>
            <div class="category-content">
              <h3 class="category-name">Design</h3>
              <p class="category-description">Graphics, web, and creative work</p>
            </div>
          </div>

          <div class="category-card" style="background-image: url('https://images.ctfassets.net/9wfm2v6d5j1f/4G9jrxO5FdxjUk0AA9HJ6f/8a4804f2ca1db647927c65772986dbc7/how-to-become-a-gardener.jpg?w=1024&fm=webp');">
            <div class="category-overlay"></div>
            <div class="category-content">
              <h3 class="category-name">Gardening</h3>
              <p class="category-description">Landscaping and plant care</p>
            </div>
          </div>

          <div class="category-card" style="background-image: url('https://www.housemoverssingapore.com/wp-content/uploads/2024/05/House-Moving.jpg');">
            <div class="category-overlay"></div>
            <div class="category-content">
              <h3 class="category-name">Moving</h3>
              <p class="category-description">Packing, loading, and transport</p>
            </div>
          </div>

          <div class="category-card" style="background-color: #2563EB;">
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
          <h3 class="footer-logo">QuickGig</h3>
          <a href="/about" class="footer-about">About Us</a>
        </div>
        <p class="footer-copyright">© 2025 QuickGig. All rights reserved.</p>
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
      wordIndex: 0
    };
  },
  mounted() {
    this.startWordRotation();
  },
  beforeUnmount() {
    if (this.wordInterval) {
      clearInterval(this.wordInterval);
    }
  },
  methods: {
    startWordRotation() {
      this.wordInterval = setInterval(() => {
        this.wordIndex = (this.wordIndex + 1) % this.words.length;
        this.currentWord = this.words[this.wordIndex];
      }, 2500);
    },
    navigateToLogin() {
      this.$router.push('/request');
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
  padding: 5rem 0 3rem;
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
  color: #2563EB;
  display: inline-block;
  font-weight: 700;
}

.request-link {
  color: #2563EB;
  cursor: pointer;
  text-decoration: underline;
  font-weight: 700;
  transition: all 0.3s ease;
}

.request-link:hover {
  color: #1d4ed8;
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

.reviews-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
}

.review-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.review-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.stars {
  margin-bottom: 0.75rem;
  display: flex;
  gap: 0.25rem;
}

.star {
  color: #FFA500;
  font-size: 1.3rem;
}

.review-text {
  font-size: 1rem;
  color: #333;
  line-height: 1.6;
  margin-bottom: 0.75rem;
  font-style: italic;
}

.reviewer-name {
  font-size: 0.9rem;
  color: #2563EB;
  font-weight: 600;
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
}

.categories-subtitle {
  font-size: 1.2rem;
  color: #666;
  text-align: center;
  margin-bottom: 4rem;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2rem;
  max-width: 1200px;
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
  background: rgba(37, 99, 235, 0.85);
}

.category-content {
  position: relative;
  z-index: 1;
  width: 100%;
}

.category-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
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
  color: #2563EB;
  margin: 0;
}

.footer-about {
  color: #9ca3af;
  text-decoration: none;
  transition: color 0.3s ease;
  font-size: 0.95rem;
}

.footer-about:hover {
  color: #2563EB;
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
  color: #2563EB;
  text-align: center;
  margin-bottom: 2.5rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
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
  border: 4px solid #2563EB;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  font-weight: 700;
  color: #2563EB;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
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

  .reviews-container {
    margin-top: 2rem;
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

  .review-card {
    padding: 1.25rem;
  }

  .review-text {
    font-size: 0.9rem;
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