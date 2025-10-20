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
            
            <div v-show="!loading && !error" ref="chartDiv" style="width: 100%; height: 300px;"></div>
          </div>
        </div>
      </div>
    </div> <div class="row">
      <div class="col-12">
        <div class="card shadow-sm">
          <div class="card-body">
            <h5 class="card-title">Recent Jobs</h5>
            
            <ul v-if="!loading" class="list-group list-group-flush">
              <li v-if="allFetchedEarnings.length === 0" class="list-group-item">
                No recent jobs found.
              </li>
              
              <li v-for="job in displayedJobs" :key="job.id" class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <h6 class="mb-0">{{ job.job_title || 'Job Title Missing' }}</h6>
                  <small class="text-muted">{{ formatJobDate(job.created_at) }}</small>
                </div>
                <span class="badge bg-success rounded-pill fs-6">+${{ job.net_amount.toFixed(2) }}</span>
              </li>
            </ul>

            <div v-if="!loading && allFetchedEarnings.length > 5" class="pt-3 border-top">
              <button @click="toggleShowAllJobs" class="btn btn-outline-primary w-100">
                {{ showAllJobs ? 'Show Less' : 'Show All' }}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div> </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { supabase } from '../supabase/config';

// Refs
const loading = ref(true);
const error = ref(null);
const chartDiv = ref(null);
const allFetchedEarnings = ref([]); 
const showAllJobs = ref(false);
const currentMonthEarnings = ref(0);
const allTimeEarnings = ref(0);

// Hardcoded User ID
const userId = 'acb526f9-ce48-4136-a03b-6e83f4c6a4e5';

const displayedJobs = computed(() => {
  if (showAllJobs.value) {
    return allFetchedEarnings.value;
  }
  return allFetchedEarnings.value.slice(0, 5);
});

function toggleShowAllJobs() {
  showAllJobs.value = !showAllJobs.value;
}

// --- Google Charts Loader ---
let googleChartsLoaded = null;
function loadGoogleCharts() {
  if (!googleChartsLoaded) {
    googleChartsLoaded = new Promise((resolve) => {
      if (window.google && window.google.charts) {
        resolve();
      } else {
        const script = document.createElement('script');
        script.src = 'https://www.gstatic.com/charts/loader.js';
        script.onload = () => {
          window.google.charts.load('current', { packages: ['corechart'] });
          window.google.charts.setOnLoadCallback(resolve);
        };
        document.head.appendChild(script);
      }
    });
  }
  return googleChartsLoaded;
}

// --- Data Fetching ---
onMounted(async () => {
  try {
    await loadGoogleCharts();

    // Query fetches ALL earnings for the user
    const { data: earningsData, error: fetchError } = await supabase
      .from('Earnings')
      .select('id, created_at, net_amount, job_title, status')
      .eq('user_id', userId)
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
      if (earning.status === 'cleared') {
        // 1. Add to All-Time Total
        allTimeTotal += earning.net_amount;

        // 2. Add to 6-Month Chart (if it's in the map)
        const date = new Date(earning.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (monthlyTotals.has(monthKey)) {
          const currentTotal = monthlyTotals.get(monthKey);
          monthlyTotals.set(monthKey, currentTotal + earning.net_amount);
        }
      }
    }
    
    allTimeEarnings.value = allTimeTotal;

    // Get current month's total from the map
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    currentMonthEarnings.value = monthlyTotals.get(currentMonthKey) || 0.00;

    // Format chart data
    const chartData = [];
    for (const [month, total] of monthlyTotals.entries()) {
      chartData.push({ earning_month: month, total_earnings: total });
    }
    
    drawChart(chartData);

  } catch (err) {
    console.error('Error fetching earnings data:', err);
    error.value = `Failed to load earnings data: ${err.message}`;
  } finally {
    loading.value = false;
  }
});

// --- Chart Drawing Function ---
function drawChart(data) {
  if (!data || data.length === 0) {
    error.value = "No chart data available.";
    return;
  }
  
  const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
  const dataTableArray = [
    ['Month', 'Earnings', { role: 'style' }]
  ];
  
  data.forEach(row => {
    const date = new Date(`${row.earning_month}-02`); 
    const monthName = monthFormatter.format(date);
    // Uses the green color
    dataTableArray.push([monthName, Number(row.total_earnings), 'color: #1b9e77']);
  });

  const dataTable = window.google.visualization.arrayToDataTable(dataTableArray);

const options = {
    title: 'Monthly Earnings',
    fontName: 'Arial',
    titleTextStyle: {
      color: '#333',
      fontSize: 18,
      bold: true
    },
    backgroundColor: '',
    colors: ['#1b9e77'],
    chartArea: { 
      //width: '85%', 
      height: '70%',
      backgroundColor: '#ffffff'
    },
    hAxis: {
      title: 'Month',
      textStyle: { color: '#555' }
    },
    vAxis: {
      title: 'Earnings ($)',
      textStyle: { color: '#555' },
      format: 'short',
      minValue: 0,
      gridlines: {
        color: '#e9ecef',
        count: 5
      }
    },
    legend: { position: 'none' },
    bar: { groupWidth: '60%' },
  };

  const chart = new window.google.visualization.ColumnChart(chartDiv.value);
  chart.draw(dataTable, options);
}

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

/* Hover effect for chart bars */
:deep(div[ref="chartDiv"] rect) {
  transition: filter 0.2s ease-in-out;
}

:deep(div[ref="chartDiv"] rect:hover) {
  filter: brightness(85%);
  cursor: pointer;
}
</style>