const http = require('https');

function fetchRailway() {
    http.get('https://wms-workshop-app-production.up.railway.app/api/job-cards?include_closed=true', (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                const jobs = json.jobCards || [];
                console.log('Successfully fetched with include_closed=true!');
                console.log('Count of jobCards returned:', jobs.length);
                if (jobs.length > 0) {
                    console.log('First 5 job card numbers:', jobs.slice(0, 5).map(j => j.job_card_no));
                    console.log('Last 5 job card numbers:', jobs.slice(-5).map(j => j.job_card_no));
                    console.log('Max job_id in API response:', Math.max(...jobs.map(j => j.job_id)));
                }
            } catch (e) {
                console.error('Failed to parse JSON:', e.message);
            }
        });
    }).on('error', (err) => {
        console.error('Fetch error:', err.message);
    });
}

fetchRailway();
