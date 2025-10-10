<script>
import Chart from 'chart.js/auto';
    export default { 
        data() {
            return {
                msg : "Hello World"
            }
        },
        mounted(){    
            const ctx = document.getElementById('myChart');
            new Chart(ctx, {
                type: 'bar',
                data: {
                labels: ['Jun', 'Jul', 'Aug', 'Sept', 'October'],
                datasets: [{
                    label: '$ Spent in app',
                    data: [120, 190, 30, 50, 20],
                    borderWidth: 1
                }]
                },
                options: {
                scales: {
                    y: {
                    beginAtZero: true
                    }
                }
                }
            });
        }
    }
</script>


<template>
    <canvas id="myChart"></canvas>
</template>

<style scoped>
.greeting {
    color: red;
}
</style>
