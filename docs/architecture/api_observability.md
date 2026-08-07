# API Explorer & Observability

Detailed description of the API Explorer console.

## Monitored Metrics
The API Explorer displays the following live parameters:
- **API Version**: Target route context (`/v1` or `/v2`).
- **Authentication**: JWT-enforced vs. public whitelisted status.
- **Success/Failure Rate**: Calculated error percentages.
- **Average Latency**: Round-trip response time.
- **Consumer**: Identified requesting system or role.
- **Last Called**: Timestamp of the latest request.
- **Rate Limit**: Max requests configuration.

## Live Testing Playground
Execute custom JSON requests directly from the API tab to test response payload structures and latency.
