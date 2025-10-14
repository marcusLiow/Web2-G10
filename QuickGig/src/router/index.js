import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import request from '../pages/request.vue'
import LoginPage from '../pages/LoginPage.vue'
import SignupPage from '../pages/SignupPage.vue'
import ProfilePage from '../pages/ProfilePage.vue'
import AnalyticsDashboard from "../pages/Dashboard.vue";
import JobPage from "../pages/JobPage.vue"

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage
    },
    {
      path: '/request',
      name: 'request',
      component: request
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage
    },
    {
      path: '/signup',
      name: 'signup',
      component: SignupPage
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfilePage
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: AnalyticsDashboard
    },
    {
      path: '/jobs',
      name: 'JobPage',
      component: JobPage
    }

  ]
})

export default router