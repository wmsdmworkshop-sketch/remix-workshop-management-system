# DWIP Administrator Manual
**System Operations & Platform Administration**

## 1. Platform Maintenance
* **Audit Logs Management**: Periodically export old events to persistent storage systems.
* **Model Versions Upgrade**: Update target accuracy scores and metadata in the `enterprise-ai` model registry manually or via REST endpoints.
* **Bays Configuration**: Use `/api/bays` routes to mark bays as Maintenance or Available.

## 2. Secrets Rotation
Rotate the `JWT_SECRET` key yearly. Ensure all active node containers are redeployed concurrently after updating environment secrets.
