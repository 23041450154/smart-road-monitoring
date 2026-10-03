export type TrafficStatus = "LANCAR" | "SEDANG" | "PADAT" | "MACET";
export type Trend = "MENURUN" | "STABIL" | "MENINGKAT";

export interface Camera {
  id: number;
  name: string;
  road_name: string;
  latitude: number;
  longitude: number;
  stream_type: string;
  is_active: boolean;
  is_demo: boolean;
  low_threshold: number;
  medium_threshold: number;
  high_threshold: number;
  counting_line: number[][] | null;
  created_at: string;
}

export interface TrafficCurrent {
  camera_id: number;
  camera_name: string;
  road_name: string;
  timestamp: string | null;
  motorcycle_count: number;
  car_count: number;
  bus_count: number;
  truck_count: number;
  total_count: number;
  vehicles_per_minute: number;
  rolling_5_minute: number;
  rolling_15_minute: number;
  congestion_score: number;
  traffic_status: TrafficStatus;
  trend: Trend;
  is_demo: boolean;
}

export interface Summary {
  cctv_online: number;
  vehicles_last_5_minutes: number;
  congested_roads: number;
  detected_potholes: number;
  generated_at: string;
  demo_mode: boolean;
}

export interface Snapshot {
  id: number;
  camera_id: number;
  timestamp: string;
  motorcycle_count: number;
  car_count: number;
  bus_count: number;
  truck_count: number;
  total_count: number;
  congestion_score: number;
  traffic_status: TrafficStatus;
}

export interface HourlyProfileItem {
  hour: number;
  hour_label: string;
  avg_total_count: number;
  avg_vehicles_per_minute: number;
  avg_congestion_score: number;
  traffic_status: TrafficStatus;
  sample_count: number;
  is_peak_hour: boolean;
}

export interface HourlyProfileResponse {
  camera_id: number;
  camera_name: string;
  road_name: string;
  profile: HourlyProfileItem[];
  morning_peak: string | null;
  evening_peak: string | null;
  total_samples: number;
}

export interface TrafficPredictionResponse {
  camera_id: number;
  camera_name: string;
  road_name: string;
  queried_hour: number;
  queried_time_label: string;
  predicted_status: TrafficStatus;
  congestion_score: number;
  avg_vehicles_per_minute: number;
  confidence_level: string;
  is_peak_hour: boolean;
  sample_count: number;
  recommendation: string;
}

export interface AreaHourlyInsight {
  camera_id: number;
  camera_name: string;
  road_name: string;
  morning_peak: string | null;
  evening_peak: string | null;
  peak_score: number;
  hourly_status: TrafficStatus[];
  hourly_scores: number[];
  hourly_vpm: number[];
}

export interface PeakAreaHighlight {
  camera_id: number;
  camera_name: string;
  road_name: string;
  peak_window: string;
  traffic_status: TrafficStatus;
  congestion_score: number;
  avg_vehicles_per_minute: number;
}

export interface CityHourlyInsightsResponse {
  current_hour: number;
  current_time_label: string;
  areas: AreaHourlyInsight[];
  city_morning_peak: string;
  city_evening_peak: string;
  morning_peak_areas: PeakAreaHighlight[];
  evening_peak_areas: PeakAreaHighlight[];
  quietest_hours: string[];
}

export interface Pothole {
  id: number;
  latitude: number;
  longitude: number;
  road_name: string | null;
  confidence: number;
  severity: "unknown" | "low" | "medium" | "high";
  image_path: string | null;
  detected_at: string;
  status: "active" | "repaired" | "unverified";
}


export interface Route {
  id: number;
  user_id: number;
  name: string;
  route_type: "commute_to_work" | "commute_home" | "custom";
  start_latitude: number;
  start_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  path: [number, number][];
  notification_time: string | null;
  is_active: boolean;
  created_at: string;
}

export interface RouteTraffic {
  route: Route;
  cameras: TrafficCurrent[];
}

export interface Briefing {
  route_id: number;
  route_name: string;
  route_type: Route["route_type"];
  overall_status: TrafficStatus;
  traffic: TrafficCurrent[];
  potholes: Pothole[];
  issues: Array<{ type: string; road: string | null; status?: string; trend?: string; severity?: string }>;
  message: string;
  generated_at: string;
}
