<template>
  <div class="container mt-4">

    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2 class="mb-0">My Earnings</h2>
      <button
        @click="generateEarningsPDF"
        :disabled="isGeneratingPDF || loading"
        class="btn btn-primary btn-lg d-flex align-items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-download me-2" viewBox="0 0 16 16">
          <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
          <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
        </svg>
        {{ isGeneratingPDF ? 'Generating...' : 'Download Yearly PDF' }}
      </button>
    </div>

    <div class="row mb-4">
      <div class="col-md-6 mb-3 mb-md-0">
        <div v-if="!loading" class="stat-box text-center p-3 border rounded">
          <h5 class="text-muted mb-0">Current Month Total</h5>
          <h2 class="text-success fw-bold display-6">
            +${{ currentMonthEarnings.toFixed(2) }}
          </h2>
        </div>
        <div v-else class="stat-box text-center p-3 border rounded placeholder-glow">
           <span class="placeholder col-6"></span>
           <span class="placeholder col-8 d-block mt-2"></span>
        </div>
      </div>
      <div class="col-md-6">
        <div v-if="!loading" class="stat-box text-center p-3 border rounded">
          <h5 class="text-muted mb-0">All-Time Total Earnings</h5>
          <h2 class="text-success fw-bold display-6">
            +${{ allTimeEarnings.toFixed(2) }}
          </h2>
        </div>
         <div v-else class="stat-box text-center p-3 border rounded placeholder-glow">
           <span class="placeholder col-6"></span>
           <span class="placeholder col-8 d-block mt-2"></span>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-12 mb-4">
        <div class="card shadow-sm">
          <div class="card-body">
            <h5 class="card-title">Earnings (Last 6 Months)</h5>
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
            <h5 class="card-title">Recent Earnings History</h5>
            <div v-if="loading && allFetchedEarnings.length === 0" class="placeholder-glow">
              <span class="placeholder col-12 mb-2 d-block" style="height: 40px;"></span>
              <span class="placeholder col-12 mb-2 d-block" style="height: 40px;"></span>
              <span class="placeholder col-12 mb-2 d-block" style="height: 40px;"></span>
            </div>
            <div v-else class="job-list-container">
              <ul class="list-group list-group-flush">
                <li v-if="!loading && allFetchedEarnings.length === 0" class="list-group-item text-muted text-center py-3">
                  No earnings recorded yet.
                </li>
                <li v-for="job in allFetchedEarnings" :key="job.id" class="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 class="mb-0">{{ job.job_title || 'Job Title Missing' }}</h6>
                    <small class="text-muted">{{ formatJobDate(job.created_at) }}</small>
                  </div>
                  <span class="badge bg-success rounded-pill fs-6">+${{ (job.net_amount || 0).toFixed(2) }}</span>
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
// 👇 Ensure these imports are at the VERY TOP
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Import the function directly

import { ref, onMounted } from 'vue';
import { supabase } from '../supabase/config';
// Assuming apexchart component is globally registered or imported if used in your project setup

// --- State ---
const loading = ref(true);
const error = ref(null);
const allFetchedEarnings = ref([]);
const currentMonthEarnings = ref(0);
const allTimeEarnings = ref(0);
const isGeneratingPDF = ref(false);

// --- ApexCharts Refs ---
const chartSeries = ref([{ name: 'Earnings', data: [] }]);
const chartOptions = ref({
  chart: { type: 'bar', height: 300, toolbar: { show: false } },
  states: { hover: { filter: { type: 'darken', value: 0.85 } } },
  plotOptions: { bar: { horizontal: false, columnWidth: '60%', borderRadius: 4 } },
  dataLabels: { enabled: false },
  stroke: { show: true, width: 2, colors: ['transparent'] },
  xaxis: { categories: [], title: { text: 'Month' } },
  yaxis: { title: { text: 'Earnings ($)' }, labels: { formatter: (val) => "$" + val.toFixed(0) } },
  colors: ['#1b9e77'], // Green color
  fill: { opacity: 1 },
  tooltip: { y: { formatter: (val) => "$ " + parseFloat(val).toFixed(2) } } // Ensure tooltip shows decimals
});

// --- Data Fetching ---
onMounted(async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw authError || new Error("User not found.");
    const userId = user.id;

    const { data: earningsData, error: fetchError } = await supabase
      .from('Earnings')
      .select('id, created_at, net_amount, job_title, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    allFetchedEarnings.value = earningsData || [];
    processEarningsData(earningsData || []);

  } catch (err) {
    console.error('Error fetching earnings data:', err);
    error.value = `Failed to load earnings data: ${err.message}`;
  } finally {
    loading.value = false;
  }
});

// --- Process Data ---
function processEarningsData(earningsData) {
    const today = new Date();
    const monthlyTotals = new Map();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyTotals.set(monthKey, 0);
    }

    let allTimeTotal = 0;
    for (const earning of earningsData) {
      const netAmount = Number(earning.net_amount) || 0;
      if (earning.status === 'completed') {
        allTimeTotal += netAmount;
        if (earning.created_at) {
          const date = new Date(earning.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (monthlyTotals.has(monthKey)) {
            monthlyTotals.set(monthKey, monthlyTotals.get(monthKey) + netAmount);
          }
        }
      }
    }

    allTimeEarnings.value = allTimeTotal;
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    currentMonthEarnings.value = monthlyTotals.get(currentMonthKey) || 0.00;
    updateChart(monthlyTotals);
}

// --- Update Chart ---
function updateChart(monthlyTotals) {
    const categories = [];
    const seriesData = [];
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });

    for (const [monthKey, total] of monthlyTotals.entries()) {
      const date = new Date(`${monthKey}-02T00:00:00`); // Use ISO format for consistency
      categories.push(monthFormatter.format(date));
      seriesData.push(total.toFixed(2));
    }

    chartSeries.value = [{ name: 'Earnings', data: seriesData }];
    chartOptions.value = {
      ...chartOptions.value,
      xaxis: { ...chartOptions.value.xaxis, categories: categories }
    };
}

// --- PDF Generation Function ---
const generateEarningsPDF = async () => {
  if (isGeneratingPDF.value || loading.value) return;

  isGeneratingPDF.value = true;
  console.log('Generating PDF report...');

  try {
    const { data: { user } } = await supabase.auth.getUser();
    const username = user?.email || 'User';

    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 1);
    const dateRangeStr = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;

    const oneYearAgo = startDate.getTime();
    const earningsLastYear = allFetchedEarnings.value.filter(earning => {
      if (!earning.created_at) return false;
      const earningDate = new Date(earning.created_at).getTime();
      return earningDate >= oneYearAgo && earning.status === 'completed';
    }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const totalEarningsLastYear = earningsLastYear.reduce((sum, earning) => sum + (Number(earning.net_amount) || 0), 0);

    const doc = new jsPDF(); // Create instance AFTER imports

    doc.setFontSize(18);
    doc.text('Earnings Report', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`User: ${username}`, 14, 30);
    doc.text(`Period: ${dateRangeStr}`, 14, 36);
    doc.text(`Total Earnings (Past Year): $${totalEarningsLastYear.toFixed(2)}`, 14, 42);

    const tableColumn = ["Date", "Job Title", "Amount ($)"];
    const tableRows = [];
    earningsLastYear.forEach(earning => {
      tableRows.push([
        formatJobDate(earning.created_at),
        earning.job_title || 'N/A',
        (Number(earning.net_amount) || 0).toFixed(2),
      ]);
    });

    // Use the imported autoTable function
    autoTable(doc, { // Pass doc instance here
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      theme: 'grid',
      headStyles: { fillColor: [22, 160, 133] },
      styles: { fontSize: 10 },
      columnStyles: { 2: { halign: 'right' } },
      didDrawPage: function (data) {
        if (tableRows.length === 0) {
          doc.setFontSize(10);
          doc.setTextColor(150);
          doc.text("No completed earnings recorded in this period.", 14, data.cursor.y + 10);
        }
      }
    });

    const fileName = `Earnings_Report_${endDate.toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    console.log('PDF report generated:', fileName);

  } catch (err) {
    console.error('Error generating PDF:', err);
    // Keep specific error check if needed, but the import method should fix it
    if (err instanceof TypeError && err.message.includes("autoTable is not a function")) {
        alert('Failed to generate PDF: PDF library component (autoTable) may not have loaded correctly. Please try refreshing the page.');
    } else {
        alert('Failed to generate PDF report. Please check the console for errors.');
    }
  } finally {
    isGeneratingPDF.value = false;
  }
};
// --- END PDF FUNCTION ---

// --- Helper Function ---
function formatJobDate(dateString) {
  if (!dateString) return 'Invalid Date';
  try {
    // Format as DD MMM YYYY for clarity
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  } catch (e) {
    console.error("Error formatting date:", dateString, e);
    return 'Invalid Date';
  }
}
</script>

<style scoped>
/* Using Bootstrap classes mostly, but adding specific styles */
.card {
  border: none; /* Remove default border */
  border-radius: 0.75rem; /* Smoother corners */
}
.stat-box {
  background-color: #fff; /* White background for stat boxes */
}
.job-list-container {
  max-height: 400px;
  overflow-y: auto;
}
/* Style adjustments for the download button */
.btn-lg {
    padding: 0.75rem 1.25rem;
    font-size: 1.1rem;
    border-radius: 0.5rem;
}
.btn-primary {
    color: #fff;
    background-color: #0d6efd;
    border-color: #0d6efd;
}
.btn-primary:hover {
    color: #fff;
    background-color: #0b5ed7;
    border-color: #0a58ca;
}
.d-flex { display: flex !important; }
.align-items-center { align-items: center !important; }
.me-2 { margin-right: 0.5rem !important; }
.mb-0 { margin-bottom: 0 !important; }

/* Placeholder styles */
.placeholder {
    display: inline-block;
    min-height: 1em;
    vertical-align: middle;
    cursor: wait;
    background-color: currentColor;
    opacity: 0.5;
}
.placeholder.col-6 { width: 50%; }
.placeholder.col-8 { width: 66.66666667%; }
.placeholder.col-12 { width: 100%; }
.placeholder-glow .placeholder { animation: placeholder-glow 2s ease-in-out infinite; }
@keyframes placeholder-glow {
  50% { opacity: 0.2; }
}
</style>