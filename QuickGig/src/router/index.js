import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import hp from '../pages/hp.vue'
import request from '@/pages/request.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage
    },
    {
      path: '/hp',
      name: 'hp',
      component: hp
    },
    {
      path: '/request',
      name: 'request',
      component: request
    }
  ]
})

export default router