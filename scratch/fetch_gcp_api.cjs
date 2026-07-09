const http = require('https');

function fetchGcp() {
    http.get('https://wms-workshop-app-772298398554.asia-south1.run.app/api/job-cards?include_closed=true', (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                const jobs = json.jobCards || [];
                console.log('Successfully fetched from Cloud Run API!');
                console.log('Count of jobCards returned:', jobs.length);
                if (jobs.length > 0) {
                    console.log('First 3 job card numbers:', jobs.slice(0, 3).map(j => j.job_card_no));
                    console.log('Last 3 job card numbers:', jobs.slice(-3).map(j => j.job_card_no));
                }
            } catch (e) {
                console.error('Failed to parse JSON:', e.message);
                console.log('Raw output:', data.substring(0, 300));
            }
        });
    }).on('error', (err) => {
        console.error('Fetch error:', err.message);
    });
}

fetchGcp();
