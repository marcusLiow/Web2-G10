<template>
  <div class="container mt-4">
    
    <h2 class="mb-3 text-center">My Spending</h2>

    <div class="row mb-4">
      
      <div class="col-md-6">
        <div v-if="!loading" class="text-center">
          <h5 class="text-muted mb-0">Current Month Spending</h5>
          <h2 class="text-primary fw-bold display-6">
            ${{ currentMonthSpending.toFixed(2) }}
          </h2>
        </div>
      </div>

      <div class="col-md-6">
        <div v-if="!loading" class="text-center">
          <h5 class="text-muted mb-0">All-Time Total Spending</h5>
          <h2 class="text-primary fw-bold display-6">
            ${{ allTimeSpending.toFixed(2) }}
          </h2>
        </div>
      </div>

    </div> <div class="row">
      <div class="col-12 mb-4">
        <div class="card shadow-sm">
          <div class="card-body">
            <h5 class="card-title">Monthly Spending (Last 6 Months)</h5>
            
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
    </div> <div class="row">
      <div class="col-12">
        <div class="card shadow-sm">
          <div class="card-body">
            <h5 class="card-title">My Job Postings</h5>
            
            <div class="job-list-container">
              <ul v-if="!loading" class="list-group list-group-flush">
                <li v-if="allFetchedJobs.length === 0" class="list-group-item">
                  You have not posted any jobs.
                </li>

                <li v-for="job in allFetchedJobs" :key="job.id" class="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 class="mb-0">{{ job.title || 'Job Title Missing' }}</h6>
                    <small class="text-muted">{{ formatJobDate(job.created_at) }}</small>
                  </div>
                  <div class="text-end">
                    <span :class="getStatusBadgeClass(job.status)" class="badge rounded-pill mb-1">{{ job.status }}</span>
                    <div class="fs-6 fw-bold text-dark">${{ job.payment.toFixed(2) }}</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div> </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../supabase/config';

// Refs
const loading = ref(true);
const error = ref(null);
const allFetchedJobs = ref([]); 
const currentMonthSpending = ref(0);
const allTimeSpending = ref(0);

// ApexCharts Refs
const chartSeries = ref([{
  name: 'Spending',
  data: []
}]);

const chartOptions = ref({
  chart: {
    type: 'bar',
    height: 300,
    toolbar: { show: false }
  },
  states: {
    hover: {
      filter: { type: 'darken', value: 0.85 }
    }
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '60%',
      borderRadius: 4
    },
  },
  dataLabels: { enabled: false },
  stroke: {
    show: true,
    width: 2,
    colors: ['transparent']
  },
  xaxis: {
    categories: [],
    title: { text: 'Month' }
  },
  yaxis: {
    title: { text: 'Spending ($)' },
    labels: {
      formatter: function (val) {
        return "$" + val.toFixed(0);
      }
    }
  },
  // CHANGED: Color to Bootstrap primary blue
  colors: ['#0d6efd'], 
  fill: { opacity: 1 },
  tooltip: {
    y: {
      formatter: function (val) {
        return "$ " + val
      }
    }
  }
});

// --- Data Fetching ---
onMounted(async () => {
  try {
    // 1. Get the currently logged-in user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) {
      error.value = "You must be logged in to see this page.";
      loading.value = false;
      return; // Stop running the function
    }
    
    // 2. Use the user's REAL ID for the query
    const userId = user.id;

    // Query User-Job-Request table using the dynamic userId
    const { data: jobData, error: fetchError } = await supabase
      .from('User-Job-Request')
      .select('id, created_at, payment, title, status')
      .eq('user_id', userId) // <-- Uses the real user ID
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    allFetchedJobs.value = jobData;

    // Create 6-month buckets for the chart
    const today = new Date();
    const monthlyTotals = new Map();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyTotals.set(monthKey, 0);
    }
    
    // Process ALL data in one loop
    let allTimeTotal = 0;
    
    for (const job of jobData) {
      if (job.status === 'completed') {
        allTimeTotal += job.payment;
        const date = new Date(job.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (monthlyTotals.has(monthKey)) {
          const currentTotal = monthlyTotals.get(monthKey);
          monthlyTotals.set(monthKey, currentTotal + job.payment);
        }
      }
    }
    
    allTimeSpending.value = allTimeTotal;

    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    currentMonthSpending.value = monthlyTotals.get(currentMonthKey) || 0.00;

    // Format chart data
    const categories = [];
    const seriesData = [];
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });

    for (const [monthKey, total] of monthlyTotals.entries()) {
      const date = new Date(`${monthKey}-02`);
      categories.push(monthFormatter.format(date));
      seriesData.push(total.toFixed(2));
    }

    // Update the chart refs
    chartSeries.value = [{
      name: 'Spending',
      data: seriesData
    }];
    
    chartOptions.value = {
      ...chartOptions.value,
      xaxis: {
        ...chartOptions.value.xaxis,
        categories: categories
      }
    };

  } catch (err) {
    console.error('Error fetching spending data:', err);
    error.value = `Failed to load spending data: ${err.message}`;
  } finally {
    loading.value = false;
  }
});

// Helper function for status badges
function getStatusBadgeClass(status) {
  switch (status) {
    case 'open':
      return 'bg-primary';
    case 'in-progress': // Assuming a status like 'in-progress'
      return 'bg-warning text-dark';
    case 'completed':
      return 'bg-success';
    case 'cancelled':
      return 'bg-secondary';
    default:
      return 'bg-light text-dark';
  }
}

// Helper Function
function formatJobDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
</script>

<style scoped>
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
/* CHANGED: Swapped .text-danger for .text-primary */
.text-primary {
  color: #0d6efd !important;
}
.job-list-container {
  max-height: 400px; 
  overflow-y: auto;
}
</style>