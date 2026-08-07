import http from "http";

async function makeRequest(url: string): Promise<{ status: number; duration: number }> {
  return new Promise((resolve) => {
    const start = Date.now();
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        resolve({
          status: res.statusCode || 500,
          duration: Date.now() - start
        });
      });
    }).on("error", () => {
      resolve({ status: 500, duration: Date.now() - start });
    });
  });
}

async function main() {
  console.log("=============================================================================");
  console.log("DWIP ENTERPRISE STRESS TEST ENGINE");
  console.log("SIMULATING 1,000 CONCURRENT CLIENT REQUESTS ON /ready");
  console.log("=============================================================================");

  const url = "http://localhost:3001/ready";
  const totalRequests = 1000;
  const batchSize = 100;
  const promises: Promise<any>[] = [];

  const startAll = Date.now();
  let successCount = 0;
  let errorCount = 0;
  let totalDuration = 0;

  for (let i = 0; i < totalRequests; i++) {
    promises.push(
      makeRequest(url).then((res) => {
        if (res.status === 200) {
          successCount++;
        } else {
          errorCount++;
        }
        totalDuration += res.duration;
      })
    );
  }

  await Promise.all(promises);

  const totalTimeMs = Date.now() - startAll;
  const averageTat = totalDuration / totalRequests;
  const throughput = (totalRequests / (totalTimeMs / 1000)).toFixed(1);

  console.log("\n=== STRESS TEST RESULTS ===");
  console.log(`Total Requests:      ${totalRequests}`);
  console.log(`Successful:          ${successCount}`);
  console.log(`Failed/Error:        ${errorCount}`);
  console.log(`Total Execution Time: ${totalTimeMs} ms`);
  console.log(`Average Latency (TAT):${averageTat.toFixed(1)} ms`);
  console.log(`Throughput:          ${throughput} req/sec`);
  console.log("=============================================================================");
}

main();
