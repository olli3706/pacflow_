// Metrics Page - Display performance metrics from accepted payments
async function loadMetricsPage() {
    // #region agent log
    console.log('[DEBUG] loadMetricsPage called, getPayments type:', typeof getPayments);
    // #endregion
    const metricsContainer = document.getElementById('metrics-cards');
    if (!metricsContainer) return;

    let acceptedPayments = await getAcceptedPayments();
    // #region agent log
    console.log('[DEBUG] acceptedPayments:', {type: typeof acceptedPayments, isArray: Array.isArray(acceptedPayments), length: acceptedPayments?.length});
    // #endregion
    const allPayments = await getPayments();
    // #region agent log
    console.log('[DEBUG] allPayments:', {type: typeof allPayments, isArray: Array.isArray(allPayments), length: allPayments?.length, value: allPayments});
    // #endregion
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

    // Load revenue over time (with filters)
    loadRevenueOverTime(acceptedPayments);

    // Load top clients
    loadTopClients(acceptedPayments);

    // Load recent accepted payments
    loadRecentPayments(acceptedPayments);
}

function loadRevenueOverTime(payments) {
    const container = document.getElementById('revenue-over-time');
    const summaryContainer = document.getElementById('revenue-summary');
    if (!container) return;

    // Get selected granularity and range
    const granularity = document.getElementById('granularitySelect')?.value || 'weeks';
    const range = document.getElementById('timeRangeSelect')?.value || '12w';

    // Get revenue series
    const series = getRevenueSeries(payments, granularity, range);

    // Calculate summary stats for the selected range
    const totalRevenue = series.reduce((sum, item) => sum + item.revenue, 0);
    const paymentCount = payments.filter(p => {
        const paymentDate = p.acceptedAt ? new Date(p.acceptedAt) : new Date(p.createdAt);
        // Check if payment is in the selected range
        if (range === 'all') return true;
        const now = new Date();
        let startDate;
        if (range === '24h') {
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        } else if (range === '7d') {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (range === '12w') {
            startDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
        } else if (range === '12m') {
            startDate = new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000);
        } else {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
        return paymentDate >= startDate && paymentDate <= now;
    }).length;
    const averagePayment = paymentCount > 0 ? totalRevenue / paymentCount : 0;

    // Update summary
    if (summaryContainer) {
        summaryContainer.innerHTML = `
            <div class="revenue-summary-item">
                <span class="summary-label">Total Revenue:</span>
                <span class="summary-value">$${totalRevenue.toFixed(2)}</span>
            </div>
            <div class="revenue-summary-item">
                <span class="summary-label">Payments:</span>
                <span class="summary-value">${paymentCount}</span>
            </div>
            <div class="revenue-summary-item">
                <span class="summary-label">Average:</span>
                <span class="summary-value">$${averagePayment.toFixed(2)}</span>
            </div>
        `;
    }

    // Render chart
    if (series.length === 0) {
        container.innerHTML = '<p class="empty-text">No accepted revenue in this period</p>';
        return;
    }

    // Create SVG chart
    const maxRevenue = Math.max(...series.map(s => s.revenue), 1);
    const chartWidth = 800;
    const chartHeight = 400;
    const padding = { top: 20, right: 40, bottom: 60, left: 80 };
    const plotWidth = chartWidth - padding.left - padding.right;
    const plotHeight = chartHeight - padding.top - padding.bottom;

    // Generate SVG
    let svg = `
        <svg width="${chartWidth}" height="${chartHeight}" class="revenue-svg-chart">
            <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#667eea;stop-opacity:0.8" />
                    <stop offset="100%" style="stop-color:#764ba2;stop-opacity:0.3" />
                </linearGradient>
            </defs>
            
            <!-- Y-axis labels -->
            ${Array.from({ length: 6 }, (_, i) => {
                const value = (maxRevenue / 5) * (5 - i);
                const y = padding.top + (plotHeight / 5) * i;
                return `<text x="${padding.left - 10}" y="${y + 5}" text-anchor="end" font-size="12" fill="#666">$${(value / 1000).toFixed(1)}k</text>`;
            }).join('')}
            
            <!-- Grid lines -->
            ${Array.from({ length: 6 }, (_, i) => {
                const y = padding.top + (plotHeight / 5) * i;
                return `<line x1="${padding.left}" y1="${y}" x2="${padding.left + plotWidth}" y2="${y}" stroke="#e0e0e0" stroke-width="1" />`;
            }).join('')}
            
            <!-- Data points and line -->
            <g class="chart-data">
                ${series.map((item, index) => {
                    const x = padding.left + (plotWidth / (series.length - 1 || 1)) * index;
                    const y = padding.top + plotHeight - (item.revenue / maxRevenue) * plotHeight;
                    return `<circle cx="${x}" cy="${y}" r="4" fill="#667eea" class="data-point" data-tooltip="${item.label}: $${item.revenue.toFixed(2)}" />`;
                }).join('')}
                
                <!-- Line connecting points -->
                <polyline 
                    points="${series.map((item, index) => {
                        const x = padding.left + (plotWidth / (series.length - 1 || 1)) * index;
                        const y = padding.top + plotHeight - (item.revenue / maxRevenue) * plotHeight;
                        return `${x},${y}`;
                    }).join(' ')}"
                    fill="none" 
                    stroke="#667eea" 
                    stroke-width="2"
                />
            </g>
            
            <!-- X-axis labels -->
            ${series.map((item, index) => {
                const x = padding.left + (plotWidth / (series.length - 1 || 1)) * index;
                const label = granularity === 'hours' 
                    ? new Date(item.startISO + ':00:00').toLocaleTimeString('en-US', { hour: '2-digit', hour12: false })
                    : granularity === 'days'
                    ? new Date(item.startISO).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : granularity === 'weeks'
                    ? `W${index + 1}`
                    : new Date(item.startISO + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                return `<text x="${x}" y="${chartHeight - padding.bottom + 20}" text-anchor="middle" font-size="11" fill="#666" transform="rotate(-45 ${x} ${chartHeight - padding.bottom + 20})">${label}</text>`;
            }).join('')}
        </svg>
        
        <div id="chart-tooltip" class="chart-tooltip" style="display: none;"></div>
    `;

    container.innerHTML = svg;

    // Add tooltip functionality
    const tooltip = document.getElementById('chart-tooltip');
    const dataPoints = container.querySelectorAll('.data-point');
    
    dataPoints.forEach(point => {
        point.addEventListener('mouseenter', (e) => {
            const tooltipText = e.target.getAttribute('data-tooltip');
            if (tooltip && tooltipText) {
                const rect = e.target.getBoundingClientRect();
                tooltip.textContent = tooltipText;
                tooltip.style.display = 'block';
                tooltip.style.left = (rect.left + rect.width / 2) + 'px';
                tooltip.style.top = (rect.top - 30) + 'px';
            }
        });
        
        point.addEventListener('mouseleave', () => {
            if (tooltip) {
                tooltip.style.display = 'none';
            }
        });
    });
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

    // Set up granularity and time range selectors
    const granularitySelect = document.getElementById('granularitySelect');
    const timeRangeSelect = document.getElementById('timeRangeSelect');

    // Update time range options based on granularity
    if (granularitySelect && timeRangeSelect) {
        granularitySelect.addEventListener('change', () => {
            const granularity = granularitySelect.value;
            const currentRange = timeRangeSelect.value;
            
            // Update default range based on granularity
            if (granularity === 'hours' && currentRange !== '24h' && currentRange !== 'all') {
                timeRangeSelect.value = '24h';
            } else if (granularity === 'days' && currentRange !== '7d' && currentRange !== 'all') {
                timeRangeSelect.value = '7d';
            } else if (granularity === 'weeks' && currentRange !== '12w' && currentRange !== 'all') {
                timeRangeSelect.value = '12w';
            } else if (granularity === 'months' && currentRange !== '12m' && currentRange !== 'all') {
                timeRangeSelect.value = '12m';
            }
            
            if (metricsPage.classList.contains('active')) {
                loadMetricsPage();
            }
        });

        timeRangeSelect.addEventListener('change', () => {
            if (metricsPage.classList.contains('active')) {
                loadMetricsPage();
            }
        });
    }
});
