<template>
  <div class="container mt-4">

    <div class="text-center mb-4">
      <div class="btn-group" role="group" aria-label="View Toggle">
        <button
          type="button"
          class="btn"
          :class="viewMode === 'earnings' ? 'btn-success' : 'btn-outline-success'"
          @click="setViewMode('earnings')"
        >
          My Earnings
        </button>
        <button
          type="button"
          class="btn"
          :class="viewMode === 'spending' ? 'btn-primary' : 'btn-outline-primary'"
          @click="setViewMode('spending')"
        >
          My Spending
        </button>
      </div>
    </div>

    <h2 class="mb-3 text-center">{{ pageTitle }}</h2>

    <div class="row mb-4">
      <div class="col-md-6">
        <div v-if="!loading" class="text-center">
          <h5 class="text-muted mb-0">{{ currentMonthLabel }}</h5>
          <h2 class="fw-bold display-6" :class="totalColorClass">
            ${{ currentMonthTotal.toFixed(2) }}
          </h2>
        </div>
      </div>
      <div class="col-md-6">
        <div v-if="!loading" class="text-center">
          <h5 class="text-muted mb-0">{{ allTimeLabel }}</h5>
          <h2 class="fw-bold display-6" :class="totalColorClass">
             ${{ allTimeTotal.toFixed(2) }}
          </h2>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-12 mb-4">
        <div class="card shadow-sm">
          <div class="card-body">
            <h5 class="card-title">{{ chartTitle }}</h5>
            <div v-if="loading" class="d-flex justify-content-center align-items-center" style="height: 300px;">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
            </div>
            <div v-if="error" class="alert alert-danger">{{ error }}</div>
            <div v-show="!loading && !error" id="chart">
              <apexchart type="bar" height="300" :options="chartOptions" :series="chartSeries"></apexchart>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-12">
        <div class="card shadow-sm">
          <div class="card-body">
            <h5 class="card-title">{{ listTitle }}</h5>
            <div class="job-list-container">
              <ul v-if="!loading" class="list-group list-group-flush">
                <li v-if="displayedListItems.length === 0" class="list-group-item">
                  {{ emptyListMessage }}
                </li>

                <li v-if="viewMode === 'earnings'" v-for="item in displayedListItems" :key="'earn-' + item.id" class="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 class="mb-0">{{ item.job_title || 'Job Title Missing' }}</h6>
                    <small class="text-muted">{{ formatJobDate(item.created_at) }}</small>
                  </div>
                  <span class="badge bg-success rounded-pill fs-6">+${{ item.net_amount.toFixed(2) }}</span>
                </li>

                <li v-else-if="viewMode === 'spending'" v-for="item in displayedListItems" :key="'spend-' + item.id" class="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 class="mb-0">{{ item.title || 'Job Title Missing' }}</h6>
                    <small class="text-muted">{{ formatJobDate(item.created_at) }}</small>
                  </div>
                  <div class="text-end">
                    <span :class="getStatusBadgeClass(item.status)" class="badge rounded-pill mb-1">{{ item.status }}</span>
                    <div class="fs-6 fw-bold text-dark">${{ item.payment.toFixed(2) }}</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'; // Added watch
import { supabase } from '../supabase/config';

// --- State ---
const loading = ref(true);
const error = ref(null);
const viewMode = ref('earnings'); // 'earnings' or 'spending'

// --- Data Refs ---
const allFetchedEarnings = ref([]);
const allFetchedJobs = ref([]); // For spending/job postings

// --- Display Refs (Calculated below) ---
const currentMonthTotal = ref(0);
const allTimeTotal = ref(0);

// --- ApexCharts Refs ---
const chartSeries = ref([{ name: 'Data', data: [] }]);
const chartOptions = ref({ // Base options, colors/titles updated in watch
  chart: { type: 'bar', height: 300, toolbar: { show: false } },
  states: { hover: { filter: { type: 'darken', value: 0.85 } } },
  plotOptions: { bar: { horizontal: false, columnWidth: '60%', borderRadius: 4 } },
  dataLabels: { enabled: false },
  stroke: { show: true, width: 2, colors: ['transparent'] },
  xaxis: { categories: [], title: { text: 'Month' } },
  yaxis: { title: { text: 'Amount ($)' }, labels: { formatter: (val) => "$" + val.toFixed(0) } },
  colors: ['#1b9e77'], // Default to green
  fill: { opacity: 1 },
  tooltip: { y: { formatter: (val) => "$ " + val } }
});

// --- Computed Properties for Dynamic UI ---
const pageTitle = computed(() => viewMode.value === 'earnings' ? 'My Earnings' : 'My Spending');
const currentMonthLabel = computed(() => viewMode.value === 'earnings' ? 'Current Month Earnings' : 'Current Month Spending');
const allTimeLabel = computed(() => viewMode.value === 'earnings' ? 'All-Time Earnings' : 'All-Time Spending');
const chartTitle = computed(() => viewMode.value === 'earnings' ? 'Earnings (Last 6 Months)' : 'Spending (Last 6 Months)');
const listTitle = computed(() => viewMode.value === 'earnings' ? 'Recent Earnings' : 'My Job Postings');
const emptyListMessage = computed(() => viewMode.value === 'earnings' ? 'No recent earnings found.' : 'You have not posted any jobs.');
const totalColorClass = computed(() => viewMode.value === 'earnings' ? 'text-success' : 'text-primary');
const currentMonthPrefix = computed(() => viewMode.value === 'earnings' ? '+' : '-');
const allTimePrefix = computed(() => viewMode.value === 'earnings' ? '+' : '-');

const displayedListItems = computed(() => {
  return viewMode.value === 'earnings' ? allFetchedEarnings.value : allFetchedJobs.value;
});

// --- Functions ---
function setViewMode(mode) {
  viewMode.value = mode;
  // Recalculate and update chart when mode changes
  updateDisplayData();
}

// Fetches data and triggers initial calculation
onMounted(async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw authError || new Error("User not found.");
    const userId = user.id;

    // Fetch BOTH datasets in parallel
    const [earningsResponse, jobsResponse] = await Promise.all([
      supabase.from('Earnings').select('id, created_at, net_amount, job_title, status').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('User-Job-Request').select('id, created_at, payment, title, status').eq('user_id', userId).order('created_at', { ascending: false })
    ]);

    if (earningsResponse.error) throw earningsResponse.error;
    if (jobsResponse.error) throw jobsResponse.error;

    allFetchedEarnings.value = earningsResponse.data || [];
    allFetchedJobs.value = jobsResponse.data || [];

    // Initial calculation based on default viewMode ('earnings')
    updateDisplayData();

  } catch (err) {
    console.error('Error fetching data:', err);
    error.value = `Failed to load data: ${err.message}`;
  } finally {
    loading.value = false;
  }
});

// Recalculates totals and chart data based on current viewMode
function updateDisplayData() {
  const dataSet = viewMode.value === 'earnings' ? allFetchedEarnings.value : allFetchedJobs.value;
  const amountField = viewMode.value === 'earnings' ? 'net_amount' : 'payment';
  const statusToCheck = viewMode.value === 'earnings' ? 'completed' : 'completed'; // Both use 'completed' for totals/chart

  const today = new Date();
  const monthlyTotals = new Map();
  for (let i = 5; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyTotals.set(monthKey, 0);
  }

  let allTimeTotalCalc = 0;
  for (const item of dataSet) {
    if (item.status === statusToCheck) {
      allTimeTotalCalc += item[amountField];
      const date = new Date(item.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyTotals.has(monthKey)) {
        monthlyTotals.set(monthKey, monthlyTotals.get(monthKey) + item[amountField]);
      }
    }
  }

  allTimeTotal.value = allTimeTotalCalc;

  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  currentMonthTotal.value = monthlyTotals.get(currentMonthKey) || 0.00;

  // Update chart
  updateChart(monthlyTotals);
}

// Updates ApexCharts options and series
function updateChart(monthlyTotals) {
  const categories = [];
  const seriesData = [];
  const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });

  for (const [monthKey, total] of monthlyTotals.entries()) {
    const date = new Date(`${monthKey}-02`);
    categories.push(monthFormatter.format(date));
    seriesData.push(total.toFixed(2));
  }

  chartSeries.value = [{
    name: viewMode.value === 'earnings' ? 'Earnings' : 'Spending',
    data: seriesData
  }];

  chartOptions.value = {
    ...chartOptions.value,
    colors: [viewMode.value === 'earnings' ? '#1b9e77' : '#0d6efd'], // Green for earnings, Blue for spending
    yaxis: {
       ...chartOptions.value.yaxis,
       title: { text: viewMode.value === 'earnings' ? 'Earnings ($)' : 'Spending ($)' }
    },
    xaxis: {
      ...chartOptions.value.xaxis,
      categories: categories
    }
  };
}

// --- Helper Functions ---
function getStatusBadgeClass(status) {
  switch (status) {
    case 'open': return 'bg-primary';
    case 'in-progress': return 'bg-warning text-dark';
    case 'completed': return 'bg-success';
    case 'cancelled': return 'bg-secondary';
    default: return 'bg-light text-dark';
  }
}

function formatJobDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}
</script>

<style scoped>
/* Add these styles to hide the scrollbar */
.job-list-container::-webkit-scrollbar {
  display: none; /* For Chrome, Safari, and Opera */
}

.job-list-container {
  /* For IE, Edge, and Firefox */
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
.card {
  border: none;
  border-radius: 0.5rem;
  height: 100%;
}
.list-group-item {
  padding-left: 0;
  padding-right: 0;
}
.text-success {
  color: #198754 !important;
}
.text-primary { /* Changed from text-danger */
  color: #0d6efd !important;
}
.job-list-container {
  max-height: 400px;
  overflow-y: auto;
}
/* Ensure toggle buttons look good */
.btn-group .btn {
    border-radius: 0.375rem; /* Match card radius */
}
.btn-group .btn:first-child {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
}
.btn-group .btn:last-child {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
}
</style>