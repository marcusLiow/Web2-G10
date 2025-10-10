<template>
  <div class="container-fluid p-4 dashboard-bg">
    <div class="mb-4">
      <h2 class="fw-bold">Analytics Dashboard</h2>
      <p class="text-muted">Track your earnings, spending, and service trends</p>
    </div>

    <div class="row mb-4">
      <div class="col-lg-3 col-md-6 mb-3">
        <div class="card shadow-sm p-3 border-0">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h5 class="card-title text-muted fw-normal">Total Earnings</h5>
              <h3 class="card-text fw-bold">S$2,860</h3>
            </div>
            <div class="icon-box p-2 d-flex align-items-center justify-content-center" style="background-color: #e6f7e8;">
              <span class="fs-4">$</span>
            </div>
          </div>
          <p class="card-trend mt-2 mb-0 text-success">
            <span class="me-1">⬆️</span>+18% from last month
          </p>
        </div>
      </div>
      <div class="col-lg-3 col-md-6 mb-3">
        <div class="card shadow-sm p-3 border-0">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h5 class="card-title text-muted fw-normal">Total Spending</h5>
              <h3 class="card-text fw-bold">S$1,510</h3>
            </div>
            <div class="icon-box p-2 d-flex align-items-center justify-content-center" style="background-color: #f2e6e6;">
              <span class="fs-4">$</span>
            </div>
          </div>
          <p class="card-trend mt-2 mb-0 text-danger">
            <span class="me-1">⬇️</span>-12% from last month
          </p>
        </div>
      </div>
      <div class="col-lg-3 col-md-6 mb-3">
        <div class="card shadow-sm p-3 border-0">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h5 class="card-title text-muted fw-normal">Jobs Completed</h5>
              <h3 class="card-text fw-bold">28</h3>
            </div>
            <div class="icon-box p-2 d-flex align-items-center justify-content-center" style="background-color: #fcf2e6;">
              <span class="fs-4">💼</span>
            </div>
          </div>
          <p class="card-trend mt-2 mb-0 text-secondary">
            8 active jobs
          </p>
        </div>
      </div>
      <div class="col-lg-3 col-md-6 mb-3">
        <div class="card shadow-sm p-3 border-0">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h5 class="card-title text-muted fw-normal">Average Rating</h5>
              <h3 class="card-text fw-bold">4.8</h3>
            </div>
            <div class="icon-box p-2 d-flex align-items-center justify-content-center" style="background-color: #fffbe6;">
              <span class="fs-4">⭐</span>
            </div>
          </div>
          <p class="card-trend mt-2 mb-0 text-secondary">
            Based on 24 reviews
          </p>
        </div>
      </div>
      </div>


    <div class="row">
      <div class="col-lg-6 mb-4">
        <div class="card shadow-sm p-4 chart-box">
          <h5 class="card-title">Earnings vs Spending</h5>
          <Line :data="earningsVsSpendingData" :options="lineChartOptions" />
          <div class="d-flex justify-content-center mt-3">
              <span class="me-3 legend-dot text-success">⚫ Earnings (S$)</span>
              <span class="legend-dot text-danger">⚫ Spending (S$)</span>
          </div>
        </div>
      </div>
      <div class="col-lg-6 mb-4">
        <div class="card shadow-sm p-4 chart-box">
          <h5 class="card-title">Service Categories</h5>
          <div class="chart-container">
            <Doughnut :data="serviceCategoriesData" :options="doughnutChartOptions" />
            </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// -----------------------------------------------------------
// 1. CHART.JS & VUE-CHARTJS SETUP
// -----------------------------------------------------------
import { Line, Doughnut } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  ArcElement
} from 'chart.js';

// Register necessary Chart.js elements
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  ArcElement
);

// -----------------------------------------------------------
// 2. DASHBOARD MAIN COMPONENT
// -----------------------------------------------------------
export default {
  name: 'AnalyticsDashboard',
  components: {
    Line,
    Doughnut
  },
  data() {
    return {
      // --- Line Chart Data (Earnings vs Spending) ---
      earningsVsSpendingData: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          // Earnings Dataset (Green Line)
          {
            label: 'Earnings (S$)',
            data: [350, 450, 400, 500, 600, 580],
            borderColor: '#50c878', // Emerald Green for Earnings
            backgroundColor: 'rgba(80, 200, 120, 0.2)',
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: '#fff',
            borderWidth: 3,
            fill: false,
          },
          // Spending Dataset (Orange Line)
          {
            label: 'Spending (S$)',
            data: [200, 250, 200, 300, 320, 290],
            borderColor: '#ff9800', // Orange for Spending
            backgroundColor: 'rgba(255, 152, 0, 0.2)',
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: '#fff',
            borderWidth: 3,
            fill: false,
          }
        ]
      },
      lineChartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            max: 800,
            ticks: {
                stepSize: 200,
                callback: function(value) { return value; } // Show labels
            },
            grid: {
                drawBorder: false,
            }
          },
          x: {
              grid: {
                  display: false
              }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        elements: {
            line: {
                borderJoinStyle: 'round'
            }
        }
      },

      // --- Doughnut Chart Data (Service Categories) ---
      serviceCategoriesData: {
        labels: ['Home & Repair 35%', 'Cleaning 25%', 'Photography 20%', 'Tutoring 12%', 'Other 8%'],
        datasets: [
          {
            backgroundColor: [
              '#e85b39', // Home & Repair (Orange/Red)
              '#50a7c9', // Cleaning (Light Blue)
              '#a26cff', // Photography (Purple)
              '#41d999', // Tutoring (Mint Green)
              '#6c757d'  // Other (Gray)
            ],
            data: [35, 25, 20, 12, 8],
            hoverOffset: 10,
            borderWidth: 0,
          }
        ]
      },
      doughnutChartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%', // Make it a doughnut
        plugins: {
          legend: {
            display: true,
            position: 'right', // Place legend to the right
            labels: {
                usePointStyle: true,
                padding: 20,
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed;
                return `${label.replace(/ \d+%$/, '')}: ${value}%`;
              }
            }
          }
        }
      }
    }
  }
}
</script>

<style scoped>
/* -----------------------------------------------------------
// Global/Layout Styles
// ----------------------------------------------------------- */
.dashboard-bg {
    background-color: #f7f9fc;
    min-height: 100vh;
}

/* -----------------------------------------------------------
// Stat Card Styles (Applied via the StatCard template)
// ----------------------------------------------------------- */
.card {
    border-radius: 12px;
    /* Custom style to override Bootstrap's card border if needed */
}
.icon-box {
    border-radius: 8px;
    width: 45px;
    height: 45px;
    /* Custom colors are applied via inline style based on props */
}
.card-trend {
    font-size: 0.9rem;
}
.text-secondary {
    color: #6c757d !important; /* Use Bootstrap's secondary color for neutral trends */
}

/* -----------------------------------------------------------
// Chart Styles
// ----------------------------------------------------------- */
/* -----------------------------------------------------------
// Chart Styles
// ----------------------------------------------------------- */
.chart-box {
    /* Set a fixed height for the entire card wrapper */
    height: 400px; 
    border-radius: 12px;
    
    /* Make the card a flex container to manage vertical space */
    display: flex; 
    flex-direction: column;
}

/* This targets the <Line> component's container (the canvas wrapper) */
.chart-box > div {
    /* Ensure the chart area takes the remaining available height */
    flex-grow: 1;
    /* Set a minimum height to prevent collapse, though flex-grow should handle it */
    min-height: 0; 
    padding-bottom: 10px; /* Add some spacing above the custom legend */
}

/* The chart-container is used for the Doughnut chart and already works well */
.chart-container {
    /* Set a specific height for the Doughnut chart's drawing area */
    height: 300px; 
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    /* Since this is inside a flex column (.chart-box), it also needs flex properties */
    flex-grow: 1; 
    min-height: 0;
}
</style>