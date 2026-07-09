const http = require('https');

function testHistoryApi(query) {
    const url = `https://wms-workshop-app-772298398554.asia-south1.run.app/api/vehicle/history?query=${encodeURIComponent(query)}`;
    console.log('Fetching:', url);
    
    http.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                console.log('\n=== API Response Status ===');
                console.log(`Job Cards count: ${json.jobCards ? json.jobCards.length : 0}`);
                console.log(`Revenues count: ${json.revenues ? json.revenues.length : 0}`);
                console.log(`Last service date: ${json.last_service_date}`);
                console.log(`Odometer reading: ${json.odometer_reading}`);
                
                if (json.jobCards && json.jobCards.length > 0) {
                    console.log('\n=== First 2 Job Cards ===');
                    json.jobCards.slice(0, 2).forEach((jc, i) => {
                        console.log(`  [${i+1}] JC No: ${jc.job_card_no}, Status: ${jc.status}, Date: ${jc.created_at}`);
                        console.log(`      Model: ${jc.vehicle_model}, Reg: ${jc.vrn}`);
                        console.log(`      Description: ${jc.job_description}`);
                    });
                }
            } catch (e) {
                console.error('Failed to parse JSON response:', e.message);
            }
        });
    }).on('error', (err) => {
        console.error('HTTP Request failed:', err.message);
    });
}

testHistoryApi('05659');
