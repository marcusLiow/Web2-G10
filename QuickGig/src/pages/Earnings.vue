<template>
  <div class="container mt-4">
    
    <h2 class="mb-3 text-center">My Earnings</h2>

    <div class="row mb-4">
      
      <div class="col-md-6">
        <div v-if="!loading" class="text-center">
          <h5 class="text-muted mb-0">Current Month Total</h5>
          <h2 class="text-success fw-bold display-6">
            +${{ currentMonthEarnings.toFixed(2) }}
          </h2>
        </div>
      </div>

      <div class="col-md-6">
        <div v-if="!loading" class="text-center">
          <h5 class="text-muted mb-0">All-Time Total Earnings</h5>
          <h2 class="text-success fw-bold display-6">
            +${{ allTimeEarnings.toFixed(2) }}
          </h2>
        </div>
      </div>

    </div> <div class="row">
      <div class="col-12 mb-4">
        <div class="card shadow-sm">
          <div class="card-body">
            <h5 class="card-title">Last 6 Months</h5>
            
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
            <h5 class="card-title">Recent Jobs</h5>
            
            <div class="job-list-container">
              <ul v-if="!loading" class="list-group list-group-flush">
                <li v-if="allFetchedEarnings.length === 0" class="list-group-item">
                  No recent jobs found.
                </li>

                <li v-for="job in allFetchedEarnings" :key="job.id" class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <h6 class="mb-0">{{ job.job_title || 'Job Title Missing' }}</h6>
                  <small class="text-muted">{{ formatJobDate(job.created_at) }}</small>
                </div>
                <span class="badge bg-success rounded-pill fs-6">+${{ job.net_amount.toFixed(2) }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div> </div> </div></template>

<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../supabase/config';

// Refs
const loading = ref(true);
const error = ref(null);
const allFetchedEarnings = ref([]); 
const currentMonthEarnings = ref(0);
const allTimeEarnings = ref(0);

// --- APEXCHARTS REFS ---
const chartSeries = ref([{
  name: 'Earnings',
  data: []
}]);

const chartOptions = ref({
  chart: {
    type: 'bar',
    height: 300,
    toolbar: {
      show: false // Hides the hamburger menu
    }
  },
  states: {
    hover: {
      filter: {
        type: 'darken',
        value: 0.85 
      }
    }
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '60%',
      borderRadius: 4 // Adds slightly rounded bars
    },
  },
  dataLabels: {
    enabled: false // Hides the numbers on the bars
  },
  stroke: {
    show: true,
    width: 2,
    colors: ['transparent']
  },
  xaxis: {
    categories: [], // We will fill this from our data
    title: {
      text: 'Month'
    }
  },
  yaxis: {
    title: {
      text: 'Earnings ($)'
    },
    labels: {
      // Formats the y-axis labels
      formatter: function (val) {
        return "$" + val.toFixed(0);
      }
    }
  },
  colors: ['#1b9e77'], // Your green color
  fill: {
    opacity: 1
  },
  tooltip: {
    // Formats the hover tooltip
    y: {
      formatter: function (val) {
        return "$ " + val
      }
    }
  }
});
// --- END OF APEXCHARTS REFS ---

// --- Data Fetching ---
onMounted(async () => {
  try {
    // --- THIS IS THE CHANGE ---
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
    // --- END OF CHANGE ---


    // Query fetches ALL earnings for the user
    const { data: earningsData, error: fetchError } = await supabase
      .from('Earnings')
      .select('id, created_at, net_amount, job_title, status')
      .eq('user_id', userId) // <-- This now uses the real userId
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    allFetchedEarnings.value = earningsData;

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
    
    for (const earning of earningsData) {
      if (earning.status === 'completed') {
        allTimeTotal += earning.net_amount;
        const date = new Date(earning.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (monthlyTotals.has(monthKey)) {
          const currentTotal = monthlyTotals.get(monthKey);
          monthlyTotals.set(monthKey, currentTotal + earning.net_amount);
        }
      }
    }
    
    allTimeEarnings.value = allTimeTotal;

    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    currentMonthEarnings.value = monthlyTotals.get(currentMonthKey) || 0.00;

    // Format chart data
    const categories = [];
    const seriesData = [];
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });

    for (const [monthKey, total] of monthlyTotals.entries()) {
      const date = new Date(`${monthKey}-02`);
      categories.push(monthFormatter.format(date));
      seriesData.push(total.toFixed(2)); // Send as string with 2 decimals
    }

    // Update the chart refs
    chartSeries.value = [{
      name: 'Earnings',
      data: seriesData
    }];
    
    // This is the correct way to update a nested ref object
    chartOptions.value = {
      ...chartOptions.value, // Keep existing options
      xaxis: {
        ...chartOptions.value.xaxis,
        categories: categories // Set the x-axis labels
      }
    };

  } catch (err) {
    console.error('Error fetching earnings data:', err);
    error.value = `Failed to load earnings data: ${err.message}`;
  } finally {
    loading.value = false;
  }
});

// --- Helper Function ---
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
.job-list-container {
  /* Set a fixed height for your list */
  max-height: 400px; 

  /* This adds a vertical scrollbar ONLY when the list is taller than 400px */
  overflow-y: auto;
}
</style>