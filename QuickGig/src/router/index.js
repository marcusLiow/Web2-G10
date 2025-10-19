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
import HelpersPage from '../pages/HelpersPage.vue'  // Add this line

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
      path: '/job/:id',
      name: 'JobDetails',
      component: () => import('../pages/JobDetails.vue'),
      beforeEnter: (to, from, next) => {
        console.log('Navigating to JobDetails with ID:', to.params.id);
        next();
      }
    },
    {
      path: '/helpers',  // Add this route
      name: 'HelpersPage',
      component: () => import('../pages/HelpersPage.vue')
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
    },
    {
      path: '/chats',
      name: 'Chats',
      component: () => import('../pages/ChatsPage.vue')
    },
    {
      path: '/chat/:id',
      name: 'ChatConversation',
      component: () => import('../pages/ChatConversation.vue')
    }

  ]
})

export default router