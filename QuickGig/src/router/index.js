import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import request from '../pages/request.vue'
import LoginPage from '../pages/LoginPage.vue'
import SignupPage from '../pages/SignupPage.vue'
import ProfilePage from '../pages/ProfilePage.vue'
import AnalyticsDashboard from "../pages/Dashboard.vue";
import JobPage from "../pages/JobPage.vue"
import Onboarding from '@/pages/Onboarding.vue'
import AdventurerSignUp from '@/pages/AdventurerSignUp.vue'
import maptest from '@/pages/maptest.vue'

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
      component: import('../pages/request.vue')
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
      component: () => import('../pages/ProfilePage.vue')
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('../pages/Dashboard.vue')
    },
    {
      path: '/jobs',
      name: 'JobPage',
      component: () => import('../pages/JobPage.vue')
    },
    {
      path: '/auth/callback',
      name: 'AuthCallback',
      component: () => import('../pages/AuthCallback.vue')
    },
    {
      path: '/onboarding',
      name: 'Onboarding',
      component: () => import('../pages/Onboarding.vue')
    },
    {
      path: '/signup/adventurer', 
      name: 'AdventurerSignUp',
      component: () => import('../pages/AdventurerSignUp.vue')
    },
    {
      path: '/map-test',
      name: 'MapTest',
      component: () => import('@/pages/maptest.vue')
    }

  ]
})

export default router