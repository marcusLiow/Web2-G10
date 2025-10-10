import {
    createWebHistory,
    createRouter
} from "vue-router";

import MainMenu from '../components/MainMenu.vue';
import Analytics from '../components/Analytics.vue';
import AnalyticsDashboard from "../components/AnalyticsDashboard.vue";

const history = createWebHistory()
const routes = [
  {
    path: '/',
    component: MainMenu
  },

  {
    path: '/Analytics/',
    component: Analytics
  },

  {
    path: '/AnalyticsDashboard/',
    component: AnalyticsDashboard
  }
]

const router = createRouter({
    history,
    routes
  });

export default router;