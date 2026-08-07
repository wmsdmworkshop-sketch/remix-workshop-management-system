import { pool as db } from "../../db/index";
import { DashboardRole } from "./analytics-types";

export class DashboardEngine {
  public async getDashboardConfigForRole(role: DashboardRole): Promise<any> {
    const [dashboards] = await db.execute("SELECT dashboard_id, dashboard_name FROM tbl_dashboard WHERE user_role = ? AND status = 'ACTIVE'", [role]) as any[];
    if (dashboards.length === 0) return null;

    const dashboard = dashboards[0];
    const [widgets] = await db.execute("SELECT widget_id, widget_type, chart_type, configuration_json FROM tbl_dashboard_widget WHERE dashboard_id = ? ORDER BY sequence ASC", [dashboard.dashboard_id]) as any[];

    return {
      dashboardId: dashboard.dashboard_id,
      dashboardName: dashboard.dashboard_name,
      widgets: widgets.map((w: any) => ({
        widgetId: w.widget_id,
        widgetType: w.widget_type,
        chartType: w.chart_type,
        config: JSON.parse(w.configuration_json || "{}")
      }))
    };
  }
}
