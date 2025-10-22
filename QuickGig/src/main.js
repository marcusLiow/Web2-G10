import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import 'bootstrap/dist/css/bootstrap.min.css'

import VueApexCharts from "vue3-apexcharts";

const app = createApp(App)
app.use(router)

app.use(VueApexCharts);

app.mount('#app')