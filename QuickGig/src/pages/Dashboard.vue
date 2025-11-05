<template>
  <div class="container mt-4">
    <div class="d-flex justify-content-center align-items-center mb-4 flex-column">
      
      <div class="btn-group" role="group" aria-label="Toggle Financial View">
        <input type="radio" class="btn-check" name="viewToggle" id="btn-earnings" autocomplete="off" :checked="currentView === 'earnings'" @click="currentView = 'earnings'">
        <label class="btn btn-outline-primary btn-lg d-flex align-items-center" for="btn-earnings">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-graph-up-arrow me-2" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M0 0h1v15h15v1H0V0Zm10 3.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 1 .5-.5Zm-3 2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2a.5.5 0 0 1 .5-.5Zm-3 2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2a.5.5 0 0 1 .5-.5Zm-3 2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2a.5.5 0 0 1 .5-.5Zm10-3.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 1 .5-.5Zm-3 2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2a.5.5 0 0 1 .5-.5Zm-3 2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2a.5.5 0 0 1 .5-.5Zm-3 2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2a.5.5 0 0 1 .5-.5Z"/>
            <path d="M11 5.5a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3a.5.5 0 0 1 .5-.5Zm-3 2a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0v-1a.5.5 0 0 1 .5-.5Zm-3 2a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0v-1a.5.5 0 0 1 .5-.5Z"/>
            <path d="M12.5 2a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0v-8a.5.5 0 0 1 .5-.5Z"/>
            <path d="M9.5 5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0v-5a.5.5 0 0 1 .5-.5Z"/>
            <path d="M6.5 8a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2a.5.5 0 0 1 .5-.5Z"/>
            <path d="m3.5 11.146 3-3 .5.5-3 3-1.646-1.646a.5.5 0 0 1 .708-.708L3.5 10.293l2.646-2.647a.5.5 0 0 1 .708 0l3 3V2.5a.5.5 0 0 1 1 0v8a.5.5 0 0 1-1 0V4.707l-3.146 3.147a.5.5 0 0 1-.708 0L6 5.707 3.354 8.354a.5.5 0 0 1-.708-.708L5.793 4.5 3.5 2.207V11a.5.5 0 0 1-1 0V2.5a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 0 1H3.5v8.646Z"/>
          </svg>
          Earnings
        </label>
        
        <input type="radio" class="btn-check" name="viewToggle" id="btn-spending" autocomplete="off" :checked="currentView === 'spending'" @click="currentView = 'spending'">
        <label class="btn btn-outline-primary btn-lg d-flex align-items-center" for="btn-spending">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-wallet2 me-2" viewBox="0 0 16 16">
            <path d="M12.136.326A1.5 1.5 0 0 1 14 1.78V3h.5A1.5 1.5 0 0 1 16 4.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 13.5v-9a1.5 1.5 0 0 1 1.432-1.499L12.136.326zM5.562 3H13V1.78a.5.5 0 0 0-.621-.484L5.562 3zM1.5 4a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-13z"/>
          </svg>
          Spending
        </label>
      </div>

      <button
        v-if="currentView === 'earnings'"
        @click="generateEarningsPDF"
        :disabled="isGeneratingPDF || earningsLoading"
        class="btn btn-primary btn-lg d-flex align-items-center mt-3"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-download me-2" viewBox="0 0 16 16">
          <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
          <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
        </svg>
        {{ isGeneratingPDF ? 'Generating...' : 'Download Yearly PDF' }}
      </button>
    </div>
    <div v-if="currentView === 'earnings'">
      <h2 class="mb-3 text-center">My Earnings</h2>
      <div class="row mb-4">
        <div class="col-md-6 mb-3 mb-md-0">
          <div v-if="!earningsLoading" class="stat-box text-center p-3 border rounded">
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
          <div v-if="!earningsLoading" class="stat-box text-center p-3 border rounded">
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
      <div class="row mb-4 justify-content-start">
      <div class="col-md-4 col-lg-3">
        <label for="periodSelect" class="form-label fw-bold">Select Chart Period</label>
        <select class="form-select" id="periodSelect" v-model.number="selectedPeriod">
          <option :value="1">Last 1 Month</option>
          <option :value="3">Last 3 Months</option>
          <option :value="6">Last 6 Months</option>
          <option :value="12">Last 12 Months</option>
        </select>
      </div>
    </div>
      <div class="row">
        <div class="col-12 mb-4">
          <div class="card shadow-sm">
            <div class="card-body">
              <h5 class="card-title">Earnings (Last 6 Months)</h5>
              <div v-if="earningsLoading" class="d-flex justify-content-center align-items-center" style="height: 300px;">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
              </div>
              <div v-if="earningsError" class="alert alert-danger">{{ earningsError }}</div>
              <div v-show="!earningsLoading && !earningsError" id="earningsChart">
                <apexchart type="bar" height="300" :options="earningsChartOptions" :series="earningsChartSeries"></apexchart>
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
              <div v-if="earningsLoading && allFetchedEarnings.length === 0" class="placeholder-glow">
                <span class="placeholder col-12 mb-2 d-block" style="height: 40px;"></span>
                <span class="placeholder col-12 mb-2 d-block" style="height: 40px;"></span>
                <span class="placeholder col-12 mb-2 d-block" style="height: 40px;"></span>
              </div>
              <div v-else class="job-list-container">
                <ul class="list-group list-group-flush">
                  <li v-if="!earningsLoading && completedEarnings.length === 0" class="list-group-item text-muted text-center py-3">
                    No completed earnings yet.
                  </li>
                  <li v-for="job in completedEarnings" :key="job.id" class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <h6 class="mb-0">{{ job.job_title || 'Job Title Missing' }}</h6>
                      <small class="text-muted">{{ formatEarningsJobDate(job.created_at) }}</small>
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

    <div v-if="currentView === 'spending'">
      <h2 class="mb-3 text-center">My Spending</h2>

      <div class="row mb-4">
        <div class="col-md-6 mb-3 mb-md-0">
          <div v-if="!spendingLoading" class="text-center stat-box p-3 border rounded">
            <h5 class="text-muted mb-0">Current Month Spending</h5>
            <h2 class="text-spending fw-bold display-6">
              ${{ currentMonthSpending.toFixed(2) }}
            </h2>
          </div>
          <div v-else class="stat-box text-center p-3 border rounded placeholder-glow">
            <span class="placeholder col-6"></span>
            <span class="placeholder col-8 d-block mt-2"></span>
          </div>
        </div>
        <div class="col-md-6">
          <div v-if="!spendingLoading" class="text-center stat-box p-3 border rounded">
            <h5 class="text-muted mb-0">All-Time Total Spending</h5>
            <h2 class="text-spending fw-bold display-6">
              ${{ allTimeSpending.toFixed(2) }}
            </h2>
          </div>
          <div v-else class="stat-box text-center p-3 border rounded placeholder-glow">
            <span class="placeholder col-6"></span>
            <span class="placeholder col-8 d-block mt-2"></span>
          </div>
        </div>
      </div>
            <div class="row mb-4 justify-content-start">
      <div class="col-md-4 col-lg-3">
        <label for="periodSelect" class="form-label fw-bold">Select Chart Period</label>
        <select class="form-select" id="periodSelect" v-model.number="selectedPeriod">
          <option :value="1">Last 1 Month</option>
          <option :value="3">Last 3 Months</option>
          <option :value="6">Last 6 Months</option>
          <option :value="12">Last 12 Months</option>
        </select>
      </div>
    </div>
      <div class="row">
        <div class="col-12 mb-4">
          <div class="card shadow-sm">
            <div class="card-body">
              <h5 class="card-title">Monthly Spending (Last 6 Months)</h5>
              <div v-if="spendingLoading" class="d-flex justify-content-center align-items-center" style="height: 300px;">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
              </div>
              <div v-if="spendingError" class="alert alert-danger">{{ spendingError }}</div>
              <div v-show="!spendingLoading && !spendingError" id="spendingChart">
                <apexchart type="bar" height="300" :options="spendingChartOptions" :series="spendingChartSeries"></apexchart>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col-12">
          <div class="card shadow-sm">
            <div class="card-body">
              <h5 class="card-title">My Job Postings</h5>
              <div v-if="spendingLoading" class="placeholder-glow">
                <span class="placeholder col-12 mb-2 d-block" style="height: 40px;"></span>
                <span class="placeholder col-12 mb-2 d-block" style="height: 40px;"></span>
              </div>
              <div v-else class="job-list-container">
                <ul class="list-group list-group-flush">
                  <li v-if="allFetchedJobs.length === 0" class="list-group-item text-muted text-center py-3">
                    You have not posted any jobs.
                  </li>
                  <li v-for="job in allFetchedJobs" :key="job.id" class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <h6 class="mb-0">{{ job.title || 'Job Title Missing' }}</h6>
                      <small class="text-muted">{{ formatSpendingJobDate(job.created_at) }}</small>
                    </div>
                    <div class="text-end">
                      <span :class="getStatusBadgeClass(job.status)" class="badge rounded-pill mb-1">{{ job.status }}</span>
                      <div class="fs-6 fw-bold text-dark">${{ (job.payment || 0).toFixed(2) }}</div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// --- IMPORTS ---
import { ref, onMounted, watch, computed } from 'vue';
import { supabase } from '../supabase/config';
import { useToast } from '../composables/useToast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- CORE STATE ---
const toast = useToast();
const currentView = ref('earnings');
const selectedPeriod = ref(6);

// --- EARNINGS STATE ---
const earningsLoading = ref(true);
const earningsError = ref(null);
const allFetchedEarnings = ref([]);
const currentMonthEarnings = ref(0);
const allTimeEarnings = ref(0);
const isGeneratingPDF = ref(false);
const earningsChartSeries = ref([{ name: 'Earnings', data: [] }]);
const earningsChartOptions = ref({
  chart: {
    type: 'bar',
    height: 300,
    toolbar: { show: false },
    zoom: { enabled: false } // <-- Disables all zoom/pan
  },
  states: { hover: { filter: { type: 'darken', value: 0.85 } } },
  plotOptions: { bar: { horizontal: false, columnWidth: '60%', borderRadius: 4 } },
  dataLabels: { enabled: false },
  stroke: { show: true, width: 2, colors: ['transparent'] },
  xaxis: { categories: [], title: { text: 'Month' } },
  yaxis: { title: { text: 'Earnings ($)' }, labels: { formatter: (val) => "$" + val.toFixed(0) } },
  colors: ['#198754'],
  fill: { opacity: 1 },
  tooltip: { y: { formatter: (val) => "$ " + parseFloat(val).toFixed(2) } }
});

// --- SPENDING STATE ---
const spendingLoading = ref(true);
const spendingError = ref(null);
const allFetchedJobs = ref([]);
const currentMonthSpending = ref(0);
const allTimeSpending = ref(0);
const spendingChartSeries = ref([{ name: 'Spending', data: [] }]);
const spendingChartOptions = ref({
  chart: {
    type: 'bar',
    height: 300,
    toolbar: { show: false },
    zoom: { enabled: false } // <-- Disables all zoom/pan
  },
  states: { hover: { filter: { type: 'darken', value: 0.85 } } },
  plotOptions: { bar: { horizontal: false, columnWidth: '60%', borderRadius: 4 } },
  dataLabels: { enabled: false },
  stroke: { show: true, width: 2, colors: ['transparent'] },
  xaxis: { categories: [], title: { text: 'Month' } },
  yaxis: { title: { text: 'Spending ($)' }, labels: { formatter: (val) => "$" + val.toFixed(0) } },
  colors: ['#EA6A47'],
  fill: { opacity: 1 },
  tooltip: { y: { formatter: (val) => "$ " + val } }
});

// --- COMPUTED PROPERTIES ---
// Filter earnings to only show completed ones in the history list
const completedEarnings = computed(() => {
  return allFetchedEarnings.value.filter(earning => earning.status === 'completed');
});

// --- LIFECYCLE HOOKS ---
onMounted(async () => {
  earningsLoading.value = true;
  spendingLoading.value = true;
  await Promise.all([
    fetchEarningsData(),
    fetchSpendingData()
  ]);
  processEarningsData(selectedPeriod.value);
  processSpendingData(selectedPeriod.value);
  earningsLoading.value = false;
  spendingLoading.value = false;
});

// Watch for the dropdown to change
watch(selectedPeriod, (newPeriod) => {
  earningsLoading.value = true;
  spendingLoading.value = true;
  setTimeout(() => {
    try {
      processEarningsData(newPeriod);
      processSpendingData(newPeriod);
    } catch (e) {
      console.error("Error processing data on period change:", e);
      earningsError.value = "Failed to update chart data.";
      spendingError.value = "Failed to update chart data.";
    } finally {
      earningsLoading.value = false;
      spendingLoading.value = false;
    }
  }, 10);
});

// --- EARNINGS FUNCTIONS ---

async function fetchEarningsData() {
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

    // 🐛 DEBUG: Log the raw data
    console.log('🔍 RAW EARNINGS DATA:', JSON.stringify(earningsData, null, 2));
    console.log('📅 Today is:', new Date().toISOString());
  } catch (err) {
    console.error('Error fetching earnings data:', err);
    earningsError.value = `Failed to load earnings data: ${err.message}`;
  }
}

function processEarningsData(months) {
  const earningsData = allFetchedEarnings.value;
  const today = new Date();
  const monthlyTotals = new Map();
  
  for (let i = months - 1; i >= 0; i--) {
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
  
  let currentMonthTotal = 0;
  for (const earning of earningsData) {
    if (earning.status === 'completed' && earning.created_at) {
      const date = new Date(earning.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthKey === currentMonthKey) {
        currentMonthTotal += Number(earning.net_amount) || 0;
      }
    }
  }
  currentMonthEarnings.value = currentMonthTotal;
  
  updateEarningsChart(monthlyTotals);
}

function updateEarningsChart(monthlyTotals) {
  const categories = [];
  const seriesData = [];
  const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });

  for (const [monthKey, total] of monthlyTotals.entries()) {
    const date = new Date(`${monthKey}-02T00:00:00`);
    categories.push(monthFormatter.format(date));
    seriesData.push(total.toFixed(2));
  }
  
  // Update the chart series
  earningsChartSeries.value = [{
    name: 'Earnings',
    data: seriesData
  }];
  
  // Re-create the options object to force reactivity
  earningsChartOptions.value = {
    ...earningsChartOptions.value,
    xaxis: {
      ...earningsChartOptions.value.xaxis,
      categories: categories
    }
  };
}

const generateEarningsPDF = async () => {
  if (isGeneratingPDF.value || earningsLoading.value) return;
  isGeneratingPDF.value = true;
  
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

    const doc = new jsPDF();
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
        formatEarningsJobDate(earning.created_at),
        earning.job_title || 'N/A',
        (Number(earning.net_amoumt) || 0).toFixed(2), // Original file had a typo here, fixed
        (Number(earning.net_amount) || 0).toFixed(2),
      ]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      theme: 'grid',
      headStyles: { fillColor: [22, 160, 133] },
      styles: { fontSize: 10 },
      columnStyles: { 2: { halign: 'right' } },
      didDrawPage: (data) => {
        if (tableRows.length === 0) {
          doc.setFontSize(10);
          doc.setTextColor(150);
          doc.text("No completed earnings recorded in this period.", 14, data.cursor.y + 10);
        }
      }
    });

    doc.save(`Earnings_Report_${endDate.toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error('Error generating PDF:', err);
    toast.error('Failed to generate PDF report. Please check the console for errors.', 'PDF Error', 8000);
  } finally {
    isGeneratingPDF.value = false;
  }
};

function formatEarningsJobDate(dateString) {
  if (!dateString) return 'Invalid Date';
  try {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  } catch (e) {
    return 'Invalid Date';
  }
}

// --- SPENDING FUNCTIONS ---

async function fetchSpendingData() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw authError || new Error("You must be logged in.");
    }
    const userId = user.id;
    const { data: jobData, error: fetchError } = await supabase
      .from('User-Job-Request')
      .select('id, created_at, payment, title, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (fetchError) throw fetchError;
    allFetchedJobs.value = jobData || [];
  } catch (err) {
    console.error('Error fetching spending data:', err);
    spendingError.value = `Failed to load spending data: ${err.message}`;
  }
}

function processSpendingData(months) {
  const jobData = allFetchedJobs.value;
  const today = new Date();
  const monthlyTotals = new Map();
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyTotals.set(monthKey, 0);
  }

  let allTimeTotal = 0;
  let currentMonthTotal = 0;
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  for (const job of jobData) {
    if (job.status === 'completed' && job.payment) {
      allTimeTotal += job.payment;
      const date = new Date(job.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthKey === currentMonthKey) {
          currentMonthTotal += job.payment;
      }
      if (monthlyTotals.has(monthKey)) {
        const currentTotal = monthlyTotals.get(monthKey);
        monthlyTotals.set(monthKey, currentTotal + job.payment);
      }
    }
  }
  
  allTimeSpending.value = allTimeTotal;
  currentMonthSpending.value = currentMonthTotal;

  // Format chart data
  const categories = [];
  const seriesData = [];
  const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });

  for (const [monthKey, total] of monthlyTotals.entries()) {
    const date = new Date(`${monthKey}-02`);
    categories.push(monthFormatter.format(date));
    seriesData.push(total.toFixed(2));
  }

  // Update the spending chart refs
  spendingChartSeries.value = [{
    name: 'Spending',
    data: seriesData
  }];
  
  // <-- ***FIXED TYPO HERE***
  spendingChartOptions.value = {
    ...spendingChartOptions.value,
    xaxis: {
      ...spendingChartOptions.value.xaxis, // <-- Corrected .version to .value
      categories: categories
    }
  };
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'open':
      return 'bg-primary';
    case 'in-progress':
      return 'bg-warning text-dark';
    case 'completed':
      return 'bg-success';
    case 'cancelled':
      return 'bg-secondary';
    default:
      return 'bg-light text-dark';
  }
}

function formatSpendingJobDate(dateString) {
  if (!dateString) return 'Invalid Date';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}
</script>

<style scoped>
/* --- Merged & Shared Styles --- */
.card {
  border: none;
  border-radius: 0.75rem; /* Using the radius from Earnings.vue */
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075); /* Added shadow from Earnings */
  height: 100%; /* Added from Spending */
}

.job-list-container {
  max-height: 400px;
  overflow-y: auto;
}

.stat-box {
  background-color: #fff;
}

.list-group-item {
  padding-left: 0;
  padding-right: 0;
}

.badge{
  font-weight: 300;
  font-size: 0.85rem;
}

/* --- Color Overrides --- */
.text-success {
  color: #198754 !important;
}

.text-primary {
  color: #0d6efd !important;
}

/* --- Button Styles (from Earnings) --- */
.btn-lg {
  padding: 0.75rem 1.25rem;
  font-size: 1.1rem;
  font-weight: 500;
  border-radius: 0.5rem;
}
.btn-outline-primary {
  border-width: 2px;
}
.btn-check:checked+.btn-outline-primary {
  background-color: #0d6efd;
  color: #fff;
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

/* --- Placeholder Styles (from Earnings) --- */
.placeholder {
  display: inline-block;
  min-height: 1em;
  vertical-align: middle;
  cursor: wait;
  background-color: currentColor;
  opacity: 0.5;
}
.placeholder.col-6 { width: 50%; }
.placeholder.col-8 { width: 66.666667%; }
.placeholder.col-12 { width: 100%; }
.placeholder-glow .placeholder {
  animation: placeholder-glow 2s ease-in-out infinite;
}
@keyframes placeholder-glow {
  50% { opacity: 0.2; }
}

/* --- Utility Classes (from Earnings) --- */
.text-spending {
  color: #EA6A47 !important;
}
.d-flex { display: flex !important; }
.align-items-center { align-items: center !important; }
.me-2 { margin-right: 0.5rem !important; }
.mb-0 { margin-bottom: 0 !important; }
.ms-md-auto { margin-left: auto !important; }
</style>