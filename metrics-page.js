// Metrics Page - Display performance metrics from accepted payments
function loadMetricsPage() {
    const metricsContainer = document.getElementById('metrics-cards');
    if (!metricsContainer) return;

    let acceptedPayments = getAcceptedPayments();
    const allPayments = getPayments();
    const pendingPayments = allPayments.filter(p => p.status === 'pending');
    const rejectedPayments = allPayments.filter(p => p.status === 'rejected');

    // Apply filters
    const dateRange = document.getElementById('dateRangeFilter')?.value || 'all';
    const clientFilter = document.getElementById('clientFilter')?.value?.toLowerCase() || '';

    if (dateRange !== 'all') {
        const daysAgo = parseInt(dateRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        acceptedPayments = acceptedPayments.filter(p => {
            const paymentDate = p.acceptedAt ? new Date(p.acceptedAt) : new Date(p.createdAt);
            return paymentDate >= cutoffDate;
        });
    }

    if (clientFilter) {
        acceptedPayments = acceptedPayments.filter(p => 
            p.clientName.toLowerCase().includes(clientFilter) ||
            p.clientEmail.toLowerCase().includes(clientFilter)
        );
    }

    // Calculate metrics
    const totalRevenue = acceptedPayments.reduce((sum, p) => sum + (p.total || 0), 0);
    const acceptedCount = acceptedPayments.length;
    const averagePayment = acceptedCount > 0 ? totalRevenue / acceptedCount : 0;
    const totalHours = acceptedPayments.reduce((sum, p) => sum + (p.hoursWorked || 0), 0);
    
    // Acceptance rate
    const totalDecided = acceptedCount + rejectedPayments.length;
    const acceptanceRate = totalDecided > 0 
        ? ((acceptedCount / totalDecided) * 100).toFixed(1) + '%'
        : 'N/A';

    // Display cards
    if (acceptedCount === 0 && !clientFilter) {
        metricsContainer.innerHTML = `
            <div class="empty-state-metrics">
                <p>No accepted payments yet. Create a payment request and mark it as accepted to see metrics.</p>
            </div>
        `;
        return;
    }

    metricsContainer.innerHTML = `
        <div class="metric-card">
            <div class="metric-label">Total Accepted Revenue</div>
            <div class="metric-value">$${totalRevenue.toFixed(2)}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Accepted Payments Count</div>
            <div class="metric-value">${acceptedCount}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Average Payment Value</div>
            <div class="metric-value">$${averagePayment.toFixed(2)}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Acceptance Rate</div>
            <div class="metric-value">${acceptanceRate}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Total Hours Paid</div>
            <div class="metric-value">${totalHours.toFixed(2)}</div>
        </div>
    `;

    // Load revenue over time
    loadRevenueOverTime(acceptedPayments);

    // Load top clients
    loadTopClients(acceptedPayments);

    // Load recent accepted payments
    loadRecentPayments(acceptedPayments);
}

function loadRevenueOverTime(payments) {
    const container = document.getElementById('revenue-over-time');
    if (!container) return;

    if (payments.length === 0) {
        container.innerHTML = '<p class="empty-text">No data available</p>';
        return;
    }

    // Group by week
    const weeklyData = {};
    payments.forEach(payment => {
        const date = payment.acceptedAt ? new Date(payment.acceptedAt) : new Date(payment.createdAt);
        const weekKey = getWeekKey(date);
        if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = 0;
        }
        weeklyData[weekKey] += payment.total || 0;
    });

    const sortedWeeks = Object.keys(weeklyData).sort();
    const maxRevenue = Math.max(...Object.values(weeklyData));

    container.innerHTML = `
        <div class="revenue-chart-bars">
            ${sortedWeeks.map(week => {
                const revenue = weeklyData[week];
                const percentage = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
                return `
                    <div class="revenue-bar-item">
                        <div class="revenue-bar-label">${week}</div>
                        <div class="revenue-bar-wrapper">
                            <div class="revenue-bar" style="width: ${percentage}%"></div>
                            <span class="revenue-bar-value">$${revenue.toFixed(2)}</span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function getWeekKey(date) {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    return weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function loadTopClients(payments) {
    const container = document.getElementById('top-clients-table');
    if (!container) return;

    if (payments.length === 0) {
        container.innerHTML = '<p class="empty-text">No data available</p>';
        return;
    }

    // Group by client
    const clientData = {};
    payments.forEach(payment => {
        const key = payment.clientName || payment.clientEmail || 'Unknown';
        if (!clientData[key]) {
            clientData[key] = {
                name: payment.clientName || 'Unknown',
                email: payment.clientEmail || '',
                revenue: 0,
                count: 0
            };
        }
        clientData[key].revenue += payment.total || 0;
        clientData[key].count += 1;
    });

    // Sort by revenue
    const sortedClients = Object.values(clientData)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

    container.innerHTML = `
        <table class="metrics-table">
            <thead>
                <tr>
                    <th>Client Name</th>
                    <th>Accepted Revenue</th>
                    <th>Accepted Count</th>
                </tr>
            </thead>
            <tbody>
                ${sortedClients.map(client => `
                    <tr>
                        <td>${client.name}${client.email ? `<br><small>${client.email}</small>` : ''}</td>
                        <td>$${client.revenue.toFixed(2)}</td>
                        <td>${client.count}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function loadRecentPayments(payments) {
    const container = document.getElementById('recent-payments-table');
    if (!container) return;

    if (payments.length === 0) {
        container.innerHTML = '<p class="empty-text">No data available</p>';
        return;
    }

    // Sort by accepted date (most recent first) and take top 10
    const recent = [...payments]
        .sort((a, b) => {
            const dateA = a.acceptedAt ? new Date(a.acceptedAt) : new Date(a.createdAt);
            const dateB = b.acceptedAt ? new Date(b.acceptedAt) : new Date(b.createdAt);
            return dateB - dateA;
        })
        .slice(0, 10);

    container.innerHTML = `
        <table class="metrics-table">
            <thead>
                <tr>
                    <th>Project Name</th>
                    <th>Client</th>
                    <th>Hours</th>
                    <th>Total</th>
                    <th>Accepted Date</th>
                </tr>
            </thead>
            <tbody>
                ${recent.map(payment => {
                    const acceptedDate = payment.acceptedAt 
                        ? new Date(payment.acceptedAt).toLocaleDateString()
                        : new Date(payment.createdAt).toLocaleDateString();
                    return `
                        <tr>
                            <td>${payment.projectName || 'Untitled'}</td>
                            <td>${payment.clientName}<br><small>${payment.clientEmail}</small></td>
                            <td>${payment.hoursWorked}</td>
                            <td>$${payment.total.toFixed(2)}</td>
                            <td>${acceptedDate}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

// Initialize metrics page and set up filter listeners
let metricsPageInitialized = false;
document.addEventListener('DOMContentLoaded', () => {
    const metricsPage = document.getElementById('metrics-page');
    const dateFilter = document.getElementById('dateRangeFilter');
    const clientFilter = document.getElementById('clientFilter');

    // Watch for navigation to metrics page
    const observer = new MutationObserver((mutations) => {
        if (metricsPage.classList.contains('active') && !metricsPageInitialized) {
            loadMetricsPage();
            metricsPageInitialized = true;
        } else if (metricsPage.classList.contains('active')) {
            loadMetricsPage();
        }
    });
    
    observer.observe(metricsPage, { attributes: true, attributeFilter: ['class'] });

    // Set up filter listeners
    if (dateFilter) {
        dateFilter.addEventListener('change', () => {
            if (metricsPage.classList.contains('active')) {
                loadMetricsPage();
            }
        });
    }

    if (clientFilter) {
        clientFilter.addEventListener('input', () => {
            if (metricsPage.classList.contains('active')) {
                loadMetricsPage();
            }
        });
    }
});
