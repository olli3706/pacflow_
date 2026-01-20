// Chart utility functions for revenue visualization

// Get ISO week start (Monday) for a given date
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
}

// Get revenue series grouped by granularity and range
function getRevenueSeries(payments, granularity, range) {
    if (!payments || payments.length === 0) {
        return [];
    }

    // Filter payments by date range
    let startDate, endDate = new Date();
    
    if (range === 'all') {
        // Find earliest payment date
        const dates = payments.map(p => {
            const dateStr = p.acceptedAt || p.createdAt;
            return dateStr ? new Date(dateStr) : null;
        }).filter(d => d !== null);
        startDate = dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
    } else {
        const now = new Date();
        if (range === '24h') {
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        } else if (range === '7d') {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (range === '12w') {
            startDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
        } else if (range === '12m') {
            startDate = new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000);
        } else {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Default to 7 days
        }
    }

    // Filter payments in range
    const filteredPayments = payments.filter(p => {
        const paymentDate = p.acceptedAt ? new Date(p.acceptedAt) : new Date(p.createdAt);
        return paymentDate >= startDate && paymentDate <= endDate;
    });

    // Generate buckets based on granularity
    const buckets = {};
    const bucketLabels = {};

    if (granularity === 'hours') {
        // Generate hourly buckets
        const current = new Date(startDate);
        current.setMinutes(0, 0, 0); // Round to start of hour
        while (current <= endDate) {
            const key = current.toISOString().slice(0, 13); // YYYY-MM-DDTHH
            const label = current.toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit',
                hour12: false 
            });
            buckets[key] = 0;
            bucketLabels[key] = label;
            current.setHours(current.getHours() + 1);
        }
    } else if (granularity === 'days') {
        // Generate daily buckets
        const current = new Date(startDate);
        current.setHours(0, 0, 0, 0);
        while (current <= endDate) {
            const key = current.toISOString().slice(0, 10); // YYYY-MM-DD
            const label = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            buckets[key] = 0;
            bucketLabels[key] = label;
            current.setDate(current.getDate() + 1);
        }
    } else if (granularity === 'weeks') {
        // Generate weekly buckets (ISO week start - Monday)
        let current = getWeekStart(new Date(startDate));
        current.setHours(0, 0, 0, 0);
        const endWeek = getWeekStart(endDate);
        endWeek.setHours(0, 0, 0, 0);
        
        while (current <= endWeek) {
            const key = current.toISOString().slice(0, 10);
            const label = `Week of ${current.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            buckets[key] = 0;
            bucketLabels[key] = label;
            current.setDate(current.getDate() + 7);
        }
    } else if (granularity === 'months') {
        // Generate monthly buckets
        const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        while (current <= endDate) {
            const key = current.toISOString().slice(0, 7); // YYYY-MM
            const label = current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            buckets[key] = 0;
            bucketLabels[key] = label;
            current.setMonth(current.getMonth() + 1);
        }
    }

    // Group payments into buckets
    filteredPayments.forEach(payment => {
        const paymentDate = payment.acceptedAt ? new Date(payment.acceptedAt) : new Date(payment.createdAt);
        let key;

        if (granularity === 'hours') {
            const hourDate = new Date(paymentDate);
            hourDate.setMinutes(0, 0, 0);
            key = hourDate.toISOString().slice(0, 13);
        } else if (granularity === 'days') {
            const dayDate = new Date(paymentDate);
            dayDate.setHours(0, 0, 0, 0);
            key = dayDate.toISOString().slice(0, 10);
        } else if (granularity === 'weeks') {
            const weekStart = getWeekStart(paymentDate);
            weekStart.setHours(0, 0, 0, 0);
            key = weekStart.toISOString().slice(0, 10);
        } else if (granularity === 'months') {
            key = paymentDate.toISOString().slice(0, 7);
        }

        if (key && buckets.hasOwnProperty(key)) {
            buckets[key] += payment.total || 0;
        }
    });

    // Convert to array format
    const series = Object.keys(buckets)
        .sort()
        .map(key => ({
            label: bucketLabels[key],
            startISO: key,
            endISO: key,
            revenue: buckets[key]
        }));

    return series;
}
