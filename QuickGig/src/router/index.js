import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../pages/LoginPage.vue'
import SignupPage from '../pages/SignupPage.vue'

const routes = [
  { path: '/login', name: 'login', component: LoginPage },
  { path: '/signup', name: 'signup', component: SignupPage },
  { path: '/', redirect: '/login' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router