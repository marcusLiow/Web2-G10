import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import request from '../pages/request.vue'
import LoginPage from '../pages/LoginPage.vue'
import SignupPage from '../pages/SignupPage.vue'
import ProfilePage from '../pages/ProfilePage.vue'
import Earnings from "../pages/Earnings.vue";
import JobPage from "../pages/JobPage.vue"
import Onboarding from '@/pages/Onboarding.vue'
import AdventurerSignUp from '@/pages/AdventurerSignUp.vue'
import maptest from '@/pages/maptest.vue'
import HelpersPage from '../pages/HelpersPage.vue'
import Spending from '../pages/Spending.vue'
import editjob from '@/pages/editjob.vue'
import JobMap from '@/pages/JobMap.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    return { top: 0 }
  },
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
      path: '/earnings',
      name: 'earnings',
      component: () => import('../pages/Earnings.vue')
    },
    {
      path: '/spending',
      name: 'spending',
      component: () => import('../pages/Spending.vue')
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
    },
    {
      path: '/edit-job/:id',
      name: 'EditJob',
      component: () => import('../pages/editjob.vue')
    },
    {
      path: '/pay/:jobId', // Use jobId in the path
      name: 'PaymentPage',
      component: () => import('../pages/PaymentPage.vue'),
      // props: true // We are using query params now, so props:true might not be needed unless you use jobId prop
    },
    // Add a route to handle the return_url from Stripe
    {
      path: '/payment-success',
      name: 'PaymentSuccess',
      component: () => import('../pages/PaymentSuccessHandler.vue')
    },
    {
      path: '/job-map',
      name: 'JobMap',
      component: JobMap
    },
    {
      path: '/chat/:id',
      name: 'Chat',
      component: () => import('../pages/ChatConversation.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/helper-chat/:id',
      name: 'HelperChat',
      component: () => import('../pages/ChatConversation.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/helper/:id',
      name: 'HelperProfile',
      component: () => import('../pages/HelperProfile.vue')
    },
    {
      path: '/user/:id',
      name: 'ViewProfile',
      component: () => import('../pages/ViewProfile.vue')
    }
  ],
})

export default router