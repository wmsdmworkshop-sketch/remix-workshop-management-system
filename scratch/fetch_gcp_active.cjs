const http = require('https');

function fetchGcp() {
    http.get('https://wms-workshop-app-772298398554.asia-south1.run.app/api/job-cards', (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                const jobs = json.jobCards || [];
                console.log('Active (non-closed) job cards from GCP Cloud Run:', jobs.length);
                
                const statuses = {};
                jobs.forEach(j => {
                    statuses[j.status] = (statuses[j.status] || 0) + 1;
                });
                console.log('Status breakdown:', statuses);
            } catch (e) {
                console.error('Failed to parse JSON:', e.message);
            }
        });
    }).on('error', (err) => {
        console.error('Fetch error:', err.message);
    });
}

fetchGcp();
