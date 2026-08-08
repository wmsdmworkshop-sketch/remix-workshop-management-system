const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Ensure jobCardService instance exists
if (!code.includes('const jobCardService = new JobCardService();')) {
    code = code.replace(
        'import { JobCardService } from "./src/core/application-services.ts";',
        'import { JobCardService } from "./src/core/application-services.ts";\nconst jobCardService = new JobCardService();'
    );
}

fs.writeFileSync('server.ts', code);
console.log("server.ts patched successfully with JobCardService instance");
